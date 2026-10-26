"""Invite links: every account gets its own code; people who sign up from a link (or a live round QR) are
credited to whoever shared it; only the owner sees who joined; the join survives email-link sign-in;
and attempts to game the counts."""
import asyncio, json, sys
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
raw = lambda pg, path, op, data='null': pg.evaluate(f"window.__fake.raw({json.dumps(path)},{json.dumps(op)},{data}).then(()=>'ok',()=>'denied')")

async def signup_google(pg, first, hcp=12):
    await pg.get_by_role('button', name='Continue with Google').click(); await pg.wait_for_timeout(700)
    await pg.get_by_label('First name').fill(first); await pg.get_by_label('Last name').fill('Smith'); await fc.fill_hcp(pg, str(hcp))

async def main():
    cloud = fc.Cloud(rules)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # Pierre signs up and gets a code
        A = await cloud.phone(b, 'u_pierre', signed_in=False)
        await fc.open_app(A, URL); await signup_google(A, 'Pierre')
        await A.get_by_role('button', name="Let's play").click(); await A.wait_for_timeout(900)
        code = (cloud.user('u_pierre') or {}).get('refCode')
        check('A new account gets its own invite code', code and code.startswith('pierre-') and cloud.docs.get(f'refs/{code}', {}).get('owner') == 'u_pierre', code)
        check('...under the name others will see', cloud.docs.get(f'refs/{code}', {}).get('name') == 'Pierre S.')
        await A.get_by_role('button', name='Me', exact=True).click(); await A.wait_for_timeout(500)
        check('The Me tab shows your invite link', await A.get_by_text(f'?ref={code}').count() == 1 and await A.get_by_role('button', name='Share my invite link').count() == 1)
        check('...and that no one has joined yet', await A.get_by_text('No one has joined with your link yet').count() == 1)
        await A.get_by_text('Invite friends').scroll_into_view_if_needed(); await A.screenshot(path=f'{OUT}/inv_me0.png')

        # Nic opens Pierre's invite link and signs up
        S = await cloud.phone(b, 'u_sam', signed_in=False)
        await fc.open_app(S, URL, q=f'?ref={code}')
        await signup_google(S, 'Nic')
        check('Nic sees who invited him', await S.get_by_text('Invited by Pierre S.').count() == 1)
        await S.screenshot(path=f'{OUT}/inv_setup.png')
        await S.get_by_role('button', name="Let's play").click(); await S.wait_for_timeout(900)
        check('Nic\'s account records who invited him', (cloud.user('u_sam') or {}).get('referredBy') == code)
        check('Pierre is credited with Nic', cloud.docs.get(f'refs/{code}/joins/u_sam', {}).get('name') == 'Nic S.')
        check('The invite code is cleared from Nic\'s phone', 'puntaro.pendingRef' not in await S.evaluate('Object.keys(localStorage)'))
        await fc.open_app(A, URL); await A.get_by_role('button', name='Me', exact=True).click(); await A.wait_for_timeout(600)
        check('Pierre sees "1 joined with your link: Nic S."', await A.get_by_text('1 joined with your link').count() == 1 and await A.get_by_text('Nic S.').count() >= 1)
        await A.get_by_text('Invite friends').scroll_into_view_if_needed(); await A.screenshot(path=f'{OUT}/inv_me1.png')

        # Mitch scans Pierre's live round QR, signs in with an email link (which reopens the app on a fresh page)
        await A.get_by_role('button', name='Home', exact=True).click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
        if await A.get_by_role('button', name='Start a new round').count(): await A.get_by_role('button', name='Start a new round').click(); await A.wait_for_timeout(300)
        check('Nic signed up from Pierre\'s link, so he\'s already one of Pierre\'s players', await A.get_by_text('Nic', exact=True).count() >= 1 and not await A.get_by_role('button', name='Tee off').is_disabled())
        await A.get_by_role('button', name='+ Guest').click(); await A.wait_for_timeout(300)
        await A.get_by_label('Name', exact=True).fill('Mitch'); await A.get_by_label('Last name').fill('Nair'); await fc.fill_hcp(A, '19')
        await A.get_by_role('button', name='Add to round').click(); await A.wait_for_timeout(300)
        await A.get_by_role('switch').last.click(); await A.get_by_label('Your name for the group').fill('Pierre')
        await A.get_by_role('button', name='Tee off live').click(); await A.wait_for_timeout(900)
        live = [k.split('/')[1] for k in cloud.docs if k.startswith('rounds/') and k.count('/') == 1][0]
        qr = await A.locator('svg[aria-label^="QR code"]').count()
        link = f'?join={live}&ref={code}'
        check('The live round QR and share link carry Pierre\'s invite code', qr == 1)
        P = await cloud.phone(b, 'u_priya', email='priya@example.com', signed_in=False)
        await fc.open_app(P, URL, q=link)
        await P.get_by_label('Email address').fill('priya@example.com'); await P.get_by_role('button', name='Email me a sign-in link').click(); await P.wait_for_timeout(300)
        await fc.open_app(P, URL, q='?mode=signIn&fakeEmailLink=1')  # she taps the link in her email
        await P.wait_for_timeout(600)
        check('After the email link, Mitch sees who invited her', await P.get_by_text('Invited by Pierre S.').count() == 1)
        await P.get_by_label('First name').fill('Mitch'); await fc.fill_hcp(P, '19')
        await P.get_by_role('button', name="Let's play").click(); await P.wait_for_timeout(1200)
        check('...the live round she scanned is still waiting for her', await P.get_by_text('Which one are you?').count() == 1)
        check('...and Pierre is credited with Mitch', f'refs/{code}/joins/u_priya' in cloud.docs)
        await P.get_by_role('button', name='Mitch').first.click(); await P.wait_for_timeout(600)
        check('She joins the round', 'u_priya' in cloud.live(live)['claims'].values())

        # existing players opening an invite link aren't counted
        await fc.open_app(S, URL, q=f'?ref={code}'); await S.wait_for_timeout(500)
        check('An existing player opening an invite link isn\'t counted again', len([k for k in cloud.docs if k.startswith(f'refs/{code}/joins/')]) == 2)
        check('...and the code doesn\'t linger on their phone', 'puntaro.pendingRef' not in await S.evaluate('Object.keys(localStorage)'))

        # attacks
        scode = cloud.user('u_sam')['refCode']; pcode = cloud.user('u_priya')['refCode']
        check('ATTACK Nic adds himself to Mitch\'s invites too: blocked', await raw(S, f'refs/{pcode}/joins/u_sam', 'set', '{"name":"Nic S.","at":0}') == 'denied')
        check('ATTACK Nic changes who invited him: blocked', await raw(S, 'users/u_sam', 'set', json.dumps({**cloud.user('u_sam'), 'referredBy': pcode})) == 'denied')
        check('ATTACK Pierre counts himself on his own link: blocked', await raw(A, f'refs/{code}/joins/u_pierre', 'set', '{"name":"x","at":0}') == 'denied')
        check('ATTACK Nic adds a fake person to Pierre\'s list: blocked', await raw(S, f'refs/{code}/joins/u_fake', 'set', '{"name":"Fake","at":0}') == 'denied')
        check('ATTACK Nic removes himself from Pierre\'s list: blocked', await raw(S, f'refs/{code}/joins/u_sam', 'delete') == 'denied')
        check('ATTACK Nic takes over Pierre\'s invite code: blocked', await raw(S, f'refs/{code}', 'set', '{"owner":"u_sam","name":"Nic"}') == 'denied' and cloud.docs[f'refs/{code}']['owner'] == 'u_pierre')
        check('ATTACK Nic reads who joined with Pierre\'s link: blocked', await raw(S, f'refs/{code}/joins/u_priya', 'get') == 'denied')
        check('Pierre can read his own list', await raw(A, f'refs/{code}/joins/u_priya', 'get') == 'ok')

        # an account from before invites gets a code on request
        cloud.seed('u_old', fc.profile('Olive'))
        O = await cloud.phone(b, 'u_old'); await fc.open_app(O, URL)
        await O.get_by_role('button', name='Me', exact=True).click(); await O.wait_for_timeout(300)
        await O.get_by_role('button', name='Get my invite link').click(); await O.wait_for_timeout(700)
        oc = (cloud.user('u_old') or {}).get('refCode')
        check('An older account gets a code with one tap', oc and oc.startswith('olive-') and await O.get_by_role('button', name='Share my invite link').count() == 1)

        errs = sum([x.errs for x in (A, S, P, O)], [])
        print('page errors:', errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
