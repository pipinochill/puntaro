"""Accounts: sign-in, first-time setup, moving phone data into the account, everything saved to the cloud
(not the phone), finished rounds and scoresheets, hiding rounds without losing stats, sign out, start fresh,
delete account, and attempts to read or change someone else's account."""
import asyncio, json, sys, time
DAY = 86400000; T0 = int(time.time() * 1000)
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=""): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))

OLD_PHONE = {  # what 0.45 kept on the phone
    'round': {'course': {'name': 'Cedar Ridge', 'tee': 'White', 'slope': 140, 'rating': 73.4, 'par': 72}, 'holes': None, 'mode': 'ffa', 'teams': None,
              'playerIds': ['me', 'f1'], 'games': ['punt'], 'useHcp': True, 'hcp': {'me': 16, 'f1': 9},
              'scores': {'me': [5, 4] + [None] * 16, 'f1': [4, 4] + [None] * 16}, 'bank': {'me': [False] * 18, 'f1': [False] * 18},
              'events': {'me': [None] * 18, 'f1': [None] * 18}, 'opts': {'cards': True, 'catchup': True, 'bonuses': True, 'penalties': True, 'ntp': True, 'cushion': True},
              'draws': [None] * 18, 'seen': [False] * 18, 'drawSeed': 7, 'ntp': [None] * 18, 'ntpOk': [False] * 18, 'stake': 0, 'split': '603010',
              'wolf': [None] * 18, 'bbb': [None] * 18, 'hole': 2, 'sample': False},
    'recent': [{'course': 'Sunrise Links', 'when': 'Today', 'gross': 90, 'net': 74, 'note': 'Puntaro round'},
               {'course': 'Pebble Hollow', 'when': 'Today', 'gross': 85, 'net': 71, 'note': 'Puntaro round'},
               {'course': 'Cedar Ridge', 'when': 'Sat', 'gross': 88, 'net': 74, 'note': 'x', 'sample': True}],
    'history': [{'at': T0 - 3 * DAY, 'course': 'Pebble Hollow', 'players': {'me': {'pts': 30, 'ntp': 1, 'win': True}, 'f1': {'pts': 22, 'ntp': 0, 'win': False}}},
                {'at': T0 - 2 * DAY, 'course': 'Sunrise Links', 'players': {'me': {'pts': 25, 'ntp': 0, 'win': False}, 'f1': {'pts': 28, 'ntp': 0, 'win': True}}}],
    'people': {'me': {'id': 'me', 'name': 'You', 'first': 'Pierre', 'last': 'B', 'hi': 14.2, 'color': '#4F7A5A'},
               'f1': {'id': 'f1', 'name': 'Tom', 'last': 'Ng', 'hi': 9.1, 'color': '#5E6E55'},
               'leo': {'id': 'leo', 'name': 'Leo', 'last': 'Costa', 'hi': 23.5, 'color': '#5E4636'}},
    'friendIds': ['f1', 'leo'], 'trash': [], 'parked': [], 'live': None,
}
OLD_COURSES = [{'id': 'osm1', 'name': 'Moore Park', 'source': 'osm', 'par': 70, 'holes': None, 'tees': [{'name': 'Blue', 'slope': 125, 'rating': 70.1}]}]

async def main():
    cloud = fc.Cloud(rules)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # ---------- signed out, with old data on the phone
        old = f"if(!localStorage.getItem('seeded')){{localStorage.setItem('puntaro.state.v1', {json.dumps(json.dumps(OLD_PHONE))});localStorage.setItem('puntaro.courses.v1', {json.dumps(json.dumps(OLD_COURSES))});localStorage.setItem('seeded','1')}}"
        A = await cloud.phone(b, 'u_pierre', email='pierre@example.com', signed_in=False, extra_init=old)
        await fc.open_app(A, URL)
        check('Signed out: the sign-in screen shows, not the app', await A.get_by_role('button', name='Continue with Google').count() == 1 and await A.get_by_role('button', name='Start a round').count() == 0)
        await A.get_by_label('Email address').fill('nope'); await A.get_by_role('button', name='Email me a sign-in link').click()
        check('A bad email address is caught', await A.get_by_text('Enter your email address.').count() == 1)
        await A.get_by_label('Email address').fill('pierre@example.com'); await A.get_by_role('button', name='Email me a sign-in link').click(); await A.wait_for_timeout(300)
        check('Sending a link shows "Check your email" with a paste box for the iPhone home-screen app', await A.get_by_text('Check your email').count() == 1 and await A.get_by_label('Paste sign-in link').count() == 1)
        await A.screenshot(path=f'{OUT}/acc_sent.png')
        await A.get_by_label('Paste sign-in link').fill('https://example.com/not-it'); await A.get_by_role('button', name='Sign in', exact=True).click()
        check('A pasted link that isn\'t a sign-in link is refused', await A.get_by_text("isn't a Puntaro sign-in link").count() == 1)
        await A.get_by_label('Paste sign-in link').fill('https://pipinochill.github.io/puntaro/?mode=signIn&fakeEmailLink=1'); await A.get_by_role('button', name='Sign in', exact=True).click(); await A.wait_for_timeout(800)
        check('Pasting the emailed link signs in and goes to first-time setup', await A.get_by_label('First name').count() == 1)
        check('Setup offers to bring this phone\'s rounds across', await A.get_by_text("Bring this phone's rounds into your account").count() == 1)
        txt = await A.inner_text('body')
        check('...counting real rounds only (not the sample ones)', '2 finished rounds and stats' in txt and '1 saved course' in txt and 'a round in progress' in txt, txt[txt.find('Bring'):txt.find('Bring') + 160])
        await A.screenshot(path=f'{OUT}/acc_setup.png')
        await A.get_by_label('First name').fill(''); await A.get_by_role('button', name="Let's play").click()
        check('Setup needs a first name', await A.get_by_text('Enter your first name.').count() == 1)
        await A.get_by_label('First name').fill('Pierre'); await fc.fill_hcp(A, '99')
        await A.get_by_role('button', name="Let's play").click()
        check('Setup checks the handicap', await A.get_by_text('Handicap index should be between').count() == 1)
        await fc.fill_hcp(A, '14.2'); await A.get_by_role('button', name="Let's play").click(); await A.wait_for_timeout(1000)
        prof = cloud.user('u_pierre') or {}
        check('The profile is saved in the account', prof.get('first') == 'Pierre' and prof.get('hi') == 14.2)
        fin = cloud.finished('u_pierre')
        check('Old rounds and stats moved into the account', len(fin) == 2 and sorted(r['course'] for r in fin.values()) == ['Pebble Hollow', 'Sunrise Links'])
        check('...with their scores', sorted((r['gross'], r['net']) for r in fin.values()) == [(85, 71), (90, 74)], json.dumps([(r['course'], r['gross'], r['net']) for r in fin.values()]))
        check('Saved course moved into the account', 'Moore Park' in prof.get('courses', ''))
        ppl = json.loads(prof.get('people', '{}'))
        check('A friend you added moved across; unused demo friends were left behind', 'f1' in ppl and 'leo' not in ppl and 'sam' not in ppl, ','.join(ppl))
        check('The round in progress moved across', (cloud.now_state('u_pierre').get('round') or {}).get('course', {}).get('name') == 'Cedar Ridge')
        keys = await A.evaluate('Object.keys(localStorage)')
        check('Nothing of the old app data is left on the phone', 'puntaro.state.v1' not in keys and 'puntaro.courses.v1' not in keys, ','.join(keys))
        check('Home shows the round in progress from the account', await A.get_by_text('Cedar Ridge').count() >= 1)

        # ---------- a solo round, finished, saved to the account with a scoresheet
        await A.get_by_role('button', name='Resume scoring').click(); await A.wait_for_timeout(300)
        for _ in range(16):
            await A.get_by_role('button', name='You plus one').click(); await A.get_by_role('button', name='Tom plus one').click()
            if await A.get_by_role('button', name='Nobody hit the green').count(): await A.get_by_role('button', name='Nobody').first.click()
            nxt = A.get_by_role('button', name='Next hole').last
            if await A.get_by_role('button', name='Finish round').count(): break
            await nxt.click(); await A.wait_for_timeout(150)
            if await A.get_by_role('button', name='Draw the cards').count(): await A.get_by_role('button', name='Draw the cards').click(); await A.wait_for_timeout(200)
            for _ in range(2):
                if await A.locator('[role=dialog]').count(): await A.locator('[role=dialog] button').last.click(); await A.wait_for_timeout(200)
        await A.get_by_role('button', name='Finish', exact=True).click(); await A.wait_for_timeout(400)
        check('The finish screen includes the scoresheet', await A.get_by_text('Scoresheet').count() == 1)
        await A.get_by_role('button', name='Save round').click(); await A.wait_for_timeout(900)
        fin = cloud.finished('u_pierre')
        new = [r for r in fin.values() if r['course'] == 'Cedar Ridge']
        check('Finishing saves the round to the account, with the full card', len(new) == 1 and json.loads(new[0]['round'])['scores']['me'][2] is not None)
        await fc.flushed(A)
        check('...and clears the round in progress', cloud.now_state('u_pierre').get('round') is None)
        await A.get_by_text('Cedar Ridge').first.click(); await A.wait_for_timeout(500)
        check('Tapping it in Recent rounds opens its scoresheet', await A.get_by_text('Scoresheet').count() == 1 and await A.get_by_role('button', name='Back').count() >= 1)
        await A.screenshot(path=f'{OUT}/acc_card.png', full_page=True)
        await A.get_by_role('button', name='Back').first.click(); await A.wait_for_timeout(300)

        # ---------- the same account on another phone
        A2 = await cloud.phone(b, 'u_pierre', email='pierre@example.com')
        await fc.open_app(A2, URL)
        check('Signing in on another phone shows the same rounds', await A2.get_by_text('Cedar Ridge').count() >= 1 and await A2.get_by_text('Sunrise Links').count() >= 1)
        await A2.get_by_role('button', name='Me', exact=True).click(); await A2.wait_for_timeout(300)
        t = await A2.inner_text('body')
        check('...and the same stats (3 rounds)', '3\nRounds' in t, t[t.find('Rounds') - 6:t.find('Rounds') + 8])

        # ---------- removing a round from the list keeps the stats
        await A2.get_by_role('button', name='Home', exact=True).click(); await A2.wait_for_timeout(300)
        row = A2.locator('[role=button]', has_text='Sunrise Links').first
        bx = await row.bounding_box(); await A2.mouse.move(bx['x'] + 20, bx['y'] + 10); await A2.mouse.down(); await A2.wait_for_timeout(900); await A2.mouse.up()
        await A2.wait_for_timeout(300); await A2.get_by_role('button', name='Delete round', exact=True).click(); await A2.wait_for_timeout(900)
        hid = [r for r in cloud.finished('u_pierre').values() if r['course'] == 'Sunrise Links'][0]
        check('Removing a finished round only hides it in the account', hid.get('hidden') is True)
        await A2.get_by_role('button', name='Me', exact=True).click(); await A2.wait_for_timeout(300)
        t = await A2.inner_text('body')
        check('...and the stats still count it', '3\nRounds' in t, t[t.find('Rounds') - 6:t.find('Rounds') + 8])

        # ---------- someone else's account is off limits
        B = await cloud.phone(b, 'u_sam', email='sam@example.com')
        await fc.open_app(B, URL, setup=('Sam', 8.4))
        check('A second person gets their own empty account', await B.get_by_text('No rounds yet').count() == 1)
        raw = lambda pg, path, op, data='null': pg.evaluate(f"window.__fake.raw({json.dumps(path)},{json.dumps(op)},{data}).then(()=>'ok',()=>'denied')")
        check('ATTACK Sam reads Pierre\'s profile: blocked', await raw(B, 'users/u_pierre', 'get') == 'denied')
        rid = list(cloud.finished('u_pierre'))[0]
        check('ATTACK Sam reads Pierre\'s finished rounds: blocked', await raw(B, f'users/u_pierre/rounds/{rid}', 'get') == 'denied')
        check('ATTACK Sam overwrites Pierre\'s stats: blocked', await raw(B, f'users/u_pierre/rounds/{rid}', 'set', '{"players":{}}') == 'denied' and cloud.finished('u_pierre')[rid].get('players'))
        check('ATTACK Sam deletes Pierre\'s round in progress: blocked', await raw(B, 'users/u_pierre/state/now', 'delete') == 'denied')
        check('Sam can read his own profile', await raw(B, 'users/u_sam', 'get') == 'ok')

        # ---------- sign out clears the phone
        await A.get_by_role('button', name='Me', exact=True).click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Sign out').click(); await A.wait_for_timeout(1200)
        for _ in range(4):
            if await A.locator('.splash').count(): await A.locator('.splash').dispatch_event('pointerdown'); await A.wait_for_timeout(350)
        check('Signing out goes back to the sign-in screen', await A.get_by_role('button', name='Continue with Google').count() == 1)
        keys = await A.evaluate('Object.keys(localStorage)')
        check('No round data is left on the phone after signing out', not any(k.startswith('puntaro.state') or k.startswith('puntaro.courses') for k in keys) and 'fake.auth' not in keys, ','.join(keys))

        # ---------- start fresh, then delete account
        await A2.get_by_role('button', name='Start fresh').click(); await A2.wait_for_timeout(200)
        check('Start fresh asks first, and says what goes', await A2.get_by_text('Wipe your rounds and stats?').count() == 1)
        await A2.get_by_role('button', name='Wipe it').click(); await A2.wait_for_timeout(1500)
        for _ in range(4):
            if await A2.locator('.splash').count(): await A2.locator('.splash').dispatch_event('pointerdown'); await A2.wait_for_timeout(350)
        check('Start fresh wipes the account\'s rounds and stats', not cloud.finished('u_pierre') and cloud.user('u_pierre') is None)
        check('...and goes back to first-time setup', await A2.get_by_label('First name').count() == 1)
        await fc.open_app(B, URL); await B.get_by_role('button', name='Me', exact=True).click(); await B.wait_for_timeout(300)
        await B.get_by_role('button', name='Delete account').click(); await B.get_by_role('button', name='Delete', exact=True).click(); await B.wait_for_timeout(1500)
        check('Delete account removes the data and the login', cloud.user('u_sam') is None and cloud.logins.get('u_sam') == 'deleted')

        # ---------- opening the emailed link directly
        C = await cloud.phone(b, 'u_priya', email='priya@example.com', signed_in=False, extra_init="localStorage.setItem('puntaro.signinEmail','priya@example.com');")
        await fc.open_app(C, URL, q='?mode=signIn&fakeEmailLink=1')
        await C.wait_for_timeout(800)
        check('Opening the emailed link on the same phone signs straight in', await C.get_by_label('First name').count() == 1)
        D = await cloud.phone(b, 'u_jake', email='jake@example.com', signed_in=False)
        await fc.open_app(D, URL, q='?mode=signIn&fakeEmailLink=1')
        check('Opening it on a different phone asks to confirm the email first', await D.get_by_text('Finish signing in').count() == 1)
        await D.get_by_label('Email address').fill('jake@example.com'); await D.get_by_role('button', name='Sign in', exact=True).click(); await D.wait_for_timeout(800)
        check('...then signs in', await D.get_by_label('First name').count() == 1)
        E = await cloud.phone(b, 'u_leo', signed_in=False, extra_init="window.__fakeAccount.googleError='auth/popup-blocked';")
        await fc.open_app(E, URL); await E.get_by_role('button', name='Continue with Google').click(); await E.wait_for_timeout(400)
        check('A blocked Google window is explained', await E.get_by_text('blocked the Google sign-in window').count() == 1)

        errs = sum([x.errs for x in (A, A2, B, C, D, E)], [])
        print('page errors:', errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
