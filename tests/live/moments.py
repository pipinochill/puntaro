"""Big moments play when you leave a hole, for final scores: good news on one screen, then the bad.
Small stamps on the row, daylight by default, sample players, sounds/vibration."""
import asyncio, sys
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
cloud = fc.Cloud(rules)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); cloud.seed('u_a', fc.profile('Pierre'))
        A = await cloud.phone(b, 'u_a', extra_init="window.__buzz=[];navigator.vibrate=p=>{window.__buzz.push(p);return true};")
        await fc.open_app(A, URL)
        check('The app opens in daylight (light) mode', await A.locator('.sg.dark').count() == 0)
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
        check('Sample players are Nic, Mitch and Greg', all([await A.get_by_text(n, exact=True).count() >= 1 for n in ('Nic', 'Mitch', 'Greg')]))
        await A.get_by_role('button', name='Tee off').click(); await A.wait_for_timeout(500)
        check('The round header carries the PUNTARO tiles', await A.locator('.stripes .tiles').count() == 1)
        btn = lambda n, s: A.get_by_role('button', name=f'{n} {s} one')
        mom = A.locator('.moment')
        async def nxt():
            await A.get_by_role('button', name='Next hole').last.click(); await A.wait_for_timeout(500)

        # hole 1: You go par -> birdie -> eagle while tapping; nothing pops up until you leave the hole
        await btn('You', 'plus').click(); await btn('You', 'minus').click(); await A.wait_for_timeout(300)
        check('Tapping down to a birdie doesn\'t pop anything up yet', await mom.count() == 0)
        check('...the row just shows BIRDIE', await A.get_by_text('BIRDIE', exact=True).count() == 1)
        await btn('You', 'minus').click(); await A.wait_for_timeout(300)
        check('Tapping on to an eagle: still nothing, the tag says EAGLE', await mom.count() == 0 and await A.get_by_text('EAGLE', exact=True).count() == 1)
        for n in ('Nic', 'Mitch', 'Greg'): await btn(n, 'plus').click()
        await nxt()
        check('Leaving the hole plays the moment for the final score only', await mom.count() == 1 and 'EAGLE!' in await mom.inner_text() and 'BIRDIE' not in await mom.inner_text())
        check('...with the 8-bit eagle and confetti', await A.locator('.moment .mart svg').count() == 1 and await A.locator('.moment .mconf').count() == 1)
        check('...and says who did it', 'Eagle: You' in await mom.inner_text())
        await mom.click(); await A.wait_for_timeout(250)
        check('Tapping carries on', await mom.count() == 0)

        # hole 2: everyone par (Greg's pot builds)
        for n in ('You', 'Nic', 'Mitch', 'Greg'): await btn(n, 'plus').click()
        await nxt()
        check('A quiet hole plays nothing', await mom.count() == 0)
        # hole 3: Nic birdie, Mitch third par in a row (x2), Greg busts
        await btn('Nic', 'plus').click(); await btn('Nic', 'minus').click()
        await btn('Mitch', 'plus').click(); await btn('You', 'plus').click(); await btn('You', 'plus').click()
        await btn('Greg', 'plus').click()
        for _ in range(3): await btn('Greg', 'plus').click()
        await A.wait_for_timeout(300)
        check('Stepping up through a bust doesn\'t pop anything up either', await mom.count() == 0)
        if await A.get_by_role('button', name='Nobody hit the green').count(): await A.get_by_role('button', name='Nobody hit the green').first.click()
        await nxt()
        if await A.get_by_role('dialog', name='Nearest the pin').count(): await A.get_by_role('dialog').get_by_role('button', name='Nobody hit the green').click(); await A.wait_for_timeout(700)
        t1 = await mom.inner_text() if await mom.count() else ''
        check('All the good news comes first, on one screen', 'BIRDIE!' in t1 and 'Birdie: Nic' in t1 and 'On a roll x2: Mitch' in t1 and 'BUST' not in t1, t1)
        check('...headlined by the best one, with how many others', 'NIC +' in t1 and 'MORE' in t1, t1)
        check('...and says there\'s more to come', 'Tap for the next one' in t1)
        await A.screenshot(path=f'{OUT}/moments_good.png')
        await mom.click(); await A.wait_for_timeout(300)
        t2 = await mom.inner_text() if await mom.count() else ''
        check('Then the bad news', 'BUST' in t2 and 'GREG' in t2 and 'Banked points are safe' in t2, t2)
        await A.screenshot(path=f'{OUT}/moments_bad.png')
        await mom.click(); await A.wait_for_timeout(300)
        check('...and then you\'re back to scoring', await mom.count() == 0)
        check('...then the last chance to bank, as before', await A.get_by_role('button', name='Draw the cards').count() == 1)
        await A.get_by_role('button', name='Draw the cards').click(); await A.wait_for_timeout(500)
        await A.get_by_role('button', name='Flip all').click(); await A.wait_for_timeout(500); await A.get_by_role('button', name="Let's play").click(); await A.wait_for_timeout(300)
        # going back and forward doesn't replay
        await A.get_by_role('button', name='Previous hole').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Next hole').first.click(); await A.wait_for_timeout(600)
        check('Going back a hole and forward again doesn\'t replay them', await mom.count() == 0)
        if await A.get_by_role('button', name='Close').count() and await A.get_by_role('dialog', name='Draw your cards').count(): pass

        # small events: bank goes on the row, not a pop-up
        await A.get_by_role('button', name='Bank after hole').first.click(); await A.wait_for_timeout(300)
        check('Banking stamps the player\'s row', await A.locator('.rowstamp').count() == 1 and 'BANKING' in await A.locator('.rowstamp').inner_text())
        check('...without a pop-up', await mom.count() == 0)
        await A.wait_for_timeout(3400)
        check('...and the stamp fades away', await A.locator('.rowstamp').count() == 0)
        n0 = len(await A.evaluate('window.__buzz'))
        await btn('Greg', 'plus').click(); await A.wait_for_timeout(100)
        check('Score taps still buzz', len(await A.evaluate('window.__buzz')) > n0)
        print('page errors:', A.errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
