"""Sign-up asks for a mate's friend code, but only when no invite link or QR brought one. Entering it makes you friends."""
import asyncio, sys
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
async def to_last_step(pg, first):
    await pg.get_by_role('button', name='Continue with Google').click(); await pg.wait_for_timeout(700)
    await pg.get_by_label('First name').fill(first); await pg.get_by_label('Last name').fill('Smith'); await fc.fill_hcp(pg, '12')
async def main():
    cloud = fc.Cloud(rules)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        A = await cloud.phone(b, 'u_pierre', signed_in=False); await fc.open_app(A, URL)
        await to_last_step(A, 'Pierre')
        check('With no link, the handicap step says Next (there\'s one more question)', await A.get_by_role('button', name='Next', exact=True).count() == 1 and await A.get_by_role('button', name="Let's play").count() == 0)
        await A.get_by_role('button', name='Next', exact=True).click(); await A.wait_for_timeout(300)
        check('...which asks for a mate\'s code, and can be skipped', await A.get_by_text('Did a mate invite you?').count() == 1 and await A.get_by_text('No code? Just tap Let\'s play.').count() == 1)
        await A.get_by_role('button', name="Let's play").click(); await A.wait_for_timeout(1000)
        code = (cloud.user('u_pierre') or {}).get('refCode')
        check('Skipping it signs up as normal, with no friends', code and not any(k.startswith('friends/u_pierre/') for k in cloud.docs))
        # Nic installs from the home screen: no link, so he types Pierre's code
        N = await cloud.phone(b, 'u_nic', signed_in=False); await fc.open_app(N, URL)
        await to_last_step(N, 'Nic'); await N.get_by_role('button', name='Next', exact=True).click(); await N.wait_for_timeout(300)
        await N.get_by_label('Friend code').fill('nobody-zzzz'); await N.get_by_role('button', name='Check code').click(); await N.wait_for_timeout(400)
        check('A wrong code says so', await N.get_by_text("Couldn't find that code.", exact=False).count() == 1)
        await N.get_by_label('Friend code').fill('  ' + code.upper() + ' '); await N.get_by_role('button', name='Check code').click(); await N.wait_for_timeout(400)
        check('The right code (any case, stray spaces) shows who invited you', await N.get_by_text('Invited by Pierre S.').count() == 1)
        await N.screenshot(path=f'{OUT}/signup_code.png')
        await N.get_by_role('button', name="Let's play").click(); await N.wait_for_timeout(1200)
        check('...and you\'re friends straight away, both ways', 'friends/u_nic/list/u_pierre' in cloud.docs and 'friends/u_pierre/list/u_nic' in cloud.docs)
        check('...credited to Pierre\'s invite', (cloud.user('u_nic') or {}).get('referredBy') == code and f'refs/{code}/joins/u_nic' in cloud.docs)
        # Typing a code but tapping Let's play without checking still works
        G = await cloud.phone(b, 'u_greg', signed_in=False); await fc.open_app(G, URL)
        await to_last_step(G, 'Greg'); await G.get_by_role('button', name='Next', exact=True).click(); await G.wait_for_timeout(300)
        await G.get_by_label('Friend code').fill(code); await G.get_by_role('button', name="Let's play").click(); await G.wait_for_timeout(1400)
        check("Let's play checks a typed code itself", 'friends/u_greg/list/u_pierre' in cloud.docs)
        # Mitch uses Pierre's link: no extra question
        M = await cloud.phone(b, 'u_mitch', signed_in=False); await fc.open_app(M, URL, q=f'?ref={code}')
        await to_last_step(M, 'Mitch')
        check('With a link, there\'s no code question: straight to Let\'s play', await M.get_by_role('button', name="Let's play").count() == 1 and await M.get_by_role('button', name='Next', exact=True).count() == 0)
        await M.get_by_role('button', name="Let's play").click(); await M.wait_for_timeout(1200)
        check('...and the link still makes you friends', 'friends/u_mitch/list/u_pierre' in cloud.docs)
        print('page errors:', A.errs + N.errs + G.errs + M.errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
