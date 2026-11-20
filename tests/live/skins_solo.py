"""Skins for individuals: offered for any round, outright winners, carry-overs on a tie for the most, a chip-off between
the players tied on the 18th, money (each skin worth the stake from every other player), board and result."""
import asyncio, re, sys
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
cloud = fc.Cloud(rules)
# strokes against par (handicaps off). Hole 1 You birdie: wins 1. Hole 2 You and Nic birdie: tie for most, carries.
# Hole 3 Mitch birdie: 2 skins. Holes 4-17 all par: carry to 15. Hole 18: You, Nic, Mitch par, Greg bogey -> 15 to a chip-off for three.
PLAN = {
    'You':   [-1, -1, 0] + [0] * 15,
    'Nic':   [0, -1, 0] + [0] * 15,
    'Mitch': [0, 0, -1] + [0] * 15,
    'Greg':  [0, 0, 0] + [0] * 14 + [1],
}

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); cloud.seed('u_i', fc.profile('Pierre'))
        A = await cloud.phone(b, 'u_i'); await fc.open_app(A, URL)
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
        game = A.get_by_role('group', name='Game')
        check('Free for all rounds now offer Skins too', await game.count() == 1 and await game.get_by_role('button', name='Skins').count() == 1)
        await game.get_by_role('button', name='Skins').click(); await A.wait_for_timeout(150)
        body = await A.locator('body').inner_text()
        check('Individual skins explained: outright winner, tie for the most carries', 'Most Stableford points on the hole, outright, wins it' in body)
        await A.locator('.card', has_text='Use handicaps').get_by_role('switch').click(); await A.wait_for_timeout(100)
        await A.get_by_role('button', name='$5', exact=True).click(); await A.wait_for_timeout(100)
        body = await A.locator('body').inner_text()
        check('Money: each skin is worth the stake from each other player, no pool or payout split', 'Every skin is worth $5 from each of the other players' in body and 'How it pays out' not in body and 'Pool $' not in body, body[body.find('Prize pool'):body.find('Prize pool') + 300])
        await A.evaluate('scrollTo(0, document.body.scrollHeight)')
        await A.get_by_role('button', name='Tee off').click(); await A.wait_for_timeout(500)
        strip = A.locator('[data-skins-strip]'); tick = A.locator('[data-ticker]')
        check('Strip shows each player\'s skins', await strip.locator('[data-skins-team]').count() == 4)

        async def play(h):
            for n, plan in PLAN.items():
                d = plan[h]
                await A.get_by_role('button', name=f'{n} plus one').click()
                for _ in range(abs(d)): await A.get_by_role('button', name=f'{n} {"plus" if d > 0 else "minus"} one').click()
            await A.wait_for_timeout(120)
        async def nxt(h):
            await A.get_by_role('button', name='Next hole').last.click(); await A.wait_for_timeout(200)
            for _ in range(4):
                if await A.locator('.moment').count(): await A.locator('.moment').click(); await A.wait_for_timeout(150)
            got = await A.locator('.holeno').inner_text()
            if got != str(h + 2): await A.screenshot(path=f'{OUT}/skins_i_stuck.png'); raise SystemExit(f'stuck on {got}')
        t = lambda: strip.inner_text()
        await play(0)
        check('Hole 1: your birdie wins it outright (3 pts, next best 2)', 'YOU WIN 1 SKIN' in (await t()).upper() and '3 pts, next best 2' in await t(), await t())
        await nxt(0); await play(1)
        check('Hole 2: You and Nic tie for the most, so it carries', 'CARRY TO 3' in (await t()).upper() and 'You, Nic level on 3 pts' in await t(), await t())
        await nxt(1); await play(2)
        check('Hole 3: Mitch wins 2 skins', 'MITCH WINS 2 SKINS' in (await t()).upper(), await t())
        check('Ticker lists players by skins won', (await tick.inner_text()).startswith('Mitch 2'), await tick.inner_text())
        await A.screenshot(path=f'{OUT}/skins_i_hole3.png')
        for h in range(3, 18): await nxt(h - 1); await play(h)
        check('No Puntaro comeback badge in a skins round', await A.get_by_text('LAST PLACE').count() == 0)
        check('15 skins left after the 18th', '15 SKINS TO A CHIP-OFF' in (await t()).upper(), await t())
        off = A.locator('[data-skins-off]')
        names = [await x.inner_text() for x in await off.get_by_role('button').all()]
        check('Chip-off is between the three tied on the 18th, not Greg', 'You, Nic and Mitch, who tied on the 18th' in await off.inner_text() and 'Greg' not in ' '.join(names), await off.inner_text())
        await A.screenshot(path=f'{OUT}/skins_i_chipoff.png')
        await off.get_by_role('button', name='Nic', exact=True).click(); await A.wait_for_timeout(250)
        check('Nic takes the 15: Nic 15, Mitch 2, You 1, Greg 0', (await tick.inner_text()).startswith('Nic 15'), await tick.inner_text())
        await tick.click(); await A.wait_for_timeout(250)
        board = A.get_by_role('dialog', name='Live board')
        # 18 skins won in all, 4 players at $5: net = (4 x won - 18) x 5
        ups = {k: await board.locator(f'[data-skins-team="{k}"]').inner_text() for k in ('sam', 'priya', 'me', 'jake')}
        check('Board money: Nic up $210, Mitch down $50, you down $70, Greg down $90', 'up $210' in ups['sam'] and 'down $50' in ups['priya'] and 'down $70' in ups['me'] and 'down $90' in ups['jake'], str(ups))
        grid = [await board.locator(f'[data-skin-hole="{h}"]').inner_text() for h in range(4)]
        check('Grid uses initials: Y, –, M2, –', grid == ['Y', '–', 'M2', '–'], str(grid))
        await A.screenshot(path=f'{OUT}/skins_i_board.png')
        await board.get_by_role('button', name='Close').click(); await A.wait_for_timeout(150)
        await A.get_by_role('button', name='Finish', exact=True).click(); await A.wait_for_timeout(400)
        if await A.get_by_role('button', name='Finish round').count(): await A.get_by_role('button', name='Finish round').click(); await A.wait_for_timeout(1500)
        if await A.locator('[data-skins-summary]').count() == 0: await A.get_by_text('Pebble Hollow').first.click(); await A.wait_for_timeout(600)
        body = await A.locator('body').inner_text()
        check('Result settles up: everyone pays Nic', all(f'{n} pays Nic' in body for n in ('Mitch', 'You', 'Greg')), body[body.find('Settle'):body.find('Settle') + 200])
        await A.get_by_role('button', name='SHARE THE RESULT').click(); await A.wait_for_timeout(2500)
        alt = await A.get_by_role('dialog', name='Share the result').locator('img').get_attribute('alt') or ''
        check('Share card: NIC WINS · 15 SKINS', 'NIC WINS' in alt and '15 SKINS' in alt, alt)
        sw = await A.evaluate('document.documentElement.scrollWidth'); check('Nothing sticks out sideways', sw <= 392, str(sw))
        check('No page errors', not A.errs, str(A.errs))
        print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
