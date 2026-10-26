"""Round-in-progress warning and Paused rounds, stored in the account: pause, resume with scores intact,
24-hour expiry, delete and restore, another phone on the same account, and live rounds."""
import asyncio, json, sys
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))

async def tee_off(pg, course=None, live=False):
    await pg.get_by_role('button', name='Start a round').click(); await pg.wait_for_timeout(300)
    if await pg.get_by_role('button', name='Start a new round').count(): await pg.get_by_role('button', name='Start a new round').click(); await pg.wait_for_timeout(300)
    if live: await pg.get_by_role('switch').last.click(); await pg.get_by_label('Your name for the group').fill('Pierre')
    await pg.get_by_role('button', name='Tee off live' if live else 'Tee off').click(); await pg.wait_for_timeout(800)

async def main():
    cloud = fc.Cloud(rules)
    cloud.seed('u_a', fc.profile('Pierre')); cloud.seed('u_h', fc.profile('Host'))
    st = lambda: cloud.now_state('u_a')
    async with async_playwright() as p:
        b = await p.chromium.launch()
        A = await cloud.phone(b, 'u_a'); await fc.open_app(A, URL)
        await tee_off(A)
        for who in ('You', 'Nic'): await A.get_by_role('button', name=f'{who} plus one').click(); await A.wait_for_timeout(100)
        await fc.flushed(A); first = json.dumps(st()['round']['scores'])
        await fc.open_app(A, URL)
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(400)
        check('Tapping Start a round with a round going shows a warning', await A.get_by_role('dialog', name='Round in progress').count() == 1)
        await A.get_by_role('button', name='Resume Pebble Hollow').click(); await A.wait_for_timeout(400)
        check('Resume goes back to the round', await A.get_by_role('button', name='You plus one').count() == 1)
        await fc.open_app(A, URL)
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Start a new round').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Back').first.click(); await A.wait_for_timeout(300); await fc.flushed(A)
        check('Backing out of setup leaves the round untouched', json.dumps(st()['round']['scores']) == first and not st().get('parked'))
        await tee_off(A); await fc.flushed(A)
        check('Teeing off pauses the old round instead of deleting it', len(st()['parked']) == 1 and json.dumps(st()['parked'][0]['round']['scores']) == first)
        await A.get_by_role('button', name='You plus one').click(); await fc.flushed(A)
        await fc.open_app(A, URL)
        check('Home lists it under Paused rounds with time left', await A.get_by_text('Paused rounds').count() == 1 and await A.get_by_text('23h 59m left').count() + await A.get_by_text('24h 0m left').count() == 1)
        A2 = await cloud.phone(b, 'u_a'); await fc.open_app(A2, URL)
        check('Your other phone shows the same paused round', await A2.get_by_text('Paused rounds').count() == 1)
        await A2.close()
        await A.get_by_role('button', name='Resume', exact=True).first.click(); await A.wait_for_timeout(500); await fc.flushed(A)
        check('Resume brings it back with every score intact', json.dumps(st()['round']['scores']) == first)
        check('...and the newer round is paused in its place (no data lost)', len(st()['parked']) == 1 and st()['parked'][0]['round']['scores']['me'][0] is not None)
        await fc.open_app(A, URL)
        check('Paused rounds survive closing the app (they\'re in the account)', await A.get_by_text('Paused rounds').count() == 1)
        s = st(); s['parked'][0]['at'] -= 25 * 3600 * 1000
        cloud.docs['users/u_a/state/now']['json'] = json.dumps(s)
        await fc.open_app(A, URL); await fc.flushed(A)
        check('After 24 hours a paused round is cleared', not st().get('parked') and await A.get_by_text('Paused rounds').count() == 0)
        await tee_off(A); await fc.open_app(A, URL)
        await A.get_by_role('button', name='Delete paused round at Pebble Hollow').click(); await A.wait_for_timeout(300); await fc.flushed(A)
        check('Deleting a paused round sends it to Recently deleted', not st().get('parked') and await A.get_by_text('Recently deleted').count() == 1)
        await A.get_by_role('button', name='Restore', exact=True).first.click(); await A.wait_for_timeout(400); await fc.flushed(A)
        check('Restoring it pauses the current round rather than deleting it', json.dumps(st()['round']['scores']) == first and len(st()['parked']) == 1)
        # live rounds
        H = await cloud.phone(b, 'u_h'); await fc.open_app(H, URL); await tee_off(H, live=True)
        code = [k for k in cloud.docs if k.startswith('rounds/') and k.count('/') == 1][0].split('/')[1]
        before = len(st()['parked'])
        await fc.open_app(A, URL, q=f'?join={code}'); await A.wait_for_timeout(500)
        await A.get_by_role('button', name='Nic').first.click(); await A.wait_for_timeout(700); await fc.flushed(A)
        check('Joining a live round pauses the solo round in progress', len(st()['parked']) == before + 1 and st()['live']['code'] == code)
        await fc.open_app(A, URL)
        await A.get_by_role('button', name='Resume', exact=True).first.click(); await A.wait_for_timeout(500); await fc.flushed(A)
        s = st()
        check('Resuming the solo round pauses the live one, keeping its live link', s['live'] is None and any(x.get('live') and x['live']['code'] == code for x in s['parked']))
        await fc.open_app(A, URL)
        idx = [i for i, x in enumerate(st()['parked']) if x.get('live')][0]
        await A.get_by_role('button', name='Resume', exact=True).nth(idx).click(); await A.wait_for_timeout(900); await fc.flushed(A)
        s = st()
        check('Resuming the live round re-follows it', s['live'] and s['live']['code'] == code and s['live']['myId'] == 'sam')
        print('page errors:', A.errs + H.errs); print(f'{sum(res)}/{len(res)} passed')
        await b.close()
asyncio.run(main())
