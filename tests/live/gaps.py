"""A hole left blank mustn't freeze someone's game: later busts still count, and the row says what's missing."""
import asyncio, sys
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
cloud = fc.Cloud(rules)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); cloud.seed('u_a', fc.profile('Pierre'))
        A = await cloud.phone(b, 'u_a'); await fc.open_app(A, URL)
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Tee off').click(); await A.wait_for_timeout(500)
        async def clear():
            for _ in range(3):
                if await A.locator('.moment').count(): await A.locator('.moment').click(); await A.wait_for_timeout(200)
        for h in range(4):
            for n in ['You','Nic','Mitch','Greg']:
                if h == 2 and n == 'Nic': continue   # Nic's hole 3 left blank
                await A.get_by_role('button', name=f'{n} plus one').click()
            if await A.get_by_role('button', name='Nobody hit the green').count(): await A.get_by_role('button', name='Nobody hit the green').first.click()
            await clear(); await A.get_by_role('button', name='Next hole').last.click(); await A.wait_for_timeout(400); await clear()
            if await A.get_by_role('button', name='Draw the cards').count(): await A.get_by_role('button', name='Draw the cards').click(); await A.wait_for_timeout(400)
            if await A.get_by_role('button', name='Flip all').count(): await A.get_by_role('button', name='Flip all').click(); await A.wait_for_timeout(400); await A.get_by_role('button', name="Let's play").click(); await A.wait_for_timeout(300)
        for n in ['You','Nic','Mitch','Greg']:
            for _ in range(9): await A.get_by_role('button', name=f'{n} plus one').click()
        await A.wait_for_timeout(300)
        rows = await A.locator('fieldset > div.card').all()
        nic = rows[1]
        check('12 strokes busts someone who left an earlier hole blank', 'bust' in (await nic.get_attribute('class')) and 'BUST' in await nic.inner_text())
        check('...and their row says which hole has no score', 'No score on hole 3' in await nic.inner_text())
        check('Everyone else busts as normal', all(['bust' in (await r.get_attribute('class')) for r in rows]))
        await nic.get_by_role('button', name='Fill it in').click(); await A.wait_for_timeout(400)
        check('Fill it in jumps to the blank hole', await A.locator('.stripes .px').first.inner_text() == '3')
        print('page errors:', A.errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
