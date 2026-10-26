"""Big moments (art + stamp + confetti), small stamps on the row, the new sounds, daylight by default."""
import asyncio, sys
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
cloud = fc.Cloud(rules)
SPY = "window.__sfx=[];"

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
        await btn('You', 'plus').click(); await btn('You', 'minus').click(); await A.wait_for_timeout(500)
        m = A.locator('.moment')
        check('A birdie brings up the big moment', await m.count() == 1 and 'BIRDIE!' in await m.inner_text())
        check('...with the 8-bit bird and confetti', await A.locator('.moment .mart svg').count() == 1 and await A.locator('.moment .mconf').count() == 1)
        check('...and a caption', 'one under on hole 1' in await m.inner_text())
        await m.click(); await A.wait_for_timeout(250)
        check('Tapping it carries on', await A.locator('.moment').count() == 0)
        # eagle on hole 2 for Nic: par 4 → 2
        for n in ('Nic', 'Mitch', 'Greg'): await btn(n, 'plus').click()
        await A.get_by_role('button', name='Next hole').last.click(); await A.wait_for_timeout(300)
        await btn('Nic', 'plus').click(); await btn('Nic', 'minus').click(); await btn('Nic', 'minus').click(); await A.wait_for_timeout(400)
        check('An eagle gets the eagle', 'EAGLE!' in await A.locator('.moment').inner_text() and 'NIC' in await A.locator('.moment').inner_text())
        await A.locator('.moment').click(); await A.wait_for_timeout(200)
        # streak: Mitch par on 1, 2, 3 → x2 on the third
        await btn('Mitch', 'plus').click(); await btn('You', 'plus').click(); await btn('Greg', 'plus').click()
        await A.get_by_role('button', name='Next hole').last.click(); await A.wait_for_timeout(300)
        await btn('Mitch', 'plus').click(); await A.wait_for_timeout(400)
        txt = await A.locator('.moment').inner_text() if await A.locator('.moment').count() else ''
        check('Three net pars in a row: ON A ROLL with flames', 'ON A ROLL' in txt and 'MITCH x2' in txt, txt)
        if txt: await A.locator('.moment').click(); await A.wait_for_timeout(200)
        # small events: bank goes on the row, not a pop-up
        await A.get_by_role('button', name='Bank after hole').first.click(); await A.wait_for_timeout(300)
        check('Banking stamps the player\'s row', await A.locator('.rowstamp').count() == 1 and 'BANKING' in await A.locator('.rowstamp').inner_text())
        check('...without a pop-up', await A.locator('.moment').count() == 0)
        await A.wait_for_timeout(3400)
        check('...and the stamp fades away', await A.locator('.rowstamp').count() == 0)
        # sounds exist and buzz
        n0 = len(await A.evaluate('window.__buzz'))
        await A.get_by_role('button', name='Greg plus one').click(); await A.wait_for_timeout(100)
        check('Big moments still buzz', len(await A.evaluate('window.__buzz')) > n0)
        await A.screenshot(path=f'{OUT}/moments_end.png')
        print('page errors:', A.errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
