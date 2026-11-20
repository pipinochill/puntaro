"""2v2 Stableford skins: setup, best ball and second ball, carry-overs, the chip-off after 18, the board, money and the result."""
import asyncio, base64, re, sys
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
cloud = fc.Cloud(rules)
# strokes against par per hole (handicaps off, so Stableford = 2 + par - score). Team A: You + Nic. Team B: Mitch + Greg.
PLAN = {
    'You':   [0, 0, 0, 0, 0] + [0] * 13,
    'Nic':   [1, 0, 1, 0, 0] + [0] * 13,
    'Mitch': [1, 0, 0, -1, 0] + [0] * 13,
    'Greg':  [1, 0, 1, 0, 1] + [0] * 13,
}

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); cloud.seed('u_s', fc.profile('Pierre'))
        A = await cloud.phone(b, 'u_s'); await fc.open_app(A, URL)
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='2v2', exact=True).click(); await A.wait_for_timeout(150)
        game = A.get_by_role('group', name='Game')
        check('2v2 offers Puntaro or Skins', await game.count() == 1 and await game.get_by_role('button', name='Skins').count() == 1)
        await game.get_by_role('button', name='Skins').click(); await A.wait_for_timeout(150)
        body = await A.locator('body').inner_text()
        check('Skins setup explains itself and drops the Puntaro extras', 'second ball decides' in body and 'Extras' not in body and 'Each skin is worth, per player' in body)
        await A.locator('.card', has_text='Use handicaps').get_by_role('switch').click(); await A.wait_for_timeout(100)
        await A.get_by_role('button', name='$5', exact=True).click(); await A.wait_for_timeout(100)
        check('Money explained in skins', 'Win by 3 skins and each winner collects $15' in await A.locator('body').inner_text())
        await A.screenshot(path=f'{OUT}/skins_setup.png', full_page=True)
        await A.evaluate('scrollTo(0, document.body.scrollHeight)')
        await A.get_by_role('button', name='Tee off').click(); await A.wait_for_timeout(500)
        strip = A.locator('[data-skins-strip]')
        check('Round opens with the skins strip: 1 skin on this hole', await strip.count() == 1 and '1 SKIN ON THIS HOLE' in (await strip.inner_text()).upper(), await strip.inner_text() if await strip.count() else '')
        check('No Puntaro pot on the rows', await A.get_by_text('Pot 0').count() == 0 and await A.locator('[data-rowbank]').count() == 0)
        tick = A.locator('[data-ticker]')
        check('Ticker shows the two teams', 'You + Nic 0' in await tick.inner_text() and 'Mitch + Greg 0' in await tick.inner_text(), await tick.inner_text())

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
            if got != str(h + 2): await A.screenshot(path=f'{OUT}/skins_stuck.png'); raise SystemExit(f'stuck on {got}')

        txt = lambda: strip.inner_text()
        await play(0)
        check('Hole 1: You + Nic win 1 skin on best ball (2 pts to 1)', 'YOU + NIC WIN 1 SKIN' in (await txt()).upper() and 'Best ball 2 pts to 1' in await txt(), await txt())
        await nxt(0); await play(1)
        check('Hole 2: all level, the skin carries', 'TIED · 1 SKIN CARRY TO 3' in (await txt()).upper(), await txt())
        await nxt(1)
        check('Hole 3 is worth 2 skins', '2 SKINS ON THIS HOLE' in (await txt()).upper() and '1 carried over' in await txt(), await txt())
        await play(2)
        check('Hole 3: best and second ball level, carries again', 'CARRY TO 4' in (await txt()).upper(), await txt())
        await nxt(2)
        check('Hole 4 is worth 3 skins', '3 SKINS ON THIS HOLE' in (await txt()).upper(), await txt())
        await play(3)
        check('Hole 4: Mitch\'s birdie wins 3 skins for Mitch + Greg', 'MITCH + GREG WIN 3 SKINS' in (await txt()).upper(), await txt())
        await A.screenshot(path=f'{OUT}/skins_hole4.png')
        await nxt(3); await play(4)
        check('Hole 5: best ball level, the second ball decides', 'YOU + NIC WIN 1 SKIN' in (await txt()).upper() and 'Best ball level at 2. Second ball 2 to 1' in await txt(), await txt())
        check('Ticker keeps count: 2 to 3', 'You + Nic 2' in await tick.inner_text() and 'Mitch + Greg 3' in await tick.inner_text(), await tick.inner_text())
        await tick.click(); await A.wait_for_timeout(250)
        board = A.get_by_role('dialog', name='Live board')
        check('Board opens on Skins: totals, who is up and by how much', await board.locator('[data-skins-board]').count() == 1 and 'up $5 each' in await board.locator('[data-skins-team="B"]').inner_text(), await board.inner_text())
        grid = [await board.locator(f'[data-skin-hole="{h}"]').inner_text() for h in range(5)]
        check('Hole-by-hole grid: A, –, –, B3, A', grid == ['A', '–', '–', 'B3', 'A'], str(grid))
        await A.screenshot(path=f'{OUT}/skins_board.png')
        await board.get_by_role('button', name='Close').click(); await A.wait_for_timeout(150)
        for h in range(5, 18):
            await nxt(h - 1); await play(h)
        check('All level from hole 6: 13 skins left after the 18th', '13 SKINS TO A CHIP-OFF' in (await txt()).upper(), await txt())
        off = A.locator('[data-skins-off]')
        check('Chip-off or putt-off asks who won', await off.count() == 1 and 'CHIP-OFF OR PUTT-OFF' in (await off.inner_text()).upper())
        await A.screenshot(path=f'{OUT}/skins_chipoff.png')
        await off.get_by_role('button', name='You + Nic').click(); await A.wait_for_timeout(250)
        check('You + Nic take the 13: 15 skins to 3', 'You + Nic 15' in await tick.inner_text() and 'Mitch + Greg 3' in await tick.inner_text() and await off.count() == 0, await tick.inner_text())
        await A.get_by_role('button', name='Finish', exact=True).click(); await A.wait_for_timeout(400)
        if await A.get_by_role('button', name='Finish round').count(): await A.get_by_role('button', name='Finish round').click(); await A.wait_for_timeout(1500)
        if await A.locator('[data-skins-summary]').count() == 0: await A.get_by_text('Pebble Hollow').first.click(); await A.wait_for_timeout(600)
        sm = A.locator('[data-skins-summary]')
        check('The result has a Skins card', await sm.count() == 1 and '15' in await sm.inner_text())
        body = await A.locator('body').inner_text()
        check('Money: 12 skins at $5, so Mitch and Greg each pay $60', 'Mitch pays' in body and '$60' in body and 'Greg pays' in body, body[body.find('Settle'):body.find('Settle') + 160])
        check('Scoresheet points are Stableford (36 for a level-par round), not Puntaro points', 'Pts' in body and re.search(r'Pts\s+36\s+34\s+36\s+33', body), body[body.find('Pts'):body.find('Pts') + 40])
        check('Skins shown once, with no leftover Puntaro pool wording', body.count('15 skins') == 1 and 'Winning team splits' not in body)
        await A.screenshot(path=f'{OUT}/skins_summary.png', full_page=True)
        await A.get_by_role('button', name='SHARE THE RESULT').click(); await A.wait_for_timeout(2500)
        img = A.get_by_role('dialog', name='Share the result').locator('img')
        alt = await img.get_attribute('alt') or ''
        check('Share card headed by the winning pair and their skins', 'YOU & NIC WIN' in alt.upper() or 'PIERRE & NIC WIN' in alt.upper(), alt)
        src = await img.get_attribute('src') or ''
        if ',' in src: open(f'{OUT}/skins_card.png', 'wb').write(base64.b64decode(src.split(',', 1)[1]))
        sw = await A.evaluate('document.documentElement.scrollWidth'); check('Nothing sticks out sideways', sw <= 392, str(sw))
        check('No page errors', not A.errs, str(A.errs))
        print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
