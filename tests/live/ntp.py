"""Nearest the pin: big picker at the top of a par 3, and a pop-up if you try to leave without picking."""
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
        await A.get_by_role('button', name='Tee off').click(); await A.wait_for_timeout(600)
        # get to the first par 3
        for _ in range(18):
            if await A.get_by_text('Par 3: nearest the pin').count(): break
            for x in await A.locator('button[aria-label$="plus one"]').all(): await x.click()
            await A.get_by_role('button', name='Next hole').last.click(); await A.wait_for_timeout(400)
            if await A.get_by_role('button', name='Draw the cards').count(): await A.get_by_role('button', name='Draw the cards').click(); await A.wait_for_timeout(600)
            if await A.get_by_role('button', name='Flip all').count(): await A.get_by_role('button', name='Flip all').click(); await A.get_by_role('button', name="Let's play").click(); await A.wait_for_timeout(300)
        hole = await A.locator('.px').first.inner_text()
        box = await A.get_by_role('button', name='Nearest the pin: Sam').bounding_box()
        check('On a par 3 the picker sits at the top of the page', box and box['y'] < 420, str(box))
        check('...with big buttons for each player', box and box['height'] >= 48)
        await A.screenshot(path=f'{OUT}/ntp_top.png')
        for x in await A.locator('button[aria-label$="plus one"]').all(): await x.click()
        await A.get_by_role('button', name='Next hole').last.click(); await A.wait_for_timeout(400)
        check('Next hole without a pick pops up the question', await A.get_by_role('dialog', name='Nearest the pin').count() == 1)
        check('...and stays on the hole', await A.locator('.px').first.inner_text() == hole)
        await A.screenshot(path=f'{OUT}/ntp_ask.png')
        await A.get_by_role('dialog').get_by_role('button', name='Nearest the pin: Sam').click(); await A.wait_for_timeout(900)
        if await A.get_by_role('button', name='Draw the cards').count(): await A.get_by_role('button', name='Draw the cards').click(); await A.wait_for_timeout(500)
        check('Picking someone moves on to the next hole', await A.locator('.px').first.inner_text() == str(int(hole) + 1))
        if await A.get_by_role('button', name='Flip all').count(): await A.get_by_role('button', name='Flip all').click(); await A.get_by_role('button', name="Let's play").click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Previous hole').click(); await A.wait_for_timeout(400)
        check('Going back shows the winner', await A.get_by_text('Sam sticks it close').count() == 1)
        await A.get_by_role('button', name='Change').click(); await A.get_by_role('button', name='Nobody hit the green').click(); await A.wait_for_timeout(300)
        check('The pick can be changed to Nobody', await A.get_by_text('No one found the green').count() == 1)
        print('page errors:', A.errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
