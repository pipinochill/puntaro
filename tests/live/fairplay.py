"""Fair play: rounds that look too quick or too good are flagged in the admin's Dev tab. Void stops a round counting
(stats, ladders, the player's card) but keeps it in History, marked. Fine clears the flag. Handicap raises are watched."""
import asyncio, json, sys, time
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
ADMIN = 'wXejcmHxZQWMfzyp27LzLrguag02'
PAR = [4,4,3,5,4,4,3,4,5, 4,3,5,4,4,3,4,5,4]
NOW = int(time.time() * 1000)
def rec(i, course, at, hole_gap_ms, greg_over):
    ids = ['me', 'jake']
    sc = {'me': [p + 1 for p in PAR], 'jake': [p + greg_over for p in PAR]}
    r = {'playerIds': ids, 'scores': sc, 'bank': {k: [False] * 18 for k in ids}, 'events': {k: {} for k in ids}, 'draws': {}, 'ntp': {},
         'opts': {'cards': False, 'ntp': False, 'cushion': False}, 'useHcp': True, 'hcp': {'me': 14, 'jake': 28}, 'mode': 'ffa', 'games': ['punt'],
         'course': {'name': course, 'par': 72}, 'holes': None, 'startedAt': at - 18 * hole_gap_ms, 'holeAt': [at - (18 - h) * hole_gap_ms for h in range(18)]}
    return {'id': f'r{i}', 'at': at, 'course': course, 'gross': sum(sc['me']), 'net': sum(sc['me']) - 14, 'players': {'me': {'pts': 0, 'ntp': 0, 'win': False}, 'jake': {'pts': 0, 'ntp': 0, 'win': True}},
            'note': 'Puntaro round', 'round': json.dumps(r), 'people': json.dumps({'me': {'name': 'Pierre', 'first': 'Pierre'}, 'jake': {'name': 'Greg', 'first': 'Greg'}}), 'hidden': False}
cloud = fc.Cloud(rules)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        prof = fc.profile('Pierre', last='Smith'); ppl = json.loads(prof['people'])
        ppl['me']['raises'] = [{'at': NOW - 5 * 864e5, 'from': 14.2, 'to': 15.7}, {'at': NOW - 3 * 864e5, 'from': 15.7, 'to': 17.0}, {'at': NOW - 864e5, 'from': 17.0, 'to': 18.4}]
        prof['people'] = json.dumps(ppl); cloud.seed('u_p', prof); cloud.seed(ADMIN, fc.profile('Boss'))
        cloud.docs['users/u_p/rounds/r1'] = rec(1, 'Fast Valley', NOW - 2 * 864e5, 10000, -1)      # 18 holes in 3 minutes, Greg 18 under par
        cloud.docs['users/u_p/rounds/r2'] = rec(2, 'Honest Links', NOW - 864e5, 12 * 60000, 2)      # normal pace, normal scores
        P = await cloud.phone(b, 'u_p'); await fc.open_app(P, URL)
        if not await P.get_by_role('button', name='Me', exact=True).count(): print('DEBUG', P.errs, (await P.inner_text('body'))[:300]); await P.screenshot(path=f'{OUT}/fair_dbg.png')
        await P.get_by_role('button', name='Me', exact=True).click(); await P.wait_for_timeout(400)
        check('Before any void, both rounds count', '2\nrounds' in await P.inner_text('body'))
        A = await cloud.phone(b, ADMIN); await fc.open_app(A, URL)
        await A.get_by_role('button', name='Dev', exact=True).click(); await A.wait_for_timeout(1500)
        box = A.locator('.card', has_text='Fair play')
        t = await box.inner_text()
        check('Dev flags the suspicious round, with reasons', 'Fair play (1 to check)' in t and 'Fast Valley' in t and '18 holes entered in 3 minutes' in t and 'Greg: gross 54 off a course handicap of 28 (46 under)' in t, t[:500])
        check('...and leaves the normal round alone', 'Honest Links' not in t)
        check('...and watches repeated handicap raises', 'HANDICAP WATCH' in t and 'Pierre S.' in t and '+4.2' in t, t[-200:])
        await A.screenshot(path=f'{OUT}/fair_dev.png', full_page=True)
        await box.get_by_role('button', name='Void').click(); await A.wait_for_timeout(500)
        v = cloud.docs.get('voids/S-u_p-r1')
        check('Void saves it, with the reasons', v and v['status'] == 'void' and '3 minutes' in v['reason'], str(v))
        check('...and it moves to Voided', 'Fair play (0 to check)' in await box.inner_text() and 'VOIDED' in await box.inner_text())
        r = await P.evaluate("window.__fake.raw('voids/S-u_p-r9', 'set', {status: 'void', reason: 'x', by: 'u_p'}).then(() => 'did', e => 'denied')")
        check("Players can't void rounds themselves", r == 'denied')
        await fc.open_app(P, URL); await P.wait_for_timeout(600)
        await P.get_by_role('button', name='History', exact=True).click(); await P.wait_for_timeout(400)
        ht = await P.inner_text('body')
        check("The player's History keeps the round, marked VOIDED", 'Fast Valley' in ht and 'VOIDED' in ht and "Doesn't count towards stats or ladders." in ht)
        await P.screenshot(path=f'{OUT}/fair_history.png')
        await P.get_by_role('button', name='Me', exact=True).click(); await P.wait_for_timeout(400)
        check('...and their stats leave it out', '1\nrounds' in await P.inner_text('body'))
        await fc.flushed(P, 1800)
        check("...and so does the card friends see", (cloud.docs.get('profiles/u_p', {}).get('stats') or {}).get('all', {}).get('rounds') == 1)
        await box.get_by_role('button', name='Undo').click(); await A.wait_for_timeout(400)
        check('Undo puts it back to check', 'voids/S-u_p-r1' not in cloud.docs and 'Fair play (1 to check)' in await box.inner_text())
        await box.get_by_role('button', name='Fine').click(); await A.wait_for_timeout(400)
        check('Fine clears the flag (and the round keeps counting)', cloud.docs.get('voids/S-u_p-r1', {}).get('status') == 'ok' and 'Fair play (0 to check)' in await box.inner_text())
        # timing and raises are recorded in real use
        await P.get_by_role('button', name='Raise handicap').click(); await P.get_by_role('button', name='Raise handicap').click(); await P.wait_for_timeout(200)
        await P.get_by_role('button', name='Home', exact=True).click(); await P.get_by_role('button', name='Start a round').click(); await P.wait_for_timeout(300)
        await P.evaluate('scrollTo(0, document.body.scrollHeight)'); await P.get_by_role('button', name='Tee off').click(); await P.wait_for_timeout(400)
        await P.get_by_role('button', name='You plus one').click(); await fc.flushed(P, 1500)
        now = json.loads((cloud.docs.get('users/u_p/state/now') or {}).get('json') or '{}')
        rd = now.get('round') or {}
        check('A round records when it started and when each hole was scored', isinstance(rd.get('startedAt'), (int, float)) and isinstance((rd.get('holeAt') or [None])[0], (int, float)) and rd['holeAt'][1] is None, str({k: rd.get(k) for k in ('startedAt', 'holeAt')})[:200])
        me = json.loads(cloud.user('u_p')['people'])['me']
        check('Raising a handicap by hand is remembered (quick taps count once)', len(me.get('raises') or []) == 4 and me['raises'][-1]['from'] == 14.2 and me['raises'][-1]['to'] == 14.4, str(me.get('raises'))[-160:])
        print('page errors:', P.errs + A.errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
