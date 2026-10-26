import asyncio, json, sys, copy
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules
SRC, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
DB = {}
def setp(d, path, v):
    for k in path[:-1]: d = d.setdefault(str(k), {})
    d[str(path[-1])] = v
INIT = """(()=>{let uid=localStorage.getItem('fake.uid');if(!uid){uid='u'+Math.random().toString(36).slice(2,8);localStorage.setItem('fake.uid',uid)}
const call=async(f,...a)=>{const r=JSON.parse(await window[f](uid,...a.map(x=>JSON.stringify(x))));if(r.err)throw new Error(r.err);return r.v};
window.__puntaroLiveBackend={uid,create:(c,d)=>call('__c',c,d),get:c=>call('__g',c),update:(c,p)=>call('__u',c,p),setIfAbsent:async()=>{},putBank:async()=>{},getBank:async()=>null,
watch:(c,cb)=>{let l=null,a=true;const t=async()=>{if(!a)return;const r=await call('__g',c);const s=JSON.stringify(r);if(s!==l){l=s;cb(r)}setTimeout(t,150)};t();return()=>{a=false}}};})();"""
async def phone(b):
    ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1.5, service_workers='block')
    await ctx.add_init_script(INIT)
    async def c(uid, code, d): DB[json.loads(code)] = json.loads(d); return json.dumps({'v': None})
    async def g(uid, code): return json.dumps({'v': DB.get(json.loads(code))})
    async def u(uid, code, p):
        code = json.loads(code); after = copy.deepcopy(DB[code])
        for path, v in json.loads(p): setp(after, path, v)
        ok, why = rules.can_update(DB[code], after, uid)
        if not ok: return json.dumps({'err': why})
        DB[code] = after; return json.dumps({'v': None})
    for n, f in (('__c', c), ('__g', g), ('__u', u)): await ctx.expose_function(n, f)
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    return pg, errs
async def open_app(pg, q=''):
    await pg.wait_for_timeout(1000)  # let storage finish saving, as it would before a person reopens the app
    await pg.goto((SRC if SRC.startswith('http') else 'file://' + SRC) + q); await pg.wait_for_timeout(700)
    for _ in range(3):
        if await pg.locator('.splash').count(): await pg.locator('.splash').dispatch_event('pointerdown'); await pg.wait_for_timeout(400)
    await pg.wait_for_timeout(300)
state = lambda pg: pg.evaluate("JSON.parse(localStorage.getItem('puntaro.state.v1'))")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); A, ea = await phone(b)
        A.set_default_timeout(8000); global PG; PG = A
        await open_app(A)
        st = await state(A); demo_scores = json.dumps(st['round']['scores']); demo_course = st['round']['course']['name']
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(400)
        check('Tapping Start a round with a round going shows a warning', await A.get_by_role('dialog', name='Round in progress').count() == 1)
        await A.screenshot(path=f'{OUT}/p_warning.png')
        await A.get_by_role('button', name=f'Resume {demo_course}').click(); await A.wait_for_timeout(400)
        check('Resume goes back to the round', await A.get_by_role('button', name='Next hole').count() + await A.get_by_text('Pick nearest the pin first').count() >= 1)
        await open_app(A)
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Start a new round').click(); await A.wait_for_timeout(300)
        check('Start a new round opens setup, nothing paused yet', len((await state(A)).get('parked', [])) == 0)
        await A.get_by_role('button', name='Back').first.click(); await A.wait_for_timeout(300)
        st = await state(A)
        check('Backing out of setup leaves the round untouched', st['round'] and json.dumps(st['round']['scores']) == demo_scores)
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Start a new round').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Tee off').click(); await A.wait_for_timeout(600)
        st = await state(A)
        check('Teeing off pauses the old round instead of deleting it', len(st['parked']) == 1 and json.dumps(st['parked'][0]['round']['scores']) == demo_scores)
        await A.get_by_role('button', name='You plus one').click(); await A.wait_for_timeout(200)
        await open_app(A)
        _st = await state(A); _n1 = await A.get_by_text('Paused rounds').count(); _n2 = await A.get_by_text('23h 59m left').count() + await A.get_by_text('24h 0m left').count()
        if not (_n1 == 1 and _n2 == 1):
            print('DBG parked', len(_st.get('parked') or []), 'labels', _n1, _n2, 'splash', await A.locator('.splash').count())
            print('DBG body', (await A.inner_text('body'))[:700].replace('\n', ' | ')); await A.screenshot(path=f'{OUT}/flake.png', full_page=True)
        check('Home lists it under Paused rounds with time left', await A.get_by_text('Paused rounds').count() == 1 and await A.get_by_text('23h 59m left').count() + await A.get_by_text('24h 0m left').count() == 1)
        await A.screenshot(path=f'{OUT}/p_home.png', full_page=True)
        await A.get_by_role('button', name='Resume', exact=True).first.click(); await A.wait_for_timeout(500)
        st = await state(A)
        print('DEBUG resume', st['round']['course']['name'], st['round']['hole'], json.dumps(st['round']['scores'])==demo_scores, [x['round']['course']['name'] for x in st['parked']])
        check('Resume brings it back with every score intact', json.dumps(st['round']['scores']) == demo_scores and st['round']['hole'] == 6)
        check('...and the newer round is paused in its place (no data lost)', len(st['parked']) == 1 and st['parked'][0]['round']['scores']['me'][0] is not None)
        await open_app(A)
        check('Paused rounds survive closing the app', len((await state(A))['parked']) == 1)
        await A.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('puntaro.state.v1'));s.parked[0].at=Date.now()-25*3600*1000;localStorage.setItem('puntaro.state.v1',JSON.stringify(s))})()")
        await open_app(A)
        check('After 24 hours a paused round is cleared', len((await state(A)).get('parked', [])) == 0 and await A.get_by_text('Paused rounds').count() == 0)
        # delete + restore
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Start a new round').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Tee off').click(); await A.wait_for_timeout(400)
        await open_app(A)
        await A.get_by_role('button', name=f'Delete paused round at {demo_course}').click(); await A.wait_for_timeout(300)
        check('Deleting a paused round sends it to Recently deleted', len((await state(A))['parked']) == 0 and await A.get_by_text('Recently deleted').count() == 1)
        await A.get_by_role('button', name='Restore', exact=True).first.click(); await A.wait_for_timeout(400)
        st = await state(A)
        check('Restoring it pauses the current round rather than deleting it', json.dumps(st['round']['scores']) == demo_scores and len(st['parked']) == 1)
        # joining a live round pauses a solo round
        host, eh = await phone(b); await open_app(host)
        await host.get_by_role('button', name='Start a round').click(); await host.wait_for_timeout(300)
        await host.get_by_role('button', name='Start a new round').click(); await host.wait_for_timeout(300)
        await host.get_by_role('switch').last.click(); await host.get_by_role('button', name='Tee off live').click(); await host.wait_for_timeout(800)
        code = list(DB)[0]
        before = len((await state(A))['parked'])
        await open_app(A, f'?join={code}'); await A.wait_for_timeout(500)
        await A.get_by_role('button', name='Sam').first.click(); await A.wait_for_timeout(700)
        st = await state(A)
        check('Joining a live round pauses the solo round in progress', len(st['parked']) == before + 1 and st['live']['code'] == code)
        await open_app(A)
        await A.get_by_role('button', name='Resume', exact=True).first.click(); await A.wait_for_timeout(500)
        st = await state(A)
        check('Resuming the solo round pauses the live one, keeping its live link', st['live'] is None and any(x.get('live') and x['live']['code'] == code for x in st['parked']))
        await open_app(A)
        live_row = A.get_by_role('button', name='Resume', exact=True)
        idx = [i for i, x in enumerate(st['parked']) if x.get('live')][0]
        await live_row.nth(idx).click(); await A.wait_for_timeout(900)
        st = await state(A)
        check('Resuming the live round re-follows it', st['live'] and st['live']['code'] == code and st['live']['myId'] == 'sam')
        print('page errors:', ea + eh); print(f'{sum(res)}/{len(res)} passed')
        await b.close()
async def guarded():
    try:
        await main()
    except Exception as e:
        print('CRASH', str(e).split('\n')[0])
        try:
            st = await PG.evaluate("JSON.parse(localStorage.getItem('puntaro.state.v1'))")
            print('STATE parked:', [(x['round']['course']['name'], x['round']['hole'], bool(x.get('live'))) for x in (st.get('parked') or [])], 'live:', st.get('live'), 'round:', st['round'] and st['round']['course']['name'])
            print('BODY:', (await PG.inner_text('body'))[:500].replace('\n', ' | '))
            await PG.screenshot(path=f'{OUT}/flake.png', full_page=True)
        except Exception as e2: print('dump failed', e2)
asyncio.run(guarded())
