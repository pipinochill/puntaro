"""Handicaps for players without an official one: the sign-up question, EST tags, guests, a Puntaro handicap
worked out from witnessed live rounds (WHS method), fast down / slow up, and official handicaps left alone."""
import asyncio, json, subprocess, sys, time
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
import os; HCP = os.path.abspath(sys.argv[4] if len(sys.argv) > 4 else os.path.join(os.path.dirname(__file__), '../../src/hcp.js'))
def whs(diffs):  # the app's own maths, run in node
    out = subprocess.run(['node', '-e', f"import('{HCP}').then(m=>console.log(JSON.stringify(m.indexFrom({json.dumps(diffs)}))))"], capture_output=True, text=True)
    return json.loads(out.stdout)

async def signup(pg, first, choose, usual=None, hi=None):
    await pg.get_by_role('button', name='Continue with Google').click(); await pg.wait_for_timeout(700)
    await pg.get_by_label('First name').fill(first); await pg.get_by_label('Last name').fill('Smith')
    await pg.get_by_role('button', name=choose, exact=True).click()
    if usual: await pg.get_by_role('button', name=usual, exact=True).click()
    if hi is not None: await pg.get_by_label('Handicap index').fill(str(hi))
    await pg.wait_for_timeout(200)

def seed_round(uid, n, diff, witnessed=True, days_ago=10):
    at = int(time.time() * 1000) - days_ago * 86400000
    cloud.docs[f'users/{uid}/rounds/seed{n}'] = {'id': f'seed{n}', 'at': at, 'course': 'Pebble Hollow', 'gross': 90, 'net': 74, 'note': 'Live round',
                                                 'players': {'me': {'pts': 20, 'ntp': 0, 'win': False}}, 'round': None, 'people': None, 'hidden': False,
                                                 'live': {'code': f'PUNT-SEED{n}', 'myId': 'me'}, 'diff': diff, 'witnessed': witnessed}

async def play_live_round(H, S, code):
    """Host keeps score for both for 18 holes (one scorer): Pierre one over par each hole, Sam par."""
    for h in range(18):
        await H.get_by_role('button', name='Pierre plus one').click(); await H.wait_for_timeout(60)
        await H.get_by_role('button', name='Pierre plus one').click(); await H.wait_for_timeout(60)
        await H.get_by_role('button', name='Sam plus one').click(); await H.wait_for_timeout(60)
        if await H.get_by_text('Pick nearest the pin first').count(): await H.get_by_role('button', name='Nobody').first.click(); await H.wait_for_timeout(100)
        if h == 17: break
        await H.get_by_role('button', name='Next hole').last.click(); await H.wait_for_timeout(200)
        if await H.get_by_role('button', name='Draw the cards').count(): await H.get_by_role('button', name='Draw the cards').click(); await H.wait_for_timeout(300)
        for _ in range(3):
            if await H.locator('[role=dialog]').count(): await H.locator('[role=dialog] button').last.click(); await H.wait_for_timeout(250)

cloud = fc.Cloud(rules)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # ---- sign-up choices
        A = await cloud.phone(b, 'u_pierre', signed_in=False); await fc.open_app(A, URL)
        await signup(A, 'Pierre', 'No handicap')
        check('"No handicap" asks what you usually shoot', await A.get_by_text('What do you usually shoot for 18 holes?').count() == 1)
        await A.get_by_role('button', name="Let's play").click(); await A.wait_for_timeout(300)
        check('...and needs an answer', await A.get_by_text('Pick what you usually shoot.').count() == 1)
        await A.get_by_role('button', name='90 to 99', exact=True).click(); await A.wait_for_timeout(150)
        check('Picking "90 to 99" shows the starting handicap', await A.get_by_text('Starting handicap 20.0, marked EST.').count() == 1)
        await A.screenshot(path=f'{OUT}/hcp_setup.png')
        await A.get_by_role('button', name="Let's play").click(); await A.wait_for_timeout(900)
        prof = cloud.user('u_pierre')
        check('It saves 20.0 as an estimate', prof.get('hi') == 20 and prof.get('hcpKind') == 'est')
        check('Home shows "HCP 20.0 EST"', await A.get_by_text('HCP 20.0 EST').count() == 1)
        N = await cloud.phone(b, 'u_newbie', signed_in=False); await fc.open_app(N, URL)
        await signup(N, 'Nina', 'No handicap', usual="I don't really play yet")
        await N.get_by_role('button', name="Let's play").click(); await N.wait_for_timeout(900)
        check('Someone who doesn\'t really play starts at 54 (the maximum)', cloud.user('u_newbie').get('hi') == 54 and await N.get_by_text('HCP 54.0 EST').count() == 1)
        G = await cloud.phone(b, 'u_gary', signed_in=False); await fc.open_app(G, URL)
        await signup(G, 'Gary', 'I have a handicap', hi=8.3)
        await G.get_by_role('button', name="Let's play").click(); await G.wait_for_timeout(900)
        check('An official handicap is saved as entered, with no tag', cloud.user('u_gary').get('hi') == 8.3 and cloud.user('u_gary').get('hcpKind') == 'ga' and await G.get_by_text('HCP 8.3', exact=True).count() == 1)
        await G.get_by_role('button', name='Me', exact=True).click(); await G.wait_for_timeout(300)
        await G.get_by_label('Golf ID').fill('2001234567'); await fc.flushed(G)
        check('A Golf ID can be added for future verification', cloud.user('u_gary').get('golfId') == '2001234567')

        # ---- a guest with no handicap
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='+ Guest').click(); await A.wait_for_timeout(300)
        await A.get_by_label('Name', exact=True).fill('Sam'); await A.get_by_label('Last name').fill('Walker')
        await A.get_by_role('button', name='No handicap', exact=True).click(); await A.get_by_role('button', name='100 to 109', exact=True).click()
        await A.get_by_role('button', name='Add to round').click(); await A.wait_for_timeout(300)
        check('A guest without a handicap gets an estimate, shown as EST', await A.get_by_text('HCP 30.0 EST').count() >= 1)
        await A.screenshot(path=f'{OUT}/hcp_guest.png')

        # ---- Sam signs up, Pierre has two earlier witnessed rounds, then they play a live round together
        S = await cloud.phone(b, 'u_sam', signed_in=False); await fc.open_app(S, URL)
        await signup(S, 'Sam', 'No handicap', usual='100 to 109'); await S.get_by_role('button', name="Let's play").click(); await S.wait_for_timeout(800)
        seed_round('u_pierre', 1, 21.4, days_ago=20); seed_round('u_pierre', 2, 24.0, days_ago=12)
        seed_round('u_pierre', 3, 5.0, witnessed=False, days_ago=11)  # a solo round: must not count
        await A.get_by_role('switch').last.click(); await A.get_by_label('Your name for the group').fill('Pierre')
        await A.get_by_role('button', name='One scorer', exact=True).click()
        await A.get_by_role('button', name='Tee off live').click(); await A.wait_for_timeout(900)
        code = [k.split('/')[1] for k in cloud.docs if k.startswith('rounds/') and k.count('/') == 1][0]
        await A.get_by_role('button', name='Close').first.click()
        await fc.open_app(S, URL, q=f'?join={code}'); await S.wait_for_timeout(500)
        await S.get_by_role('button', name='Sam').first.click(); await S.wait_for_timeout(700)
        await play_live_round(A, S, code)
        await A.get_by_role('button', name='Finish', exact=True).click(); await A.wait_for_timeout(400)
        await A.get_by_role('button', name='Finish round').click(); await A.wait_for_timeout(2500)
        rec = cloud.finished('u_pierre').get(code) or {}
        check('The live round is recorded as witnessed, with a score differential', rec.get('witnessed') is True and isinstance(rec.get('diff'), (int, float)), json.dumps({k: rec.get(k) for k in ('witnessed', 'diff')}))
        r = json.loads(rec['round']); slope = r['course']['slope']; rating = r['course']['rating']
        expect = round(113 / slope * (90 - rating), 1)  # bogey every hole = 90, all under the net double cap
        check(f'The differential matches the WHS formula ({expect})', rec.get('diff') == expect, str(rec.get('diff')))
        want = whs([21.4, 24.0, rec['diff']])
        await fc.flushed(A)
        prof = cloud.user('u_pierre')
        check(f'After 3 witnessed rounds the estimate becomes a Puntaro handicap ({want})', prof.get('hi') == want and prof.get('hcpKind') == 'app', json.dumps({k: prof.get(k) for k in ('hi', 'hcpKind', 'hcpRounds')}))
        check('The solo round wasn\'t counted', prof.get('hcpRounds') == 3)
        check('Pierre is told his new handicap', await A.get_by_text(f'Your Puntaro handicap is now {want:.1f}, from 3 live rounds.').count() == 1)
        check('Home shows it with an APP tag', await A.get_by_text(f'HCP {want:.1f} APP').count() == 1)
        srec = cloud.finished('u_sam').get(code) or {}
        check('Sam\'s account records his own differential too', srec.get('witnessed') is True and isinstance(srec.get('diff'), (int, float)))
        check('...but one round isn\'t enough to change his estimate', cloud.user('u_sam').get('hcpKind') == 'est' and cloud.user('u_sam').get('hi') == 30)

        # ---- slow up, fast down
        seed_round('u_pierre', 4, 45.0, days_ago=1); await A.wait_for_timeout(1800); await fc.flushed(A)
        up = whs([21.4, 24.0, rec['diff'], 45.0]); got = cloud.user('u_pierre').get('hi')
        check(f'A terrible round raises it by at most 1.0 (to {min(up, want + 1.0)})', got == round(min(up, want + 1.0), 1), f'{got} computed {up}')
        seed_round('u_pierre', 5, 8.0, days_ago=0); await A.wait_for_timeout(1800); await fc.flushed(A)
        down = whs([21.4, 24.0, rec['diff'], 45.0, 8.0]); got = cloud.user('u_pierre').get('hi')
        check(f'A great round lowers it straight away (to {down})', got == down, f'{got}')

        # ---- official handicaps are left alone
        for n in range(3): seed_round('u_gary', 10 + n, 30.0)
        await fc.open_app(G, URL); await G.wait_for_timeout(1500); await fc.flushed(G)
        check('An official handicap is never overwritten by Puntaro rounds', cloud.user('u_gary').get('hi') == 8.3 and cloud.user('u_gary').get('hcpKind') == 'ga')

        # ---- changing it by hand
        await A.get_by_role('button', name='Me', exact=True).click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Raise handicap').click(); await fc.flushed(A)
        check('Changing a Puntaro handicap by hand marks it EST again', cloud.user('u_pierre').get('hcpKind') == 'est')
        for _ in range(3): await N.get_by_role('button', name='Me', exact=True).click() if _ == 0 else None
        await N.get_by_role('button', name='Raise handicap').click(); await fc.flushed(N)
        check('54 is the most anyone can have', cloud.user('u_newbie').get('hi') == 54)

        errs = sum([x.errs for x in (A, N, G, S)], [])
        print('page errors:', errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
