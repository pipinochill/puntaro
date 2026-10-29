"""Friends with accounts: automatic from an invite, by code (request + accept), from a link when already signed up,
declining, profiles with stats, unfriending, picking friends for a round, and attempts to game it."""
import asyncio, json, sys, time
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
raw = lambda pg, path, op, data='null': pg.evaluate(f"window.__fake.raw({json.dumps(path)},{json.dumps(op)},{data}).then(()=>'ok',()=>'denied')")
cloud = fc.Cloud(rules)
friends_of = lambda u: sorted(k.split('/')[-1] for k in cloud.docs if k.startswith(f'friends/{u}/list/'))

async def signup(pg, first, q=''):
    await fc.open_app(pg, URL, q=q)
    await pg.get_by_role('button', name='Continue with Google').click(); await pg.wait_for_timeout(700)
    await pg.get_by_label('First name').fill(first); await pg.get_by_label('Last name').fill('Smith'); await fc.fill_hcp(pg, 12)
    await fc.lets_play(pg); await pg.wait_for_timeout(1500)

async def friends_tab(pg):
    await pg.get_by_role('button', name='Friends', exact=True).click(); await pg.wait_for_timeout(600)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        P = await cloud.phone(b, 'u_pierre', signed_in=False); await signup(P, 'Pierre')
        code = cloud.user('u_pierre')['refCode']
        await P.wait_for_timeout(1500)
        check('Your profile card is published for friends', (cloud.docs.get('profiles/u_pierre') or {}).get('name') == 'Pierre S.')

        # ---- 1. signing up from an invite: friends straight away
        N = await cloud.phone(b, 'u_nic', signed_in=False)
        await fc.open_app(N, URL, q=f'?ref={code}')
        await N.get_by_role('button', name='Continue with Google').click(); await N.wait_for_timeout(700)
        check('Sign-up says you\'ll be friends with whoever invited you', await N.get_by_text("You'll be friends straight away").count() == 1)
        await N.get_by_label('First name').fill('Nic'); await N.get_by_label('Last name').fill('Smith'); await fc.fill_hcp(N, 8.4)
        await fc.lets_play(N); await N.wait_for_timeout(2000)
        check('Signing up from an invite makes you friends, both ways', friends_of('u_nic') == ['u_pierre'] and friends_of('u_pierre') == ['u_nic'])
        await friends_tab(P); await P.wait_for_timeout(1200)
        check('Pierre sees Nic in Friends, marked as an app user', await P.get_by_role('button', name='View Nic').count() == 1)
        await P.screenshot(path=f'{OUT}/friends_list.png')

        # ---- 2. adding by code: request, then accept
        M = await cloud.phone(b, 'u_mitch', signed_in=False); await signup(M, 'Mitch')
        await friends_tab(M); await M.get_by_role('button', name='Add', exact=True).click(); await M.wait_for_timeout(400)
        check('Add a friend shows your code and QR', await M.get_by_label('Your friend code').count() == 1 and await M.get_by_role('img', name='Your friend QR code').count() == 1)
        await M.get_by_label('Friend code', exact=True).fill(code.upper()); await M.get_by_role('button', name='Find').click(); await M.wait_for_timeout(500)
        check('A friend code finds the person', await M.get_by_text('Pierre S.', exact=True).count() >= 1)
        await M.get_by_role('button', name='Send friend request').click(); await M.wait_for_timeout(500)
        check('...and sends a request', 'requests/u_pierre/in/u_mitch' in cloud.docs and await M.get_by_text('Request sent to Pierre S.').count() == 1)
        check('...which doesn\'t make you friends yet', friends_of('u_mitch') == [])
        await M.get_by_label('Friend code', exact=True).fill(cloud.user('u_mitch')['refCode']); await M.get_by_role('button', name='Find').click(); await M.wait_for_timeout(300)
        check('Your own code is caught', await M.get_by_text("That's your own code").count() == 1)
        await M.get_by_label('Friend code', exact=True).fill('zz-0000'); await M.get_by_role('button', name='Find').click(); await M.wait_for_timeout(300)
        check('An unknown code is caught', await M.get_by_text('No one has that code').count() == 1)
        await M.get_by_role('button', name='Close').first.click(); await M.wait_for_timeout(200)
        await P.wait_for_timeout(1200)
        check('Pierre gets a badge on Friends', await P.get_by_label('1 friend request').count() == 1)
        check('...and sees the request', await P.get_by_text('Friend requests').count() == 1 and await P.get_by_text('Mitch S.').count() == 1)
        await P.screenshot(path=f'{OUT}/friends_request.png')
        await P.get_by_role('button', name='Accept Mitch S.').click(); await P.wait_for_timeout(1500)
        check('Accepting makes them friends both ways', 'u_mitch' in friends_of('u_pierre') and friends_of('u_mitch') == ['u_pierre'])
        check('...and clears the request', 'requests/u_pierre/in/u_mitch' not in cloud.docs and await P.get_by_text('Friend requests').count() == 0)

        # ---- 3. already signed up, opens a friend's link: offered a request; Pierre declines
        G = await cloud.phone(b, 'u_greg', signed_in=False); await signup(G, 'Greg')
        await fc.open_app(G, URL, q=f'?ref={code}'); await G.wait_for_timeout(1200)
        check('Opening a friend link when signed up offers a friend request', await G.get_by_text('Send Pierre S. a friend request?').count() == 1)
        await G.get_by_role('button', name='Send friend request').click(); await G.wait_for_timeout(500)
        check('...and sends it', 'requests/u_pierre/in/u_greg' in cloud.docs)
        await P.wait_for_timeout(1200)
        await P.get_by_role('button', name='Decline').click(); await P.wait_for_timeout(800)
        check('Declining removes the request without making friends', 'requests/u_pierre/in/u_greg' not in cloud.docs and 'u_greg' not in friends_of('u_pierre'))

        # ---- 4. profiles and stats
        cloud.docs['users/u_nic/rounds/r1'] = {'id': 'r1', 'at': int(time.time() * 1000), 'course': 'Pebble Hollow', 'gross': 80, 'net': 72, 'note': '', 'hidden': False,
                                              'players': {'me': {'pts': 31, 'ntp': 2, 'win': True}}, 'round': None, 'people': None}
        await fc.open_app(N, URL); await N.wait_for_timeout(2500)
        st = ((cloud.docs.get('profiles/u_nic') or {}).get('stats') or {}).get('month') or {}
        check('A friend\'s card carries their stats', st.get('rounds') == 1 and st.get('wins') == 1)
        await P.wait_for_timeout(1000)
        await P.get_by_role('button', name='View Nic').click(); await P.wait_for_timeout(400)
        dlg = P.get_by_role('dialog')
        check('Tapping a friend opens their profile with stats', 'Puntaro friend' in await dlg.inner_text() and 'HCP 8.4' in await dlg.inner_text() and '31.0' in await dlg.inner_text())
        await P.screenshot(path=f'{OUT}/friends_profile.png')
        await dlg.get_by_role('button', name='Close').click(); await P.wait_for_timeout(200)

        # ---- 5. friends can be picked for a round
        await P.get_by_role('button', name='Home', exact=True).click(); await P.wait_for_timeout(200)
        await P.get_by_role('button', name='Start a round').click(); await P.wait_for_timeout(400)
        check('Friends with accounts are in the round\'s player list', await P.get_by_text('Nic', exact=True).count() >= 1 and await P.get_by_text('Mitch', exact=True).count() >= 1)
        await P.get_by_role('button', name='Back').first.click(); await P.wait_for_timeout(200)

        # ---- 6. unfriend
        await friends_tab(P); await P.get_by_role('button', name='View Mitch').click(); await P.wait_for_timeout(300)
        await P.get_by_role('button', name='Unfriend').click(); await P.wait_for_timeout(200)
        await P.get_by_role('dialog').get_by_role('button', name='Unfriend').click(); await P.wait_for_timeout(1500)
        check('Unfriending removes it from both lists', 'u_mitch' not in friends_of('u_pierre') and friends_of('u_mitch') == [])
        check('...and from the Friends table', await P.get_by_role('button', name='View Mitch').count() == 0)
        await friends_tab(M); await M.wait_for_timeout(1200)
        check('...on both phones', await M.get_by_role('button', name='View Pierre').count() == 0)

        # ---- 7. gaming it
        check('ATTACK Greg adds himself to Pierre\'s friends: blocked', await raw(G, 'friends/u_pierre/list/u_greg', 'set', '{"via":"request"}') == 'denied')
        check('ATTACK Greg adds Pierre to his own list: blocked', await raw(G, 'friends/u_greg/list/u_pierre', 'set', '{"via":"request"}') == 'denied')
        check(f'ATTACK Greg claims Pierre\'s invite ({code}) after the fact: blocked', await raw(G, 'friends/u_pierre/list/u_greg', 'set', json.dumps({'via': code})) == 'denied')
        check('ATTACK Greg reads Pierre\'s profile without being friends: blocked', await raw(G, 'profiles/u_pierre', 'get') == 'denied')
        check('ATTACK Greg sends a request pretending to be Mitch: blocked', await raw(G, 'requests/u_pierre/in/u_mitch', 'set', '{"name":"Mitch S."}') == 'denied')
        await raw(G, 'requests/u_pierre/in/u_greg', 'set', '{"name":"Greg S."}')
        check('ATTACK Greg accepts his own request to Pierre: blocked', await raw(G, 'friends/u_pierre/list/u_greg', 'set', '{"via":"request"}') == 'denied')
        check('ATTACK Greg reads who Pierre is friends with: blocked', await raw(G, 'friends/u_pierre/list/u_nic', 'get') == 'denied')
        check('ATTACK Greg writes Pierre\'s profile card: blocked', await raw(G, 'profiles/u_pierre', 'set', '{"name":"Hacked"}') == 'denied')
        check('Pierre can see the profile of someone who asked him', await raw(P, 'profiles/u_greg', 'get') == 'ok')
        check('A friend can read your card', await raw(N, 'profiles/u_pierre', 'get') == 'ok')

        # ---- 8. deleting your account ends your friendships and removes your card
        await N.get_by_role('button', name='Me', exact=True).click(); await N.wait_for_timeout(300)
        await N.get_by_role('button', name='Delete account').click(); await N.get_by_role('button', name='Delete', exact=True).click(); await N.wait_for_timeout(2000)
        check('Deleting your account unfriends everyone and removes your card', 'u_nic' not in friends_of('u_pierre') and 'profiles/u_nic' not in cloud.docs)

        errs = sum([x.errs for x in (P, N, M, G)], [])
        print('page errors:', errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
