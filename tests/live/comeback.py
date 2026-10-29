"""Comebacks: from the 13th whoever's last at the start of a hole scores double, and the 18th counts double for everyone."""
import asyncio, re, sys
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
cloud = fc.Cloud(rules)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); cloud.seed('u_c', fc.profile('Pierre'))
        A = await cloud.phone(b, 'u_c'); await fc.open_app(A, URL)
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
        hc = A.locator('.card', has_text='Use handicaps')
        await hc.get_by_role('switch').click(); await A.wait_for_timeout(100)  # gross scores, so a bogey is a bogey
        await A.evaluate('scrollTo(0, document.body.scrollHeight)')
        await A.get_by_role('button', name='Tee off').click(); await A.wait_for_timeout(500)
        row = lambda n: A.locator('.card', has=A.get_by_role('button', name=f'{n} plus one'))
        async def pot_line(n):
            t = await row(n).inner_text(); m = re.search(r'Pot (\d+) → (\d+)', t); return (int(m.group(1)), int(m.group(2))) if m else None
        async def play(h, greg_par):
            for n in ('You', 'Nic', 'Mitch'): await A.get_by_role('button', name=f'{n} plus one').click()
            await A.get_by_role('button', name='Greg plus one').click()
            if not greg_par: await A.get_by_role('button', name='Greg plus one').click()
            if await A.get_by_role('button', name='Nobody hit the green').count(): await A.get_by_role('button', name='Nobody hit the green').first.click(); await A.wait_for_timeout(100)
        async def nxt(h):
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
            assert await A.locator('.holeno').inner_text() == str(h + 2), f'stuck after hole {h + 1}'
        for h in range(12):
            if h == 11: check('No comeback before the 13th', await A.get_by_text('LAST PLACE X2').count() == 0 and await A.get_by_text('Comeback time').count() == 0)
            await play(h, False); await nxt(h)
        check('The 13th explains the comeback', await A.get_by_text('Comeback time').count() == 1 and await A.get_by_text('Greg is last, so scores double here.', exact=False).count() == 1)
        check('...and marks the last player\'s row', await row('Greg').get_by_text('LAST PLACE X2').count() == 1 and await row('Nic').get_by_text('LAST PLACE X2').count() == 0)
        await play(12, True); await A.wait_for_timeout(200)
        pl = await pot_line('Greg')
        check('Last place\'s par on the 13th scores double (2 x 2 = 4)', pl and pl[1] - pl[0] == 4, str(pl))
        await A.screenshot(path=f'{OUT}/comeback_13.png')
        await nxt(12)
        for h in range(13, 17): await play(h, False); await nxt(h)
        check('The 18th says everyone scores double', await A.get_by_text("18th hole: everyone's points count double").count() == 1)
        check('...and last place scores x4', await row('Greg').get_by_text('LAST PLACE X4').count() == 1)
        await play(17, True); await A.wait_for_timeout(200)
        pl = await pot_line('Greg')
        check('Last place\'s par on the 18th: 2 x 4 = 8 (7 if a leaky pot dripped)', pl and pl[1] - pl[0] in (7, 8), str(pl))
        await A.screenshot(path=f'{OUT}/comeback_18.png')
        print('page errors:', A.errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
