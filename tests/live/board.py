"""Live board: the ticker under the hole header and the full board it opens (places, moves, pot, total, $ if it ended now, The Comp)."""
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
        await A.locator('.card', has_text='Use handicaps').get_by_role('switch').click(); await A.wait_for_timeout(100)
        await A.evaluate('scrollTo(0, document.body.scrollHeight)')
        await A.get_by_role('button', name='Tee off').click(); await A.wait_for_timeout(500)  # $10 each, 60/30/10
        async def score(n, d):
            await A.get_by_role('button', name=f'{n} plus one').click(); await A.wait_for_timeout(50)
            for _ in range(abs(d)): await A.get_by_role('button', name=f'{n} {"minus" if d < 0 else "plus"} one').click(); await A.wait_for_timeout(50)
        tick = A.locator('[data-ticker]')
        check('The ticker sits under the hole header from the first tee', await tick.count() == 1)

        # hole 1: you birdie (3), Nic and Mitch par (2), Greg bogey (1)
        for n, d in (('You', -1), ('Nic', 0), ('Mitch', 0), ('Greg', 1)): await score(n, d)
        await A.wait_for_timeout(200)
        t = re.sub(r'\s+', ' ', await tick.inner_text())
        check('Ticker lists everyone in order with places and points', t.startswith('1 You 3') and '2 Nic 2' in t and '2 Mitch 2' in t and '4 Greg 1' in t, t)
        await tick.click(); await A.wait_for_timeout(250)
        board = A.get_by_role('dialog', name='Live board')
        check('Tapping it opens the board', await board.count() == 1 and 'Thru 1' in await board.inner_text())
        rows = board.locator('[data-board-row]')
        check('Board rows run best first', [await rows.nth(i).get_attribute('data-board-row') for i in range(4)][0] == 'me')
        pay = {k: await board.locator(f'[data-board-row="{k}"] [data-pay]').inner_text() for k in ('me', 'sam', 'priya', 'jake')}
        check('$ if it ended now: 60/30/10 of $40, the tie for 2nd shares 2nd and 3rd', pay == {'me': '$24', 'sam': '$8', 'priya': '$8', 'jake': '$0'}, str(pay))
        await A.screenshot(path=f'{OUT}/board_h1.png')
        await board.get_by_role('button', name='Close').click(); await A.wait_for_timeout(150)

        # hole 2: you double bogey (bust), Greg birdie, Nic and Mitch par
        await A.get_by_role('button', name='Next hole').last.click(); await A.wait_for_timeout(300)
        for n, d in (('You', 2), ('Nic', 0), ('Mitch', 0), ('Greg', -1)): await score(n, d)
        await A.wait_for_timeout(200)
        await tick.click(); await A.wait_for_timeout(250)
        row = lambda k: board.locator(f'[data-board-row="{k}"]')
        check('Your bust drops you to 4th: ▼3', (await row('me').inner_text()).startswith('4') and '▼3' in await row('me').inner_text(), await row('me').inner_text())
        check('Greg climbs to a share of 1st: ▲3', (await row('jake').inner_text()).startswith('1') and '▲3' in await row('jake').inner_text(), await row('jake').inner_text())
        check('Pot and total columns', await row('sam').locator('[data-pot]').inner_text() == '4' and await row('sam').locator('[data-total]').inner_text() == '4')
        check('A three-way tie for 1st splits the money (the odd dollar goes to one of them)', sorted([await row(k).locator('[data-pay]').inner_text() for k in ('sam', 'priya', 'jake')]) == ['$13', '$13', '$14']
              and await row('me').locator('[data-pay]').inner_text() == '$0', str([await row(k).locator('[data-pay]').inner_text() for k in ('me', 'sam', 'priya', 'jake')]))
        await A.screenshot(path=f'{OUT}/board_h2.png')
        await board.get_by_role('tab', name='The Comp').click(); await A.wait_for_timeout(150)
        check('The Comp tab ranks by score to par', (await row('me').inner_text()).startswith('4') and '+1' in await row('me').inner_text() and 'E' in await row('jake').inner_text())
        check('...with no $ column (Puntaro pays)', await board.locator('[data-pay]').count() == 0)
        await board.get_by_role('button', name='Close').click(); await A.wait_for_timeout(150)
        check('The board closes back to scoring', await board.count() == 0)
        sw = await A.evaluate('document.documentElement.scrollWidth')
        check('Nothing sticks out sideways on a phone', sw <= 392, str(sw))
        check('No page errors', not A.errs, str(A.errs))
        print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
