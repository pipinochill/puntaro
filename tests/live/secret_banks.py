"""Three phones (host Pierre, Sam, Priya; Jake has no phone) play live in 'everyone scores' mode.
The fake backend enforces rules.py (a mirror of firestore.rules). Each 'attack' calls the backend
directly from a phone, the way someone with developer tools could."""
import asyncio, copy, json, sys
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules

SRC, OUT = sys.argv[1], sys.argv[2]
import fakecloud as fc
cloud = fc.Cloud(rules)
UIDS = {'Pierre': 'u_pierre', 'Sam': 'u_sam', 'Priya': 'u_priya', 'Stranger': 'u_stranger'}
for n, u in UIDS.items(): cloud.seed(u, fc.profile(n))
class _Rounds:  # DB[code] -> the live round in the stand-in cloud
    def __getitem__(self, code): return cloud.docs[f'rounds/{code}']
    def __contains__(self, code): return f'rounds/{code}' in cloud.docs
    def __iter__(self): return iter([k.split('/')[1] for k in cloud.docs if k.startswith('rounds/') and k.count('/') == 1])
    def get(self, code, default=None): return cloud.docs.get(f'rounds/{code}', default)
class _Banks:
    def __getitem__(self, code): return cloud.banks(code)
DB, BANKS = _Rounds(), _Banks()
results = []

def check(name, ok, detail=''):
    ok = bool(ok); results.append((name, ok)); print(('PASS ' if ok else 'FAIL ') + name + (f'  [{detail}]' if detail and not ok else ''))

async def phone(b, name):
    pg = await cloud.phone(b, UIDS[name])
    await fc.open_app(pg, SRC)
    return pg, pg.errs

def state(name):
    return cloud.now_state(UIDS[name])

async def api(pg, js):
    """Run a raw backend call from the phone's console. Returns 'ok' or the error."""
    return await pg.evaluate(f"(async()=>{{try{{const b=window.__puntaroLiveBackend;const r=await ({js});return 'ok:'+JSON.stringify(r)}}catch(e){{return 'denied'}}}})()")

async def settle(*pgs, ms=900):
    await asyncio.sleep(ms / 1000)

async def chip_texts(pg):
    return await pg.evaluate("[...document.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(t=>/^(Bank after hole|Banking after hole|Call hidden|Bank locked|Banked\\. Locked)$/.test(t))")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        A, ea = await phone(b, 'Pierre'); B, eb = await phone(b, 'Sam'); C, ec = await phone(b, 'Priya')
        uidA = await A.evaluate('window.__puntaroLiveBackend.uid')

        # ---- host starts a live round
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
        if await A.get_by_role('button', name='Start a new round').count(): await A.get_by_role('button', name='Start a new round').click(); await A.wait_for_timeout(300)
        await A.get_by_role('switch').last.click(); await A.get_by_label('Your name for the group').fill('Pierre')
        await A.get_by_role('button', name='Tee off live').click(); await A.wait_for_timeout(900)
        code = list(DB)[0]
        svg = await A.locator('svg[aria-label^="QR code"]').count()
        check('Host sees a QR code on the live sheet', svg == 1)
        await A.screenshot(path=f'{OUT}/s_qr.png')
        await A.get_by_role('button', name='Close').first.click()

        # ---- Sam joins by the link the QR encodes; Priya joins by typing the code
        await B.goto(SRC + f'?join={code}'); await B.wait_for_timeout(700)
        for _ in range(3):
            if await B.locator('.splash').count(): await B.locator('.splash').dispatch_event('pointerdown'); await B.wait_for_timeout(400)
        await B.wait_for_timeout(600)
        await B.get_by_role('button', name='Sam').first.click(); await B.wait_for_timeout(700)
        check('Joining via the QR link opens straight to "Which one are you?"', DB[code]['claims'].get('sam') is not None)
        await C.get_by_role('button', name='Join a live round').click()
        await C.get_by_label('Join code').fill(code); await C.get_by_role('button', name='Find').click(); await C.wait_for_timeout(500)
        await C.get_by_role('button', name='Priya').first.click(); await C.wait_for_timeout(700)

        # ---- hole 1 scores
        for pg, who in ((A, 'Pierre'), (B, 'Sam'), (C, 'Priya')):
            await pg.get_by_role('button', name=f'{who} plus one').click(); await pg.wait_for_timeout(120)
        await A.get_by_role('button', name='Jake plus one').click()
        await settle(A, B, C)

        # ---- Sam banks secretly on hole 1
        btn = B.get_by_role('button', name='Bank after hole').first
        await btn.click(); await B.wait_for_timeout(1700)
        check('Sam\'s bank call is stored as a secret (not in the shared round)', 'sam_0' in BANKS[code] and not (DB[code].get('bk') or {}))
        await settle(A, B, C)
        ct = await chip_texts(C)
        check('Priya sees Pierre\'s and Sam\'s calls as hidden, Jake\'s (no phone) as open', ct == ['Call hidden', 'Call hidden', 'Bank after hole', 'Bank after hole'], str(ct))
        await C.screenshot(path=f'{OUT}/s_hidden_priya.png', full_page=True)

        r = await api(C, f"b.getBank('{code}','sam',0)")
        check('ATTACK Priya reads Sam\'s secret before the reveal: blocked', r == 'denied', r)
        r = await api(C, f"b.putBank('{code}','sam',0,false)")
        check('ATTACK Priya overwrites Sam\'s call: blocked', r == 'denied', r)
        r = await api(C, f"b.update('{code}',[[['bk','sam','0'],false]])")
        check('ATTACK Priya writes a bank into the shared round: blocked', r == 'denied', r)
        r = await api(A, f"b.update('{code}',[[['bk','priya','0'],true]])")
        check('ATTACK host injects a bank in "everyone scores": blocked', r == 'denied', r)
        r = await api(B, f"b.getBank('{code}','sam',0)")
        check('Sam can read his own call', r == 'ok:true', r)

        # ---- Sam moves on: his call locks
        await B.get_by_role('button', name='Go to hole 2').click(); await B.wait_for_timeout(500)
        check('Moving to hole 2 records Sam has moved on', DB[code].get('at', {}).get('sam') == 1)
        r = await api(B, f"b.putBank('{code}','sam',0,false)")
        check('ATTACK Sam changes his hole 1 call after moving on: blocked', r == 'denied', r)
        r = await api(B, f"b.update('{code}',[[['at','sam'],0],[['who'],'sam']])")
        check('ATTACK Sam moves himself back to unlock it: blocked', r == 'denied', r)
        r = await api(B, f"b.update('{code}',[[['at','priya'],5],[['who'],'priya']])")
        check('ATTACK Sam pushes Priya forward to lock her out: blocked', r == 'denied', r)
        r = await api(B, f"b.update('{code}',[[['at','priya'],5],[['who'],'sam']])")
        check('ATTACK Sam pushes Priya forward (posing as himself): blocked', r == 'denied', r)

        # ---- Pierre moves on; Priya hasn't, so nothing is revealed yet
        await A.get_by_role('button', name='Go to hole 2').click(); await settle(A, B, C)
        r = await api(A, f"b.getBank('{code}','sam',0)")
        check('Host still can\'t see Sam\'s call while Priya is on hole 1', r == 'denied', r)
        r = await api(C, f"b.getBank('{code}','sam',0)")
        check('Priya (still deciding) still can\'t see it either', r == 'denied', r)

        # ---- Priya banks too, then moves on: everything is revealed
        await C.get_by_role('button', name='Bank after hole').first.click(); await C.wait_for_timeout(1700)
        await C.get_by_role('button', name='Go to hole 2').click(); await settle(A, B, C, ms=1500)
        r = await api(A, f"b.getBank('{code}','sam',0)")
        check('Once everyone has moved on, the calls are revealed', r == 'ok:true', r)
        await fc.flushed(A)
        sam_banked_on_A = state('Pierre')['round']['bank']['sam'][0]
        pri_banked_on_B = state('Sam')['round']['bank']['priya'][0]
        check('Every phone now applies the revealed calls to the scores', sam_banked_on_A is True and pri_banked_on_B is True, f'{sam_banked_on_A} {pri_banked_on_B}')
        r = await api(C, f"b.putBank('{code}','priya',0,false)")
        check('ATTACK Priya changes her call after the reveal: blocked', r == 'denied', r)

        # ---- Jake has no phone: anyone may make his call, until the reveal
        r = await api(A, f"b.putBank('{code}','jake',1,true)")
        check('Pierre makes a call for Jake (no phone) on hole 2', r.startswith('ok'), r)
        r = await api(B, f"b.getBank('{code}','jake',1)")
        check('ATTACK Sam peeks at Jake\'s hole 2 call early: blocked', r == 'denied', r)
        for pg in (A, B, C): await pg.get_by_role('button', name='Go to hole 3').click(); await pg.wait_for_timeout(200)
        await settle(A, B, C)
        r = await api(B, f"b.getBank('{code}','jake',1)")
        check('Jake\'s call is revealed with everyone else\'s', r == 'ok:true', r)
        r = await api(C, f"b.putBank('{code}','jake',1,false)")
        check('ATTACK Priya flips Jake\'s call after the reveal: blocked', r == 'denied', r)

        # ---- seats
        r = await api(C, f"b.update('{code}',[[['claims','jake'],b.uid],[['who'],'jake']])")
        check('ATTACK Priya grabs a second seat (Jake): blocked', r == 'denied', r)
        r = await api(C, f"b.update('{code}',[[['claims','sam'],b.uid],[['who'],'sam']])")
        check('ATTACK Priya steals Sam\'s seat: blocked', r == 'denied', r)
        r = await api(C, f"b.update('{code}',[[['claims','sam'],{{__delete:true}}]])")
        check('ATTACK Priya kicks Sam out of his seat: blocked', r == 'denied', r)

        # ---- scores and edits
        r = await api(C, f"b.update('{code}',[[['s','sam','0'],9],[['by','sam_0'],'priya'],[['ed','sam_0'],'priya']])")
        check('Priya can fix Sam\'s score (gap fill), and it is marked', r.startswith('ok') and DB[code]['ed'].get('sam_0') == 'priya', r)
        r = await api(C, f"b.update('{code}',[[['ed'],{{}}]])")
        check('ATTACK Priya wipes the "edited" marks: blocked', r == 'denied', r)

        # ---- card hole 4: dealt only after the hole 3 calls are revealed
        await A.get_by_role('button', name='Nobody').first.click(); await settle(A, B, C)
        await B.get_by_role('button', name='Go to hole 4').click(); await B.wait_for_timeout(400)
        await B.get_by_role('button', name='Draw the cards').click(); await settle(A, B, C)
        check('Sam has moved to the card hole', DB[code]['at'].get('sam') == 3)
        check('Cards for hole 4 wait until everyone has moved on', DB[code].get('draws', {}).get('3') is None)
        notice = await B.get_by_text('cards coming').count()
        check('Sam sees a "cards coming" notice meanwhile', notice >= 1)
        await B.screenshot(path=f'{OUT}/s_cards_coming.png')
        r = await api(C, f"b.setIfAbsent('{code}',['draws','3'],{{me:'tax',sam:'tax',priya:'life',jake:'tax'}},[[['deal'],3]])")
        check('ATTACK Priya deals herself a blessing before the reveal: blocked', r == 'denied' and DB[code].get('draws', {}).get('3') is None, r)
        # Worst case: a rigged deal lands in storage anyway (say it won a race with the honest phones).
        rigged = {'me': 'tax', 'sam': 'tax', 'priya': 'life', 'jake': 'tax'}
        DB[code].setdefault('draws', {})['3'] = rigged
        for pg in (A, C):
            await pg.get_by_role('button', name='Go to hole 4').click(); await pg.wait_for_timeout(400)
            await pg.get_by_role('button', name='Draw the cards').click(); await pg.wait_for_timeout(300)
        await settle(A, B, C, ms=1500)
        seen = []
        await fc.flushed(A)
        for n in ('Pierre', 'Sam', 'Priya'):
            seen.append(state(n)['round']['draws'][3])
        same = all(json.dumps(x, sort_keys=True) == json.dumps(seen[0], sort_keys=True) for x in seen)
        check('ATTACK rigged deal in storage: every phone ignores it and deals fairly', same and seen[0] != rigged, json.dumps(seen))
        for nm, pg in (('A', A), ('B', B), ('C', C)):
            print('DEBUG', nm, await pg.evaluate("[...document.querySelectorAll('[role=status]')].map(e=>e.textContent).join(' | ')"), DB[code].get('at'))
        warned = await A.get_by_text("didn't match the shuffle").count() + await B.get_by_text("didn't match the shuffle").count()
        check('Players are told the cards were re-dealt fairly', warned >= 1)
        r = await api(C, f"b.update('{code}',[[['draws','3'],{{priya:'life'}}],[['deal'],3]])")
        check('ATTACK Priya re-deals the cards: blocked', r == 'denied', r)

        # close any card-reveal sheets
        for pg in (A, B, C):
            await pg.keyboard.press('Escape')
            for _ in range(3):
                if await pg.locator('[role=dialog]').count():
                    btns = pg.locator('[role=dialog] button')
                    await btns.last.click(); await pg.wait_for_timeout(300)
        # ---- strangers and setup
        D, ed = await phone(b, 'Stranger')
        r = await api(D, f"b.update('{code}',[[['s','me','4'],1]])")
        check('ATTACK a stranger with the code edits scores: blocked', r == 'denied', r)
        r = await api(C, f"b.update('{code}',[[['base','stake'],0]])")
        check('ATTACK Priya changes the buy-in: blocked', r == 'denied', r)
        r = await api(C, f"b.update('{code}',[[['scoring'],'one']])")
        check('ATTACK Priya switches the scoring mode: blocked', r == 'denied', r)

        # ---- host frees a seat when a phone dies
        r = await api(C, f"b.update('{code}',[[['claims','sam'],{{__delete:true}}]])")
        await A.get_by_role('button', name='Live round details').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Free seat').first.click(); await settle(A, B, C)
        check('Host can free a seat', 'sam' not in DB[code]['claims'])
        await A.get_by_role('button', name='Close').first.click()

        # ---- host switches to one scorer: everyone told, others read-only
        await A.get_by_role('button', name='Live round details').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='One scorer').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Close').first.click(); await settle(A, B, C, ms=700)
        told = await C.get_by_text('switched to one scorer').count()
        check('Everyone is told when the host switches mode', told >= 1)
        r = await api(C, f"b.putBank('{code}','priya',5,true)")
        check('In one-scorer mode Priya can\'t bank for herself', r == 'denied', r)
        r = await api(C, f"b.update('{code}',[[['s','priya','5'],3]])")
        check('In one-scorer mode Priya can\'t enter scores', r == 'denied', r)
        await C.screenshot(path=f'{OUT}/s_after_switch.png')

        print('page errors:', ea + eb + ec + ed)
        passed = sum(1 for _, o in results if o); print(f'\n{passed}/{len(results)} passed')
        await b.close()

asyncio.run(main())
