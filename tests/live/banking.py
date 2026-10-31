"""Banking when one person keeps score: standing orders, bank on the row, bank as you score,
players banking from their own phone, and attempts to bank for someone else or too late.
Host Pierre keeps score. Nic joins on his phone to bank. Mitch joins just to watch. Greg has no phone."""
import asyncio, re, sys
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
cloud = fc.Cloud(rules)
UIDS = {'Pierre': 'u_pierre', 'Nic': 'u_sam', 'Mitch': 'u_priya'}
for n, u in UIDS.items(): cloud.seed(u, fc.profile(n))

async def api(pg, js):
    return await pg.evaluate(f"(async()=>{{try{{const b=window.__puntaroLiveBackend;const r=await ({js});return 'ok'}}catch(e){{return 'denied'}}}})()")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        A = await cloud.phone(b, UIDS['Pierre']); await fc.open_app(A, URL)
        B = await cloud.phone(b, UIDS['Nic']); C = await cloud.phone(b, UIDS['Mitch'])

        # ---- setup: gross scores, live, one scorer, Greg banks at 10+
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
        if await A.get_by_role('button', name='Start a new round').count(): await A.get_by_role('button', name='Start a new round').click(); await A.wait_for_timeout(300)
        await A.locator('.card', has_text='Use handicaps').get_by_role('switch').click(); await A.wait_for_timeout(100)
        await A.get_by_role('switch').last.click(); await A.get_by_label('Your name for the group').fill('Pierre')
        await A.get_by_role('button', name='One scorer').click(); await A.wait_for_timeout(150)
        summ = A.locator('[data-orders-summary]')
        check('Setup shows a single Banking line, defaulting to everyone calling their own', await summ.count() == 1 and (await summ.inner_text()) == 'Everyone calls their own')
        await A.get_by_role('button', name='Change banking').click(); await A.wait_for_timeout(200)
        sheet = A.get_by_role('dialog', name='Standing orders')
        check('Change opens the standing orders sheet with every player', await sheet.locator('[data-order]').count() == 4)
        await sheet.locator('[data-order="jake"]').get_by_role('button', name='Bank at 10+').click(); await A.wait_for_timeout(100)
        await A.screenshot(path=f'{OUT}/bank_orders_sheet.png')
        await sheet.get_by_role('button', name='Done').click(); await A.wait_for_timeout(150)
        check('The Banking line now names Greg\'s order', (await summ.inner_text()) == 'Greg at 10+', await summ.inner_text())
        await A.evaluate('scrollTo(0, document.body.scrollHeight)')
        await A.get_by_role('button', name='Tee off live').click(); await A.wait_for_timeout(900)
        code = [k.split('/')[1] for k in cloud.docs if k.startswith('rounds/') and k.count('/') == 1][0]
        D = lambda: cloud.docs[f'rounds/{code}']
        check('Greg\'s order goes online from the first hole', D().get('ord') == {'jake': {'0': '10'}}, str(D().get('ord')))
        await A.get_by_role('button', name='Close').first.click()

        # ---- Nic joins to bank from his phone; Mitch joins just to watch
        await fc.open_app(B, URL, f'?join={code}'); await B.wait_for_timeout(500)
        await B.get_by_role('button', name='Nic').first.click(); await B.wait_for_timeout(200)
        check('One scorer: picking a player asks how they want to play', await B.get_by_text('How do you want to play?').count() == 1 and D()['claims'].get('sam') is None)
        await B.screenshot(path=f'{OUT}/bank_join.png')
        await B.get_by_role('button', name='Join as Nic').click(); await B.wait_for_timeout(900)
        check('"Bank from my phone" takes Nic\'s seat', D()['claims'].get('sam') == UIDS['Nic'])
        check('Nic lands on his bank screen, not the scoresheet', await B.locator('[data-bankonly="sam"]').count() == 1)
        await fc.open_app(C, URL, f'?join={code}'); await C.wait_for_timeout(500)
        await C.get_by_role('button', name='Mitch').first.click(); await C.wait_for_timeout(150)
        await C.get_by_role('button', name='Just watch', exact=False).first.click(); await C.wait_for_timeout(100)
        await C.get_by_role('button', name='Just watch', exact=True).click(); await C.wait_for_timeout(900)
        check('"Just watch" joins without taking Mitch\'s seat', D()['claims'].get('priya') is None and D()['members'].get(UIDS['Mitch']) is True)
        check('...and Mitch sees the normal watching view', await C.locator('[data-bankonly]').count() == 0 and await C.get_by_text("You're watching live.").count() == 1)

        row = lambda n: A.locator('.card', has=A.get_by_role('button', name=f'{n} plus one'))
        async def score(n, d):  # d: strokes against par
            await A.get_by_role('button', name=f'{n} plus one').click(); await A.wait_for_timeout(60)
            for _ in range(abs(d)): await A.get_by_role('button', name=f'{n} {"minus" if d < 0 else "plus"} one').click(); await A.wait_for_timeout(60)
        async def sync(ms=900): await asyncio.sleep(ms / 1000)

        # ---- hole 1: Pierre, Nic, Greg birdie; Mitch par
        for n, d in (('Greg', -1), ('Mitch', 0), ('Pierre', -1), ('Nic', -1)): await score(n, d)
        await sync()
        check('Each row shows a POT · BANK chip once the score is in', await row('Greg').get_by_role('button', name='POT 3 · BANK').count() == 1)
        check('Nic\'s row says OWN PHONE instead', await row('Nic').get_by_text('OWN PHONE').count() == 1 and await row('Nic').locator('button[data-rowbank]').count() == 0)
        check('Greg\'s row says when his order will bank', 'auto-banks at 10' in await row('Greg').inner_text())
        check('No "Bank ...?" offer for a small pot', await A.locator('[data-bankask]').count() == 0)
        check('Nic\'s phone shows his pot', (await B.locator('[data-mypot]').inner_text()) == '3')
        await B.screenshot(path=f'{OUT}/bank_only_h1.png')
        await B.get_by_role('button', name='BANK MY 3').click(); await sync()
        check('Nic banks from his phone: saved as his own call', (D().get('bc') or {}).get('sam', {}).get('0') is True)
        check('...his screen says it\'s banking', 'banking after hole 1' in await B.locator('[data-bankonly]').inner_text())
        check('...and the scorer\'s bank panel shows it, on his phone', await A.get_by_role('button', name='Banking (their phone)').count() == 1)
        await B.get_by_role('button', name='Undo: keep it in the pot').click(); await sync()
        check('Nic can undo while the hole is open', (D().get('bc') or {}).get('sam', {}).get('0') is False)

        # ---- attacks on own-phone banking
        r = await api(B, f"b.update('{code}',[[['bc','jake','0'],true],[['who'],'jake'],[['bh'],0]])")
        check('ATTACK Nic banks for Greg (posing as Greg): blocked', r == 'denied', r)
        r = await api(B, f"b.update('{code}',[[['bc','jake','0'],true],[['who'],'sam'],[['bh'],0]])")
        check('ATTACK Nic banks for Greg (as himself): blocked', r == 'denied', r)
        r = await api(B, f"b.update('{code}',[[['bk','jake','0'],true]])")
        check('ATTACK Nic writes the scorer\'s bank calls: blocked', r == 'denied', r)
        r = await api(A, f"b.update('{code}',[[['bc','sam','0'],true]],true)")
        check('ATTACK the scorer overrides Nic\'s own call: blocked', r == 'denied', r)
        r = await api(B, f"b.update('{code}',[[['ord','jake','0'],'call'],[['who'],'sam'],[['bh'],0]])")
        check('ATTACK Nic changes Greg\'s standing order: blocked', r == 'denied', r)
        r = await api(C, f"b.update('{code}',[[['bc','priya','0'],true],[['who'],'priya'],[['bh'],0]])")
        check('ATTACK Mitch (watching, no seat) banks for herself: blocked', r == 'denied', r)

        # ---- hole 2: same again
        await A.get_by_role('button', name='Next hole').last.click(); await A.wait_for_timeout(300)
        for n, d in (('Greg', -1), ('Mitch', 0), ('Nic', -1), ('Pierre', -1)): await score(n, d)
        await sync()
        r = await api(B, f"b.update('{code}',[[['bc','sam','0'],true],[['who'],'sam'],[['bh'],0]])")
        check('ATTACK Nic banks hole 1 after his hole 2 score is in: blocked', r == 'denied', r)
        check('Nic\'s screen moves on to his hole 2 pot', (await B.locator('[data-mypot]').inner_text()) == '6')

        # ---- hole 3 (par 3): third birdie in a row doubles: 6 + 6 = 12
        await A.get_by_role('button', name='Next hole').last.click(); await A.wait_for_timeout(300)
        await score('Greg', -1); await score('Mitch', 0); await score('Pierre', -1); await A.wait_for_timeout(300)
        check('Greg\'s order banks his 12 by itself', await row('Greg').get_by_text('ORDER BANKED 12 ✓').count() == 1 and 'banked by order' in await row('Greg').inner_text())
        ask = A.locator('[data-bankask="me"]')
        check('Bank as you score: "Bank your 12?" appears under the row just scored', await ask.count() == 1 and 'Bank your 12?' in await ask.inner_text())
        await A.screenshot(path=f'{OUT}/bank_ask.png', full_page=True)
        await ask.get_by_role('button', name='BANK').click(); await A.wait_for_timeout(400)
        check('Tapping BANK banks it and the offer goes away', await A.locator('[data-bankask]').count() == 0 and await row('Pierre').get_by_role('button', name='BANKING 12 ✓').count() == 1)
        await score('Nic', -1); await A.wait_for_timeout(300)
        check('No offer under an own-phone player\'s row', await A.locator('[data-bankask]').count() == 0)
        await sync()
        check('Nic\'s phone shows 12 and a big bank button', (await B.locator('[data-mypot]').inner_text()) == '12' and await B.get_by_role('button', name='BANK MY 12').count() == 1)
        check('...and says the cards on hole 4 will lock it', 'cards come out on hole 4' in await B.locator('[data-bankonly]').inner_text())
        await B.get_by_role('button', name='Change my standing order').click(); await B.wait_for_timeout(200)
        await B.get_by_role('dialog', name='Standing orders').get_by_role('button', name='Bank at 20+').click(); await sync()
        await B.get_by_role('dialog', name='Standing orders').get_by_role('button', name='Done').click(); await B.wait_for_timeout(200)
        check('Nic sets his own standing order from the hole still open', (D().get('ord') or {}).get('sam') == {'2': '20'}, str(D().get('ord')))
        check('...his screen shows it', (await B.locator('[data-myorder]').inner_text()) == 'Bank when I hit 20')
        await B.screenshot(path=f'{OUT}/bank_only_h3.png')
        await B.get_by_role('button', name='BANK MY 12').click(); await sync()
        check('Nic banks his 12', (D().get('bc') or {}).get('sam', {}).get('2') is True)
        check('The scorer sees Nic\'s order in the bank panel', 'Nic at 20+' in await A.locator('.card', has_text='Standing orders:').last.inner_text())

        # ---- moving to hole 4 deals cards: hole 3 calls lock
        await A.get_by_role('button', name='Next hole').last.click(); await A.wait_for_timeout(300)
        lc = A.get_by_role('dialog', name='Last chance to bank')
        if not await lc.count() and await A.get_by_role('dialog', name='Nearest the pin').count():
            await A.get_by_role('dialog').get_by_role('button', name='Nobody hit the green').click(); await A.wait_for_timeout(700)
        check('Last chance to bank shows Greg\'s order banking him', await lc.get_by_role('button', name='By order').count() == 1)
        check('...and Nic banking on his phone', await lc.locator('div', has_text='Nic').get_by_role('button', name='Banking').count() >= 1)
        for _ in range(20):
            if await A.locator('.moment').count(): await A.locator('.moment').click(); await A.wait_for_timeout(200); continue
            if await A.get_by_role('dialog', name='Nearest the pin').count(): await A.get_by_role('dialog').get_by_role('button', name='Nobody hit the green').click(); await A.wait_for_timeout(400); continue
            if await A.get_by_role('button', name='Draw the cards').count(): await A.get_by_role('button', name='Draw the cards').click(); await A.wait_for_timeout(500); continue
            break
        await sync(1200)
        check('Cards are out on hole 4', (D().get('draws') or {}).get('3') is not None)
        r = await api(B, f"b.update('{code}',[[['bc','sam','2'],false],[['who'],'sam'],[['bh'],2]])")
        check('ATTACK Nic un-banks hole 3 after the cards are out: blocked', r == 'denied', r)
        check('Nic\'s bank button is locked', await B.locator('[data-bankbtn]').is_disabled())
        await B.get_by_role('button', name='See the scoresheet').click(); await B.wait_for_timeout(300)
        check('"See the scoresheet" shows the read-only sheet with a way back', await B.get_by_role('button', name='Back to my pot').count() == 1)
        await B.get_by_role('button', name='Back to my pot').click(); await B.wait_for_timeout(200)
        check('...and back to his pot', await B.locator('[data-bankonly]').count() == 1)

        errs = A.errs + B.errs + C.errs
        check('No page errors', not errs, str(errs))
        print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
