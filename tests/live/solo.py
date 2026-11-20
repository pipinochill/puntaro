"""Solo rounds: scoring with the shot questions, the round report, My game trends, and keeping solo rounds out of Puntaro stats."""
import asyncio, base64, json, re, sys, time
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
cloud = fc.Cloud(rules); UID = 'u_solo'
PARS = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 5, 4, 4, 3, 4, 5, 4]
SIS = [7, 11, 15, 1, 5, 13, 17, 3, 9, 8, 16, 2, 6, 12, 18, 4, 10, 14]

def old_round(k, putts3):
    """An earlier solo round on the same course: misses right, long approaches miss, three-putts from long range."""
    h = []
    for i, par in enumerate(PARS):
        three = i % putts3 == 0
        h.append({'s': par + (2 if i % 4 == 0 else 1), 'tee': None if par == 3 else ('R' if i % 2 else 'F'), 'ap': 3 if i % 2 else 1,
                  'gr': i % 2 == 0 and i % 4 != 0, 'p': 3 if three else 2, 'fp': 4 if three else 1})
    at = int(time.time() * 1000) - (10 - k) * 86400000
    s = {'id': f's{k}', 'at': at, 'course': {'name': 'Pebble Hollow', 'tee': 'White', 'slope': 113, 'rating': 72, 'par': 72},
         'holes': [{'par': p, 'si': SIS[i]} for i, p in enumerate(PARS)], 'hi': 18, 'ch': 18, 'hole': 17, 'h': h}
    gross = sum(x['s'] for x in h)
    return {'id': s['id'], 'at': at, 'course': 'Pebble Hollow', 'gross': gross, 'net': gross - 18, 'note': 'Solo round', 'solo': json.dumps(s), 'hidden': False, 'witnessed': False}

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); cloud.seed(UID, fc.profile('Pierre', hi=18))
        A = await cloud.phone(b, UID); await fc.open_app(A, URL)
        # ---- nothing yet
        check('Home offers Solo round and My game', await A.get_by_role('button', name='Solo round').count() == 1 and await A.get_by_role('button', name='My game').count() == 1)
        await A.get_by_role('button', name='My game').click(); await A.wait_for_timeout(300)
        check('My game with no rounds explains itself and offers a solo round', await A.get_by_text('Find out where your shots go').count() == 1 and await A.get_by_role('button', name='Start a solo round').count() == 1)
        await A.screenshot(path=f'{OUT}/solo_empty.png')
        await A.get_by_role('button', name='Start a solo round').click(); await A.wait_for_timeout(300)
        check('Solo setup: just the course, no players, games or prize pool', await A.get_by_text('Just you, playing off').count() == 1 and await A.get_by_text('Prize pool').count() == 0 and await A.get_by_text('Players').count() == 0)
        await A.get_by_role('button', name='Tee off solo').click(); await A.wait_for_timeout(400)
        solo = A.locator('[data-solo]')
        check('Scoring opens on hole 1 with the questions waiting for a score', await solo.count() == 1 and (await A.locator('.holeno').inner_text()) == '1' and await A.get_by_role('button', name='Fairway').is_disabled())

        async def hole(i, over, tee=None, ap=None, gr=None, putts=None, fp=None, nxt=True):
            await A.get_by_role('button', name='One more').click()
            for _ in range(abs(over)): await A.get_by_role('button', name='One more' if over > 0 else 'One less').click()
            for name in (tee, ap, gr, fp):
                if name: await A.get_by_role('button', name=name, exact=True).click()
            if putts is not None: await A.get_by_role('group', name='Putts').get_by_role('button', name=putts, exact=True).click()
            if nxt and i < 17: await A.get_by_role('button', name='Next hole', exact=True).click()
            await A.wait_for_timeout(40)

        # hole 1: par, fairway, 100-150, green, 2 putts from 3-6 m
        await hole(0, 0, 'Fairway', '100–150', 'Hit the green', '2', '3–6 m', nxt=False); await A.wait_for_timeout(150)
        run = await A.locator('[data-solo-run]').inner_text()
        check('Running score bar: E thru 1', 'E thru 1' in run and '4 strokes · 3 pts' in run, run)
        await A.locator('[data-solo-run]').click(); await A.wait_for_timeout(250)
        sf = A.get_by_role('dialog', name='My round so far'); sft = await sf.inner_text() if await sf.count() else ''
        check('Tapping the score bar opens Round so far: card, strokes gained, stats', 'E thru 1 · 4 strokes · 3 pts' in sft and await sf.locator('[data-solo-card]').count() == 1 and (await sf.locator('[data-sofar="fw"]').inner_text()).startswith('1/1') and (await sf.locator('[data-sofar="putts"]').inner_text()).startswith('2'), sft[:200])
        check('...what you need to play to handicap, and no "usual" claim on a first round', 'you need 33 more points from the last 17 holes' in sft and await sf.locator('[data-nousual]').count() == 1, sft[-260:])
        await A.screenshot(path=f'{OUT}/solo_sofar.png')
        await sf.get_by_role('button', name='Close').click(); await A.wait_for_timeout(150)
        check('The hole shows your handicap stroke and net par', 'You get 1 stroke: net par is 5' in await A.locator('[data-solo-strokes]').inner_text(), await A.locator('[data-solo-strokes]').inner_text())
        check('Score is named with its Stableford points (PAR · 3 pts)', 'PAR · 3 pts' in await A.locator('[data-solo-score]').inner_text(), await A.locator('[data-solo-score]').inner_text())
        await A.get_by_role('button', name='Fairway').click(); await A.wait_for_timeout(80)
        check('Tapping an answer again clears it', await A.get_by_role('button', name='Fairway').get_attribute('aria-pressed') == 'false')
        await A.get_by_role('button', name='Fairway').click()
        await A.screenshot(path=f'{OUT}/solo_hole.png', full_page=True)
        await A.get_by_role('button', name='Next hole', exact=True).click(); await A.wait_for_timeout(150)
        # hole 2 right, then reload mid-round
        await hole(1, 1, 'Right', '150–200', 'Missed the green', '2', '1–3 m')
        await A.wait_for_timeout(1600)
        st = json.loads(cloud.docs[f'users/{UID}/state/now']['json'])
        check('The round in progress is saved to the account', st.get('solo') and st['solo']['h'][1]['tee'] == 'R' and st['solo']['h'][0]['s'] == 4, str(st.get('solo'))[:120])
        await fc.open_app(A, URL)
        card = A.locator('[data-solo-progress]')
        check('After reopening, Home shows the solo round in progress', await card.count() == 1 and '+1 thru 2' in await card.inner_text(), await card.inner_text() if await card.count() else '')
        await A.get_by_role('button', name='Resume solo round').click(); await A.wait_for_timeout(300)
        check('...and resumes on hole 3, a par 3 with no tee shot question', (await A.locator('.holeno').inner_text()) == '3' and await A.get_by_role('group', name='Tee shot').count() == 0 and await A.get_by_text('Tee shot from (metres)').count() == 1)
        # pick up and penalties on hole 3 (par 3, index 15, playing off 21: one stroke, so P counts as 3 + 2 + 1 = 6)
        await A.get_by_role('button', name='Pick up').click(); await A.wait_for_timeout(150)
        check('P picks the hole up as a net double bogey and hides the shot questions', 'Picked up: counts as 6 · 0 pts' in await A.locator('[data-solo-score]').inner_text() and await A.get_by_role('group', name='Putts').count() == 0 and '+4 thru 3' in await A.locator('[data-solo-run]').inner_text(), await A.locator('[data-solo-score]').inner_text() + await A.locator('[data-solo-run]').inner_text())
        await A.get_by_role('group', name='Penalty shots').get_by_role('button', name='2', exact=True).click(); await A.wait_for_timeout(100)
        await A.wait_for_timeout(1600)
        h3 = json.loads(cloud.docs[f'users/{UID}/state/now']['json'])['solo']['h'][2]
        check('Pick-up and penalty shots are saved with the hole', h3.get('pu') is True and h3.get('pen') == 2 and h3.get('s') == 6, str(h3))
        await A.get_by_role('button', name='Pick up').click(); await A.wait_for_timeout(100)
        check('Tapping P again clears the hole', 'Tap +' in await A.locator('[data-solo-score]').inner_text())
        # hold the card on Home to delete the round, then restore it
        await A.get_by_role('button', name='Back').click(); await A.wait_for_timeout(300)
        box = await A.locator('[data-solo-progress]').bounding_box()
        await A.mouse.move(box['x'] + 60, box['y'] + 20); await A.mouse.down(); await A.wait_for_timeout(800); await A.mouse.up(); await A.wait_for_timeout(300)
        dlg = A.get_by_role('dialog', name='Delete round')
        check('Holding the solo card on Home asks to delete it', await dlg.count() == 1 and 'solo round in progress' in await dlg.inner_text())
        await dlg.get_by_role('button', name='Delete round').click(); await A.wait_for_timeout(300)
        check('Deleted: Home goes back to the Solo round button, with the round under Recently deleted', await A.locator('[data-solo-progress]').count() == 0 and await A.get_by_text('Solo round, in progress').count() == 1)
        await A.get_by_role('button', name='Restore').click(); await A.wait_for_timeout(300)
        await A.wait_for_timeout(1600); saved_solo = json.loads(cloud.docs[f'users/{UID}/state/now']['json']).get('solo')
        check('Restore brings it back with its scores', await A.locator('[data-solo-progress]').count() == 1 and 'thru 2' in await A.locator('[data-solo-progress]').inner_text())
        # delete it again, hold the deleted row to get rid of it now, then check it's really gone (and restore path untouched before)
        box = await A.locator('[data-solo-progress]').bounding_box()
        await A.mouse.move(box['x'] + 60, box['y'] + 20); await A.mouse.down(); await A.wait_for_timeout(800); await A.mouse.up(); await A.wait_for_timeout(300)
        await A.get_by_role('dialog', name='Delete round').get_by_role('button', name='Delete round').click(); await A.wait_for_timeout(300)
        kept = json.loads(cloud.docs[f'users/{UID}/state/now']['json']) if f'users/{UID}/state/now' in cloud.docs else {}
        row = A.get_by_text('Solo round, in progress').locator('xpath=ancestor::div[1]/..')
        rb = await A.get_by_text('Solo round, in progress').bounding_box()
        await A.mouse.move(rb['x'] + 20, rb['y'] + 5); await A.mouse.down(); await A.wait_for_timeout(800); await A.mouse.up(); await A.wait_for_timeout(300)
        dlg = A.get_by_role('dialog', name='Delete round')
        check('Holding a deleted round offers to delete it for good now', await dlg.count() == 1 and 'skips the countdown' in await dlg.inner_text(), await dlg.inner_text() if await dlg.count() else '')
        await A.get_by_role('button', name='Keep the countdown').click(); await A.wait_for_timeout(200)
        check('...Keep the countdown leaves it there', await A.get_by_text('Solo round, in progress').count() == 1)
        await A.mouse.move(rb['x'] + 20, rb['y'] + 5); await A.mouse.down(); await A.wait_for_timeout(800); await A.mouse.up(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Delete for good').click(); await A.wait_for_timeout(300)
        check('...Delete for good removes it straight away', await A.get_by_text('Solo round, in progress').count() == 0 and await A.get_by_text('Recently deleted').count() == 0)
        # carry on with a fresh copy of the same round (put back from the saved state)
        st = json.loads(cloud.docs[f'users/{UID}/state/now']['json']); st['solo'] = saved_solo; cloud.docs[f'users/{UID}/state/now']['json'] = json.dumps(st)
        await fc.open_app(A, URL)
        await A.get_by_role('button', name='Resume solo round').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Go to hole 3').click(); await A.wait_for_timeout(150)
        # holes 3-18: a slicer who three-putts from long range
        await A.get_by_role('button', name='One more').click(); await A.get_by_role('group', name='Penalty shots').get_by_role('button', name='1', exact=True).click(); await A.get_by_role('button', name='One less').click()
        await hole(2, 1, None, '100–150', 'Missed the green', '2', '1–3 m')
        await hole(3, 1, 'Right', '50–100', 'Hit the green', '3+', '10 m+')
        await hole(4, 2, 'Right', '150–200', 'Missed the green', '2', '3–6 m', nxt=False); await A.wait_for_timeout(100)
        await A.get_by_role('button', name='Next hole', exact=True).click(); await A.wait_for_timeout(150)
        note = A.locator('[data-caddie]')
        check('Caddie note on the next tee: three misses the same way', await note.count() == 1 and 'right' in await note.inner_text(), await note.inner_text() if await note.count() else 'none')
        await A.screenshot(path=f'{OUT}/solo_caddie.png')
        plan = [(5, 0, 'Fairway', '50–100', 'Hit the green', '2', '3–6 m'), (6, 0, None, '100–150', 'Hit the green', '2', '1–3 m'), (7, 1, 'Trouble', '150–200', 'Missed the green', '2', '1–3 m'),
                (8, 1, 'Fairway', '50–100', 'Hit the green', '3+', '10 m+'), (9, 0, 'Fairway', '100–150', 'Hit the green', '2', '3–6 m'), (10, 1, None, '150–200', 'Missed the green', '2', '1–3 m'),
                (11, 0, 'Left', '50–100', 'Hit the green', '2', '6–10 m'), (12, 2, 'Right', '150–200', 'Missed the green', '3+', '6–10 m'), (13, -1, 'Fairway', '50–100', 'Hit the green', '1', '1–3 m'),
                (14, 0, None, '100–150', 'Hit the green', '2', '3–6 m'), (15, 1, 'Right', '150–200', 'Missed the green', '2', '1–3 m'), (16, 0, 'Fairway', 'Under 50', 'Hit the green', '2', '3–6 m'),
                (17, 3, 'Trouble', '200+', 'Missed the green', '2', '3–6 m')]
        seen_birdie = [False]
        for i, over, tee, ap, gr, putts, fp in plan:
            await hole(i, over, tee, ap, gr, putts, fp)
            if i == 13:
                await A.wait_for_timeout(250); m = A.locator('.moment')
                seen_birdie[0] = await m.count() == 1 and 'BIRDIE!' in await m.inner_text()
                await A.screenshot(path=f'{OUT}/solo_birdie.png')
                if await m.count(): await m.click(); await A.wait_for_timeout(200)
                check('...and the next hole opens at the top of the page', await A.evaluate('window.scrollY') == 0 and (await A.locator('.holeno').inner_text()) == '15')
        await A.wait_for_timeout(200)
        check('Leaving hole 14 after a birdie played the BIRDIE! screen', seen_birdie[0])
        gross = sum(PARS) + 0 + 1 + 1 + 1 + 2 + sum(x[1] for x in plan)
        check('All 18 in: the bar shows the total', f'thru 18' in await A.locator('[data-solo-run]').inner_text() and f'{gross} strokes' in await A.locator('[data-solo-run]').inner_text(), await A.locator('[data-solo-run]').inner_text())
        await A.get_by_role('button', name='Finish round').click(); await A.wait_for_timeout(200)
        check('Finish asks first, with a way to discard', await A.get_by_role('dialog', name='Finish solo round').count() == 1 and await A.get_by_role('button', name='Discard this round').count() == 1)
        await A.get_by_role('button', name='Finish and see my report').click(); await A.wait_for_timeout(900)

        # ---- report
        rep = A.locator('[data-solo-report]'); txt = await rep.inner_text()
        check('Round report opens with the score', await rep.count() == 1 and (await rep.locator('[data-gross]').inner_text()) == str(gross), txt[:80])
        check('Stableford points on the report (85 off 21 is 44)', (await rep.locator('[data-pts]').inner_text()) == '44 pts', await rep.locator('[data-pts]').inner_text())
        check('Notes: beat the handicap, and the closest par 3 tee shot', 'beat your handicap by 8' in txt and 'Closest on a par 3: hole 7, inside 3 m' in txt, txt[300:900])
        sg = {c: await rep.locator(f'[data-sg="{c}"]').inner_text() for c in ('tee', 'app', 'short', 'putt', 'total')}
        check('Strokes gained for all four parts and a total', all(re.fullmatch(r'[+−]?\d+\.\d', v) for v in sg.values()), str(sg))
        num = lambda v: float(v.replace('−', '-'))
        check('...and the four parts add up to the total', abs(sum(num(sg[c]) for c in ('tee', 'app', 'short', 'putt')) - num(sg['total'])) <= 0.25, str(sg))
        check('Stats: fairways 6/14, putts, greens in regulation, up and downs', (await rep.locator('[data-stat="fw"]').inner_text()).startswith('6/14') and (await rep.locator('[data-stat="putts"]').inner_text()).startswith('38'), await rep.locator('[data-stat="fw"]').inner_text() + await rep.locator('[data-stat="putts"]').inner_text())
        check('Penalty shots and pick-ups are on the report', (await rep.locator('[data-stat="pen"]').inner_text()).startswith('1') and (await rep.locator('[data-stat="pu"]').inner_text()).startswith('0'))
        notes = await rep.locator('[data-notes] [data-note]').count()
        check('The report points things out about the round', notes >= 3 and 'went right' in txt, f'{notes} notes')
        check('It says solo rounds don\'t count for seasons or handicap', "don't count for seasons" in txt)
        check('No undefined or NaN anywhere', not re.search(r'undefined|NaN', txt))
        await A.screenshot(path=f'{OUT}/solo_report.png', full_page=True)
        await rep.locator('[data-share]').click(); await A.wait_for_timeout(2500)
        img = A.get_by_role('dialog', name='Share my round').locator('img')
        alt = (await img.get_attribute('alt')) if await img.count() else ''
        check('Share my round makes a picture headed by the score and points', await img.count() == 1 and f'{gross} · 44 PTS' in alt, alt)
        src = await img.get_attribute('src') or ''
        open(f'{OUT}/solo_card.png', 'wb').write(base64.b64decode(src.split(',', 1)[1]))
        size = await A.evaluate("s => new Promise(r => { const i = new Image(); i.onload = () => r([i.width, i.height]); i.src = s; })", src)
        check('...sized for phones and chats, with a way to save it', size == [1080, 1350] and await A.get_by_role('link', name='Save image').count() + await A.get_by_role('button', name='Share my round').count() >= 1, str(size))
        await A.get_by_role('dialog', name='Share my round').get_by_role('button', name='Close').click(); await A.wait_for_timeout(200)
        before = sg['total']
        await rep.get_by_role('button', name='Scratch').click(); await A.wait_for_timeout(200)
        check('Compare with scratch: the same round loses many more shots', num(await rep.locator('[data-sg="total"]').inner_text()) < num(before) - 10)
        rec = [v for k, v in cloud.docs.items() if k.startswith(f'users/{UID}/rounds/')]
        check('Saved to the account as a solo round', len(rec) == 1 and rec[0].get('solo') and rec[0]['gross'] == gross and rec[0]['note'] == 'Solo round' and not rec[0].get('round'))
        await A.wait_for_timeout(1500)
        check('The round in progress is cleared from the account', not json.loads(cloud.docs[f'users/{UID}/state/now']['json']).get('solo'))
        sw = await A.evaluate('document.documentElement.scrollWidth'); check('Report fits a phone screen', sw <= 392, str(sw))

        # ---- My game after one round
        await rep.get_by_role('button', name='See my game and trends').click(); await A.wait_for_timeout(400)
        game = A.locator('[data-mygame]'); gt = await game.inner_text()
        n1 = await game.locator('[data-note]').count()
        check('My game after one round already has several trends', n1 >= 4, f'{n1}')
        check('...including the one-sided miss', 'Your miss is right' in gt, gt[:200])
        p3 = await game.locator('[data-par3]').inner_text() if await game.locator('[data-par3]').count() else ''
        check('Par 3 card: greens hit and the closest tee shot', '2/4' in p3 and 'Closest: 1–3 m, hole 7 at Pebble Hollow' in p3, p3)
        check('Points in My game', '(44.0 pts)' in gt and 'Stableford points a round' in gt)
        check('...and tables for greens by distance and putting', await game.locator('[data-ap]').count() == 1 and await game.locator('[data-fp]').count() == 1 and await game.locator('[data-like]').count() == 1)
        await A.screenshot(path=f'{OUT}/solo_game1.png', full_page=True)

        # ---- with a history: trends over time
        for k in range(1, 6): cloud.docs[f'users/{UID}/rounds/s{k}'] = old_round(k, 3 if k <= 3 else 9)
        await fc.open_app(A, URL)
        check('Home is back to the Solo round button once the round is finished', await A.locator('[data-solo-progress]').count() == 0)
        await A.get_by_role('button', name='My game').click(); await A.wait_for_timeout(500)
        gt = await game.inner_text(); n6 = await game.locator('[data-note]').count()
        check('With six rounds there are plenty of trends', n6 >= 8, f'{n6}')
        check('Grouped into what\'s costing you, what\'s going well and worth knowing', await game.locator('[data-group]').count() >= 2)
        check('Trends over time show up (getting better / slipped / scores)', re.search(r'getting better|has slipped|Scores (are coming down|have crept up)', gt), gt[:300])
        check('Before and now table with arrows', 'Last 3 rounds against earlier' in gt and ('▲' in gt or '▼' in gt))
        check('Round list shows all six', await game.get_by_role('button', name=re.compile('Pebble Hollow')).count() == 5 and 'Last' not in (await game.locator('.stripes').inner_text()) or '6 solo rounds' in gt, (await game.locator('.stripes').inner_text()))
        check('No undefined or NaN in My game', not re.search(r'undefined|NaN', gt))
        await A.screenshot(path=f'{OUT}/solo_game6.png', full_page=True)
        sw = await A.evaluate('document.documentElement.scrollWidth'); check('My game fits a phone screen', sw <= 392, str(sw))
        await game.get_by_role('button', name=re.compile('Pebble Hollow')).first.click(); await A.wait_for_timeout(300)
        check('Tapping a round opens its report', await rep.count() == 1)
        await rep.get_by_role('button', name='Back').click(); await A.wait_for_timeout(200)
        check('...and Back returns to My game', await game.count() == 1)
        await game.get_by_role('button', name='Back').click(); await A.wait_for_timeout(200)

        # ---- solo rounds stay out of Puntaro's own stats
        await A.get_by_role('button', name='History').click(); await A.wait_for_timeout(300)
        ht = await A.locator('body').inner_text()
        check('History lists solo rounds, marked as solo', ht.count('Solo round') >= 6 and 'strokes' in ht)
        await A.get_by_text('Pebble Hollow').first.click(); await A.wait_for_timeout(400)
        check('Tapping one in History opens its report', await rep.count() == 1)
        await rep.get_by_role('button', name='Back').click(); await A.wait_for_timeout(200)
        await A.get_by_role('button', name='Me', exact=True).click(); await A.wait_for_timeout(300)
        mt = await A.locator('body').inner_text()
        check('Me tab links to My game with the round count', 'trends from 6 solo rounds' in mt, mt[:200])
        prof = cloud.docs.get(f'profiles/{UID}') or {}
        check('Season stats and the friends card ignore solo rounds', not ((prof.get('stats') or {}).get('all')) and not ((prof.get('stats') or {}).get('recent')), str(prof.get('stats'))[:200])
        check('No handicap change from solo rounds', cloud.docs[f'users/{UID}'].get('hi') == 18 and not cloud.docs[f'users/{UID}'].get('hcpRounds'))
        # ---- a new round with history: tracking against the usual
        await A.get_by_role('button', name='Home', exact=True).click(); await A.wait_for_timeout(250)
        await A.get_by_role('button', name='Solo round Just you').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Tee off solo').click(); await A.wait_for_timeout(400)
        await A.get_by_role('button', name='One more').click(); await A.wait_for_timeout(100)
        await A.locator('[data-solo-run]').click(); await A.wait_for_timeout(250)
        sft = await A.get_by_role('dialog', name='My round so far').inner_text()
        check('With a history, Round so far compares you with your usual at this stage', '1.7 shots better than your usual thru 1' in sft and 'last 6 solo rounds here' in sft, sft[:400])
        await A.screenshot(path=f'{OUT}/solo_sofar_usual.png')
        await A.get_by_role('dialog', name='My round so far').get_by_role('button', name='Close').click()
        check('No page errors', not A.errs, str(A.errs))
        print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
