"""Seasons: Me stats (this season, all time, past seasons, champion badge), the friends ladder, the new-season splash,
and tapping a friend to see their recent rounds."""
import asyncio, json, sys, datetime as dt
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
PAR = [4,4,3,5,4,4,3,4,5, 4,3,5,4,4,3,4,5,4]
def ms(y, m, d): return int(dt.datetime(y, m, d, 9).timestamp() * 1000)
def round_rec(i, at, over, course='Woodlands'):
    ids = ['me', 'sam']
    scores = {'me': [p + over for p in PAR], 'sam': [p + 1 for p in PAR]}
    r = {'playerIds': ids, 'scores': scores, 'bank': {k: [False] * 18 for k in ids}, 'events': {k: {} for k in ids}, 'draws': {}, 'ntp': {},
         'opts': {'cards': False, 'ntp': False, 'bonuses': False, 'penalties': False, 'cushion': False, 'catchup': False}, 'useHcp': False, 'hcp': {'me': 0, 'sam': 0},
         'mode': 'ffa', 'games': ['punt'], 'course': {'name': course, 'par': 72}, 'holes': None, 'stake': 0}
    return {'id': f'r{i}', 'at': at, 'course': course, 'gross': sum(scores['me']), 'net': sum(scores['me']), 'players': {'me': {'pts': 0, 'ntp': 0, 'win': over == 0}, 'sam': {'pts': 0, 'ntp': 0, 'win': over != 0}},
            'note': 'Puntaro round', 'round': json.dumps(r), 'people': '{}', 'hidden': False}
NIC_CARD = {'name': 'Nic W.', 'first': 'Nic', 'li': 'W', 'color': '#7A5232', 'hi': 8.4, 'hk': '', 'ref': '',
            'stats': {'cur': '2026-3', 'season': {'rounds': 4, 'wins': 2, 'ntp': 1, 'pts': 45.0}, 'all': {'rounds': 20, 'wins': 8, 'ntp': 5, 'pts': 42.0},
                      'seasons': {'2026-2': {'rounds': 5, 'wins': 2, 'ntp': 0, 'pts': 40.0}},
                      'recent': [{'at': ms(2026, 10, 20), 'course': 'Woodlands', 'pts': 51, 'place': 1, 'of': 4, 'win': True, 'busts': 0, 'ntp': 1, 'scores': [p for p in PAR], 'pars': PAR},
                                 {'at': ms(2026, 10, 2), 'course': 'Kingston Heath', 'pts': 33, 'place': 3, 'of': 4, 'win': False, 'busts': 2, 'ntp': 0, 'scores': [p + 1 for p in PAR], 'pars': PAR}]}}
cloud = fc.Cloud(rules)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        cloud.seed('u_me', fc.profile('Pierre', last='Bobillier', friends=()))
        recs = [round_rec(1, ms(2026, 10, 5), 1), round_rec(2, ms(2026, 10, 12), 1), round_rec(3, ms(2026, 10, 19), 1),   # Spring: bogeys
                round_rec(4, ms(2026, 7, 1), 0), round_rec(5, ms(2026, 7, 8), 0), round_rec(6, ms(2026, 7, 15), 0), round_rec(7, ms(2026, 8, 2), 0)]  # Winter: pars
        for rc in recs: cloud.docs[f"users/u_me/rounds/{rc['id']}"] = rc
        cloud.seed('u_nic', fc.profile('Nic', last='Walker')); cloud.docs['profiles/u_nic'] = NIC_CARD
        cloud.docs['friends/u_me/list/u_nic'] = {'via': 'request', 'since': 0}; cloud.docs['friends/u_nic/list/u_me'] = {'via': 'request', 'since': 0}
        A = await cloud.phone(b, 'u_me', timezone_id='Australia/Sydney', locale='en-AU', extra_init="try{if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.setItem('puntaro.season','2026-2')}}catch(e){}")
        await fc.open_app(A, URL); await A.wait_for_timeout(3500)
        sp = A.get_by_role('dialog', name='Winter 2026 is over')
        check('A new season opens with last season\'s champion', await sp.count() == 1 and 'WINTER 2026 CHAMPION' in await sp.inner_text() and 'YOU' in await sp.inner_text(), (await sp.inner_text())[:200] if await sp.count() else 'none')
        check('...the final ladder, and Spring 2026 starting', 'FINAL LADDER' in await sp.inner_text() and 'Spring 2026 starts now' in await sp.inner_text())
        await A.screenshot(path=f'{OUT}/season_splash.png')
        await sp.get_by_role('button', name="LET'S GO").click(); await A.wait_for_timeout(300)
        await fc.open_app(A, URL); await A.wait_for_timeout(3200)
        check('...and only once', await A.get_by_role('dialog', name='Winter 2026 is over').count() == 0)
        await A.get_by_role('button', name='Me', exact=True).click(); await A.wait_for_timeout(500)
        body = await A.locator('body').inner_text()
        check('Me wears the champion badge', 'CHAMPION · WINTER 2026' in body)
        check('This season card: Spring 2026 with its rounds and ladder place', 'Spring 2026' in body and 'days left' in body and '2nd' in body and 'of 2 on the ladder' in body, body[:500])
        check('All time card counts every round, with best round and streak', 'All time' in body and 'Best round' in body and 'Longest streak' in body)
        check('Past seasons shows the Winter win', 'WINTER 2026' in body.upper() and '1ST OF 2' in body)
        await A.screenshot(path=f'{OUT}/season_me.png', full_page=True)
        await A.get_by_role('button', name='See the friends ladder ›').click(); await A.wait_for_timeout(500)
        body = await A.locator('body').inner_text()
        check('Friends shows the season and when it ends', 'Spring 2026 · ends 30 Nov' in body, body[:200])
        names = await A.locator('.hd').all_inner_texts()
        check('The ladder ranks by average points: Nic above you', names.index('Nic') < names.index('You') if 'Nic' in names and 'You' in names else False, str(names))
        check("...and names last season's champion", 'Winter 2026 champion: You' in body)
        await A.screenshot(path=f'{OUT}/season_ladder.png', full_page=True)
        await A.get_by_role('button', name='All time').click(); await A.wait_for_timeout(200)
        check('All time switches the ladder', await A.get_by_role('button', name='All time').get_attribute('aria-pressed') == 'true')
        await A.get_by_role('button', name='This season').click(); await A.wait_for_timeout(200)
        await A.get_by_role('button', name='View Nic').click(); await A.wait_for_timeout(400)
        sheet = A.get_by_role('dialog')
        t = await sheet.inner_text()
        check("Tapping a friend shows their season and all-time stats", 'This season (Spring 2026)' in t and 'All time' in t)
        check('...and their recent rounds', 'Recent rounds' in t and 'Woodlands' in t and 'Kingston Heath' in t and '1st of 4' in t, t[:400])
        await sheet.get_by_role('button', name='Kingston Heath', exact=False).click(); await A.wait_for_timeout(200)
        check('Tapping a round shows the detail and hole-by-hole scores', '2 busts' in await sheet.inner_text() and await sheet.locator('[title="Hole 18"]').count() == 1)
        await A.screenshot(path=f'{OUT}/season_friend.png')
        await fc.flushed(A, 1800)
        card = cloud.docs.get('profiles/u_me', {}).get('stats', {})
        check('Your card shares this season, past seasons and recent rounds with friends', card.get('cur') == '2026-3' and (card.get('seasons') or {}).get('2026-2', {}).get('rounds') == 4 and len(card.get('recent') or []) == 7 and len(card['recent'][0]['scores']) == 18, json.dumps(card)[:300])
        print('page errors:', A.errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
