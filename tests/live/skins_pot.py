"""Skins with a fixed buy-in: the pot is shared out by skins won, and nobody loses more than the stake."""
import asyncio, sys
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
cloud = fc.Cloud(rules)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); cloud.seed('u_p', fc.profile('Pierre'))
        A = await cloud.phone(b, 'u_p'); await fc.open_app(A, URL)
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
        await A.get_by_role('group', name='Game').get_by_role('button', name='Skins').click(); await A.wait_for_timeout(100)
        await A.locator('.card', has_text='Use handicaps').get_by_role('switch').click(); await A.wait_for_timeout(100)
        pay = A.get_by_role('group', name='How skins pay')
        check('Skins offer Per skin or Fixed buy-in', await pay.count() == 1 and await pay.get_by_role('button', name='Fixed buy-in').count() == 1)
        await pay.get_by_role('button', name='Fixed buy-in').click(); await A.get_by_role('button', name='$10', exact=True).click(); await A.wait_for_timeout(100)
        body = await A.locator('body').inner_text()
        check('Fixed buy-in explained: a $40 pot, nobody loses more than $10', 'A $40 pot, shared out by skins won' in body and 'Nobody loses more than $10' in body and 'Buy-in per player' in body)
        await A.evaluate('scrollTo(0, document.body.scrollHeight)')
        await A.get_by_role('button', name='Tee off').click(); await A.wait_for_timeout(500)
        for n, d in (('You', -1), ('Nic', 0), ('Mitch', 0), ('Greg', 0)):
            await A.get_by_role('button', name=f'{n} plus one').click()
            if d: await A.get_by_role('button', name=f'{n} minus one').click()
        await A.wait_for_timeout(200)
        await A.locator('[data-ticker]').click(); await A.wait_for_timeout(250)
        board = A.get_by_role('dialog', name='Live board')
        v = {k: await board.locator(f'[data-skins-team="{k}"]').inner_text() for k in ('me', 'sam', 'priya', 'jake')}
        check('One skin won: you hold the whole $40 pot (up $30), the rest are down $10, no more', 'up $30' in v['me'] and all('down $10' in v[k] for k in ('sam', 'priya', 'jake')), str(v))
        check('Board says how the pot works', '$40 pot, shared out by skins won' in await board.inner_text())
        check('No page errors', not A.errs, str(A.errs))
        print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
