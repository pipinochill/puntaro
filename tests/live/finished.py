"""Finished live rounds: the host finishes for everyone, the round locks, every player's account records it
(including a player whose phone was off), deleting only hides your own copy, and any player can finish
once the round has been quiet for 6 hours."""
import asyncio, json, sys
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))

async def host_live(pg, cloud):
    await pg.get_by_role('button', name='Start a round').click(); await pg.wait_for_timeout(300)
    if await pg.get_by_role('button', name='Start a new round').count(): await pg.get_by_role('button', name='Start a new round').click(); await pg.wait_for_timeout(300)
    await pg.get_by_role('switch').last.click(); await pg.get_by_label('Your name for the group').fill('Pierre')
    before = set(k for k in cloud.docs if k.startswith('rounds/') and k.count('/') == 1)
    await pg.get_by_role('button', name='Tee off live').click(); await pg.wait_for_timeout(900)
    code = [k for k in cloud.docs if k.startswith('rounds/') and k.count('/') == 1 and k not in before][0].split('/')[1]
    await pg.get_by_role('button', name='Close').first.click(); return code

async def join(pg, code, who):
    await fc.open_app(pg, URL, q=f'?join={code}'); await pg.wait_for_timeout(500)
    await pg.get_by_role('button', name=who).first.click(); await pg.wait_for_timeout(700)

async def api(pg, js):
    return await pg.evaluate(f"(async()=>{{try{{const b=window.__puntaroLiveBackend;await ({js});return 'ok'}}catch(e){{return 'denied'}}}})()")

async def main():
    cloud = fc.Cloud(rules)
    for uid, first in (('u_pierre', 'Pierre'), ('u_sam', 'Nic'), ('u_priya', 'Mitch')): cloud.seed(uid, fc.profile(first))
    async with async_playwright() as p:
        b = await p.chromium.launch()
        H = await cloud.phone(b, 'u_pierre'); S = await cloud.phone(b, 'u_sam'); P = await cloud.phone(b, 'u_priya')
        await fc.open_app(H, URL); code = await host_live(H, cloud)
        await join(S, code, 'Nic'); await join(P, code, 'Mitch')
        for pg, who in ((H, 'Pierre'), (S, 'Nic'), (P, 'Mitch')): await pg.get_by_role('button', name=f'{who} plus one').click(); await pg.wait_for_timeout(150)
        await H.get_by_role('button', name='Greg plus one').click()
        await S.get_by_role('button', name='Bank after hole').first.click(); await S.wait_for_timeout(1700)
        await asyncio.sleep(0.6)

        # Mitch's phone goes off before the end
        await P.close()

        # Nic can't finish it
        await S.get_by_role('button', name='Finish', exact=True).click(); await S.wait_for_timeout(400)
        check('A player sees "Waiting for Pierre" instead of a save button', await S.get_by_role('button', name='Waiting for Pierre').count() == 1)
        await S.screenshot(path=f'{OUT}/fin_waiting.png')
        check('ATTACK Nic finishes the round early: blocked', await api(S, f"b.finish('{code}')") == 'denied' and not cloud.live(code).get('done'))
        await S.get_by_role('button', name='Back to Home').click(); await S.wait_for_timeout(300)

        # host finishes
        await H.get_by_role('button', name='Finish', exact=True).click(); await H.wait_for_timeout(400)
        check('The host is told this finishes it for everyone', await H.get_by_text("finishes the live round for everyone").count() == 1)
        await H.get_by_role('button', name='Finish round').click(); await H.wait_for_timeout(2500)
        d = cloud.live(code)
        check('The live round is marked finished and kept online', d is not None and d.get('done') is True)
        hf = cloud.finished('u_pierre').get(code); sf = cloud.finished('u_sam').get(code)
        check('The host\'s account records it', hf is not None)
        check('Nic\'s account records it too, without him doing anything', sf is not None)
        check('Nic\'s stats count his own result', sf and set(sf['players']) == {'me'})
        r = json.loads(sf['round']) if sf else {}
        check('The recorded card includes Nic\'s revealed bank call', r.get('bank', {}).get('sam', [False])[0] is True)
        check('Nic is told it\'s saved', await S.get_by_text("It's saved in your Round history").count() == 1)
        await fc.flushed(S)
        check('...and it leaves his round in progress', cloud.now_state('u_sam').get('round') is None)

        # locked
        check('ATTACK Nic changes a score after the finish: blocked', await api(S, f"b.update('{code}',[[['s','sam','0'],1]])") == 'denied')
        check('ATTACK the host reopens it: blocked', await api(H, f"b.update('{code}',[[['done'],false]])") == 'denied')
        check('ATTACK Nic changes his bank call after the finish: blocked', await api(S, f"b.putBank('{code}','sam',0,false)") == 'denied')
        check('Bank calls are all readable once it\'s finished', await api(H, f"b.getBank('{code}','sam',0)") == 'ok')

        # Mitch comes back later
        P = await cloud.phone(b, 'u_priya')
        await fc.open_app(P, URL); await P.wait_for_timeout(2500)
        check('Mitch\'s account records it when she next opens the app', cloud.finished('u_priya').get(code) is not None)

        # the host deletes theirs: only the host's copy is hidden
        await fc.open_app(H, URL); await H.get_by_role('button', name='History', exact=True).click(); await H.wait_for_timeout(300)
        row = H.locator('[role=button]', has_text='Pebble Hollow').first
        bx = await row.bounding_box(); await H.mouse.move(bx['x'] + 20, bx['y'] + 10); await H.mouse.down(); await H.wait_for_timeout(900); await H.mouse.up()
        await H.wait_for_timeout(300); await H.get_by_role('button', name='Delete round', exact=True).click(); await H.wait_for_timeout(900)
        check('The host removing it only hides the host\'s copy', cloud.finished('u_pierre')[code].get('hidden') is True)
        check('...Nic and Mitch still have theirs, and the shared round stays online', not cloud.finished('u_sam')[code].get('hidden') and not cloud.finished('u_priya')[code].get('hidden') and cloud.live(code) is not None)
        await fc.open_app(S, URL); await S.get_by_role('button', name='History', exact=True).click(); await S.wait_for_timeout(300)
        await S.locator('[role=button]', has_text='Pebble Hollow').first.click(); await S.wait_for_timeout(500)
        check('Nic can open the scoresheet any time', await S.get_by_text('Scoresheet').count() == 1)
        await S.screenshot(path=f'{OUT}/fin_card.png', full_page=True)

        # 6-hour fallback
        await fc.open_app(H, URL); code2 = await host_live(H, cloud)
        await join(S, code2, 'Nic')
        await S.get_by_role('button', name='Nic plus one').click(); await S.wait_for_timeout(400)
        check('ATTACK Nic finishes a fresh round: blocked', await api(S, f"b.finish('{code2}')") == 'denied')
        check('ATTACK Nic stamps the host\'s clock to fake a quiet host: blocked', await api(S, f"b.update('{code2}',[[['s','sam','1'],4]],true)") == 'denied')
        cloud.clock_offset = 6 * 3600 * 1000 + 60 * 1000  # six hours pass with no activity
        await S.evaluate("Date.now = (n => () => n() + 6*3600*1000 + 60*1000)(Date.now)")
        await S.get_by_role('button', name='Nic plus one').click(); await S.wait_for_timeout(300)  # Nic keeps playing: that's not the host
        await S.get_by_role('button', name='Finish', exact=True).click(); await S.wait_for_timeout(400)
        check('After 6 hours with nothing from the host\'s phone, Nic is offered "Finish for everyone"', await S.get_by_role('button', name='Finish for everyone').count() == 1)
        await S.get_by_role('button', name='Finish for everyone').click(); await S.wait_for_timeout(2500)
        check('...and it finishes for everyone', (cloud.live(code2) or {}).get('done') is True and (cloud.live(code2) or {}).get('doneBy') == 'u_sam')
        check('...recorded in Nic\'s account', cloud.finished('u_sam').get(code2) is not None)

        print('page errors:', H.errs + S.errs + P.errs); print('denied:', len(cloud.denied)); print(f'{sum(res)}/{len(res)} passed')
        await b.close()
asyncio.run(main())
