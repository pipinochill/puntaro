"""Result card: after a round, one tap makes an image of the result to share or save.
Fonts are served locally when the folder .tmpfont exists (screenshots only)."""
import asyncio, base64, os, sys
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
F = '/.tmpfont/'
CSS = f"""@font-face{{font-family:'Jersey 15';src:url({F}jersey.ttf)}}@font-face{{font-family:'Pixelify Sans';src:url({F}pixelify.ttf);font-weight:400 700}}
@font-face{{font-family:'Silkscreen';src:url({F}silk.ttf)}}@font-face{{font-family:'Silkscreen';src:url({F}silkb.ttf);font-weight:700}}
@font-face{{font-family:'Bitter';src:url({F}bitter.ttf);font-weight:100 900}}@font-face{{font-family:'Figtree';src:url({F}figtree.ttf);font-weight:300 900}}"""
# strokes over par per hole for each player (You, Nic, Mitch, Greg): a mix of birdies, pars, bogeys and the odd blow-up
PLAN = {'You': [0,1,-1,0,1,0,0,2,0, 1,0,-1,0,1,0,0,1,0], 'Nic': [0,0,0,-1,0,1,0,0,-2, 0,1,0,0,0,-1,1,0,0],
        'Mitch': [1,2,0,1,0,3,1,0,1, 0,0,1,2,0,1,0,0,1], 'Greg': [0,0,1,0,4,0,0,1,0, 0,-1,0,0,3,0,0,1,0]}
cloud = fc.Cloud(rules)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); cloud.seed('u_s', fc.profile('Pierre'))
        A = await cloud.phone(b, 'u_s', device_scale_factor=2)
        if os.path.isdir('/home/claude/puntaro/.tmpfont'):
            await A.add_init_script(f"addEventListener('DOMContentLoaded',()=>{{const s=document.createElement('style');s.textContent={CSS!r};document.head.appendChild(s)}})")
        await fc.open_app(A, URL)
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
        await A.evaluate('scrollTo(0, document.body.scrollHeight)')
        await A.get_by_role('button', name='Tee off').click(); await A.wait_for_timeout(500)
        for h in range(18):
            for _ in range(3):
                if await A.locator('.moment').count(): await A.locator('.moment').click(); await A.wait_for_timeout(150)
            for n, plan in PLAN.items():
                d = plan[h]
                await A.get_by_role('button', name=f'{n} plus one').click()  # first tap sets par
                for _ in range(abs(d)): await A.get_by_role('button', name=f'{n} {"plus" if d > 0 else "minus"} one').click()
            if await A.get_by_role('button', name='Nobody hit the green').count():  # par 3: Nic sticks it close on the 3rd, nobody otherwise
                await A.get_by_role('button', name='Nearest the pin: Nic' if h == 2 else 'Nobody hit the green').first.click(); await A.wait_for_timeout(150)
            if h == 17: break
            await A.get_by_role('button', name='Next hole').last.click(); await A.wait_for_timeout(200)
            for _ in range(8):
                if await A.locator('.moment').count(): await A.locator('.moment').click(); await A.wait_for_timeout(200); continue
                if await A.get_by_role('button', name='Draw the cards').count():
                    await A.get_by_role('button', name='Draw the cards').click(); await A.wait_for_timeout(300)
                    if await A.get_by_role('button', name='Flip all').count(): await A.get_by_role('button', name='Flip all').click(); await A.wait_for_timeout(300)
                    if await A.get_by_role('button', name="Let's play").count(): await A.get_by_role('button', name="Let's play").click(); await A.wait_for_timeout(200)
                    continue
                if await A.get_by_role('dialog', name='Nearest the pin').count(): await A.get_by_role('dialog').get_by_role('button', name='Nobody hit the green').click(); await A.wait_for_timeout(300); continue
                break
            got = await A.locator('.holeno').inner_text()
            if got != str(h + 2): await A.screenshot(path=f'{OUT}/dbg_stuck.png'); raise SystemExit(f'stuck on hole {got} after hole {h + 1}')
        check('The test round reached the 18th', await A.locator('.holeno').inner_text() == '18', await A.locator('.holeno').inner_text())
        for _ in range(3):
            if await A.locator('.moment').count(): await A.locator('.moment').click(); await A.wait_for_timeout(150)
        await A.get_by_role('button', name='Finish', exact=True).click(); await A.wait_for_timeout(400)
        if await A.get_by_role('button', name='Finish round').count(): await A.get_by_role('button', name='Finish round').click(); await A.wait_for_timeout(1500)
        for _ in range(3):
            if await A.locator('.moment').count(): await A.locator('.moment').click(); await A.wait_for_timeout(150)
        # finishing goes to History: open the round
        if await A.get_by_role('button', name='SHARE THE RESULT').count() == 0:
            await A.get_by_text('Pebble Hollow').first.click(); await A.wait_for_timeout(600)
        btn = A.get_by_role('button', name='SHARE THE RESULT')
        check('A finished round has a Share the result button', await btn.count() == 1)
        await btn.click(); await A.wait_for_timeout(2500)
        img = A.get_by_role('dialog', name='Share the result').locator('img')
        check('It makes a result card image', await img.count() == 1)
        alt = await img.get_attribute('alt') or ''
        check('...headed by the winner (first names, never "YOU WINS") and their points', ('WINS' in alt or 'TIE' in alt) and 'YOU' not in alt and 'PT' in alt, alt)
        src = await img.get_attribute('src') or ''
        open(f'{OUT}/result_card.png', 'wb').write(base64.b64decode(src.split(',', 1)[1]))
        size = await A.evaluate("""s => new Promise(r => { const i = new Image(); i.onload = () => r([i.width, i.height]); i.src = s; })""", src)
        check('...sized for phones and chats (1080 x 1350)', size == [1080, 1350], str(size))
        check('There\'s always a way to save it', await A.get_by_role('link', name='Save image').count() + await A.get_by_role('button', name='Share to the group').count() >= 1)
        await A.screenshot(path=f'{OUT}/result_sheet.png')
        print('page errors:', A.errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
