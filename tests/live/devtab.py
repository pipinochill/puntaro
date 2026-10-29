"""Dev tab: only the admin account sees it, and only the admin can read everyone's data.
Players' phones log a few plain events (opened, round started/finished, feedback...)."""
import asyncio, json, sys
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
ADMIN = 'ADMIN_UID'  # the placeholder in the app and the rules until the real account ID goes in
cloud = fc.Cloud(rules)
async def play_round(A):
    await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
    await A.evaluate('scrollTo(0, document.body.scrollHeight)')
    await A.get_by_role('button', name='Tee off').click(); await A.wait_for_timeout(400)
    for h in range(18):
        for n in ('You', 'Nic', 'Mitch', 'Greg'): await A.get_by_role('button', name=f'{n} plus one').click()
        if h % 5 == 2: await A.get_by_role('button', name='Greg plus one').click(); await A.get_by_role('button', name='Greg plus one').click()
        if await A.get_by_role('button', name='Nobody hit the green').count(): await A.get_by_role('button', name='Nobody hit the green').first.click()
        if h == 17: break
        await A.get_by_role('button', name='Next hole').last.click(); await A.wait_for_timeout(150)
        for _ in range(8):
            if await A.locator('.moment').count(): await A.locator('.moment').click(); await A.wait_for_timeout(150); continue
            if await A.get_by_role('button', name='Draw the cards').count():
                await A.get_by_role('button', name='Draw the cards').click(); await A.wait_for_timeout(250)
                if await A.get_by_role('button', name='Flip all').count(): await A.get_by_role('button', name='Flip all').click(); await A.wait_for_timeout(250)
                if await A.get_by_role('button', name="Let's play").count(): await A.get_by_role('button', name="Let's play").click(); await A.wait_for_timeout(150)
                continue
            if await A.get_by_role('dialog', name='Nearest the pin').count(): await A.get_by_role('dialog').get_by_role('button', name='Nobody hit the green').click(); await A.wait_for_timeout(250); continue
            break
    for _ in range(3):
        if await A.locator('.moment').count(): await A.locator('.moment').click(); await A.wait_for_timeout(150)
    await A.get_by_role('button', name='Finish', exact=True).click(); await A.wait_for_timeout(500)
    if await A.get_by_role('button', name='Finish round').count(): await A.get_by_role('button', name='Finish round').click(); await A.wait_for_timeout(800)
    if await A.get_by_role('button', name='Save round').count(): await A.get_by_role('button', name='Save round').click(); await A.wait_for_timeout(800)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        cloud.seed('u_p', fc.profile('Pierre')); cloud.seed(ADMIN, fc.profile('Boss'))
        cloud.docs['users/u_p']['email'] = 'nic@example.com'; cloud.docs['users/u_p']['createdAt'] = cloud.now()
        P = await cloud.phone(b, 'u_p'); await fc.open_app(P, URL)
        check("Players don't get a Dev tab", await P.get_by_role('button', name='Dev', exact=True).count() == 0)
        await P.get_by_role('button', name='Me', exact=True).click(); await P.wait_for_timeout(300)
        check('Me shows the account ID (so the admin can find theirs)', await P.get_by_text('Account ID: u_p').count() == 1)
        await P.get_by_role('button', name='Home', exact=True).click(); await P.wait_for_timeout(200)
        await play_round(P); await fc.flushed(P)
        if await P.get_by_role('button', name='Home', exact=True).count(): await P.get_by_role('button', name='Home', exact=True).click(); await P.wait_for_timeout(300)
        await P.get_by_role('button', name='About this alpha').first.click(); await P.wait_for_timeout(300)
        await P.get_by_label('Your feedback').fill('Love the comeback rule'); await P.get_by_role('button', name='Send feedback').click(); await P.wait_for_timeout(800)
        names = sorted({v['name'] for k, v in cloud.docs.items() if k.startswith('events/')})
        check('The phone logged plain events', {'open', 'round_start', 'round_finish', 'feedback'} <= set(names), str(names))
        ev = [v for k, v in cloud.docs.items() if k.startswith('events/') and v['name'] == 'open']
        check('...with no location or personal details, just app and version', ev and set(ev[0]['data']) <= {'v', 'app', 'os'}, str(ev[:1]))
        r1 = await P.evaluate("window.__fake.raw('events/1', 'get').then(() => 'read', e => 'denied')")
        r2 = await P.evaluate("window.__fake.raw('users/ADMIN_UID', 'get').then(() => 'read', e => 'denied')")
        r3 = await P.evaluate("window.__puntaroLiveBackend.adminLoad().then(() => 'read', e => 'denied')")
        check("A player can't read the log, other accounts or the admin view", (r1, r2, r3) == ('denied', 'denied', 'denied'), str((r1, r2, r3)))
        fid = [k for k in cloud.docs if k.startswith('feedback/')][0].split('/')[1]
        r4 = await P.evaluate(f"window.__puntaroLiveBackend.adminFeedbackDone('{fid}', true).then(() => 'did', e => 'denied')")
        check('...or mark feedback done', r4 == 'denied')
        # the admin
        A = await cloud.phone(b, ADMIN); await fc.open_app(A, URL)
        dev = A.get_by_role('button', name='Dev', exact=True)
        check('The admin gets a Dev tab', await dev.count() == 1)
        await dev.click(); await A.wait_for_timeout(1500)
        body = await A.locator('body').inner_text()
        check('It shows players, rounds and activity', 'players' in body and 'rounds played' in body and 'App opens, last 14 days' in body, body[:300])
        check('...the feedback inbox', 'Love the comeback rule' in body and 'Feedback (1 to look at)' in body)
        check('...real-life game stats from the finished round', '1 finished Puntaro round with' in body and 'Busts per player per round' in body, body[body.find('The game'):body.find('The game') + 200])
        check('...and the player list, with emails', 'nic@example.com' in body)
        await A.screenshot(path=f'{OUT}/dev_top.png')
        await A.get_by_role('button', name='Done', exact=True).first.click(); await A.wait_for_timeout(500)
        check('Marking feedback Done saves it', cloud.docs[f'feedback/{fid}'].get('done') is True and await A.get_by_text('Feedback (0 to look at)').count() == 1)
        await A.evaluate('scrollTo(0, 900)'); await A.wait_for_timeout(200); await A.screenshot(path=f'{OUT}/dev_mid.png')
        print('page errors:', P.errs + A.errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
