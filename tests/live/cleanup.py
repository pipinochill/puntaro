"""Host clean-up of finished live rounds: on save, after the delete-undo window, after a paused round expires."""
import asyncio, copy, json, sys
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules
SRC, OUT = sys.argv[1], sys.argv[2]; res = []; DB = {}; BANKS = {}
def check(n, ok, d=''): res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
def setp(d, path, v):
    for k in path[:-1]: d = d.setdefault(str(k), {})
    d[str(path[-1])] = v
INIT = """(()=>{let uid=localStorage.getItem('fake.uid');if(!uid){uid='u'+Math.random().toString(36).slice(2,8);localStorage.setItem('fake.uid',uid)}
const call=async(f,...a)=>{const r=JSON.parse(await window[f](uid,...a.map(x=>JSON.stringify(x))));if(r.err)throw new Error(r.err);return r.v};
window.__puntaroLiveBackend={uid,create:(c,d)=>call('__c',c,d),get:c=>call('__g',c),update:(c,p)=>call('__u',c,p),setIfAbsent:async()=>{},
 putBank:(c,i,h,v)=>call('__pb',c,i,h,v),getBank:(c,i,h)=>call('__gb',c,i,h),
 endRound:async(c,ids)=>{for(const i of ids)for(let h=0;h<18;h++)await call('__db',c,i+'_'+h).catch(()=>{});await call('__dr',c)},
 watch:(c,cb)=>{let l='x',a=true;const t=async()=>{if(!a)return;const r=await call('__g',c);const s=JSON.stringify(r);if(s!==l){l=s;cb(r)}setTimeout(t,150)};t();return()=>{a=false}}};})();"""
def ok(v=None): return json.dumps({'v': v})
def no(w): return json.dumps({'err': w})
async def phone(b):
    ctx = await b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block'); await ctx.add_init_script(INIT)
    async def c(uid, code, d): code = json.loads(code); DB[code] = json.loads(d); BANKS[code] = {}; return ok()
    async def g(uid, code): return ok(DB.get(json.loads(code)))
    async def u(uid, code, p):
        code = json.loads(code)
        if code not in DB: return no('not-found')
        after = copy.deepcopy(DB[code])
        for path, v in json.loads(p): setp(after, path, v)
        good, why = rules.can_update(DB[code], after, uid)
        if not good: return no(why)
        DB[code] = after; return ok()
    async def pb(uid, code, i, h, v):
        code, i, h, v = json.loads(code), json.loads(i), json.loads(h), json.loads(v); key = f'{i}_{h}'; d = {'pid': i, 'h': h, 'v': v, 'uid': uid}
        if code not in DB or not rules.bank_write(DB[code], key, d, uid): return no('bank write')
        BANKS[code][key] = d; return ok()
    async def gb(uid, code, i, h):
        code, i, h = json.loads(code), json.loads(i), json.loads(h); key = f'{i}_{h}'; d = BANKS.get(code, {}).get(key)
        if code not in DB or not rules.bank_get(DB[code], key, d, uid): return no('bank read')
        return ok(None if d is None else d['v'])
    async def db(uid, code, key):
        code, key = json.loads(code), json.loads(key)
        if not rules.bank_delete(DB.get(code), uid): return no('bank delete')
        BANKS.get(code, {}).pop(key, None); return ok()
    async def dr(uid, code):
        code = json.loads(code)
        if not rules.round_delete(DB.get(code), uid): return no('round delete')
        DB.pop(code, None); return ok()
    for n, f in (('__c', c), ('__g', g), ('__u', u), ('__pb', pb), ('__gb', gb), ('__db', db), ('__dr', dr)): await ctx.expose_function(n, f)
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); return pg, errs
async def open_app(pg, q=''):
    await pg.wait_for_timeout(1000)  # let storage finish saving, as it would before a person reopens the app
    await pg.goto((SRC if SRC.startswith('http') else 'file://' + SRC) + q); await pg.wait_for_timeout(700)
    for _ in range(3):
        if await pg.locator('.splash').count(): await pg.locator('.splash').dispatch_event('pointerdown'); await pg.wait_for_timeout(400)
    await pg.wait_for_timeout(300)
async def host_live(pg):
    await pg.get_by_role('button', name='Start a round').click(); await pg.wait_for_timeout(300)
    if await pg.get_by_role('button', name='Start a new round').count(): await pg.get_by_role('button', name='Start a new round').click(); await pg.wait_for_timeout(300)
    await pg.get_by_role('switch').last.click(); await pg.get_by_label('Your name for the group').fill('Pierre')
    await pg.get_by_role('button', name='Tee off live').click(); await pg.wait_for_timeout(900)
    code = [k for k in DB if k not in seen][0]; seen.add(code)
    await pg.get_by_role('button', name='Close').first.click(); return code
seen = set()
api = lambda pg, js: pg.evaluate(f"(async()=>{{try{{const b=window.__puntaroLiveBackend;await ({js});return 'ok'}}catch(e){{return 'denied'}}}})()")
state = lambda pg: pg.evaluate("JSON.parse(localStorage.getItem('puntaro.state.v1'))")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); H, eh = await phone(b); S2, es = await phone(b)
        await open_app(H); code = await host_live(H)
        await open_app(S2, f'?join={code}'); await S2.wait_for_timeout(400); await S2.get_by_role('button', name='Sam').first.click(); await S2.wait_for_timeout(600)
        await H.get_by_role('button', name='Pierre plus one').click(); await S2.get_by_role('button', name='Sam plus one').click(); await H.get_by_role('button', name='Priya plus one').click(); await H.get_by_role('button', name='Jake plus one').click()
        await asyncio.sleep(0.6)
        await S2.get_by_role('button', name='Bank after hole').first.click(); await S2.wait_for_timeout(1700)
        check('A secret bank call exists before the round ends', len(BANKS[code]) == 1)
        r = await api(S2, f"b.update('{code}',[])") ; r = await S2.evaluate(f"(async()=>{{try{{await window.__dr_test}}catch(e){{}}}})()")
        r = await api(S2, f"b.endRound('{code}',['me','sam','priya','jake'])")
        check('ATTACK Sam deletes the live round: blocked', code in DB and len(BANKS[code]) == 1)
        await H.get_by_role('button', name='Finish').click(); await H.wait_for_timeout(400)
        check('The host is told saving ends the live round for everyone', await H.get_by_text('Saving ends the live round for everyone').count() == 1)
        await H.get_by_role('button', name='Save round').click(); await H.wait_for_timeout(1200)
        check('Saving removes the live round from Firebase', code not in DB)
        check('...and its secret bank calls', not BANKS.get(code))
        await S2.wait_for_timeout(800)
        check('Sam is told the host has finished', await S2.get_by_text('The host has finished this live round').count() == 1)
        st = await state(S2)
        check('Sam keeps his copy of the round', st['round'] is not None and st['round']['scores']['sam'][0] is not None and st['live']['ended'] is True)
        await S2.get_by_role('button', name='Finish').click(); await S2.wait_for_timeout(400)
        check('Sam\'s summary has no "ends the live round" note', await S2.get_by_text('Saving ends the live round').count() == 0)
        await S2.get_by_role('button', name='Save round').click(); await S2.wait_for_timeout(600)
        st = await state(S2)
        check('Sam can still save his own result', st['round'] is None and len(st['history']) == 1 and 'me' in st['history'][0]['players'])
        # ---- host deletes a live round: kept for the undo window, removed after it
        code2 = await host_live(H)
        await open_app(H)
        card = H.locator('.card', has_text='Round in progress').first
        box = await card.bounding_box(); await H.mouse.move(box['x'] + 30, box['y'] + 20); await H.mouse.down(); await H.wait_for_timeout(900); await H.mouse.up()
        await H.wait_for_timeout(300); await H.get_by_role('button', name='Delete round', exact=True).click(); await H.wait_for_timeout(500)
        check('Deleting keeps the live round online during the 5-minute undo window', code2 in DB)
        await H.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('puntaro.state.v1'));s.trash.forEach(x=>x.at-=6*60*1000);localStorage.setItem('puntaro.state.v1',JSON.stringify(s))})()")
        await open_app(H); await H.wait_for_timeout(800)
        check('Once the undo window has passed, it is removed', code2 not in DB)
        # ---- paused live round expires after 24h
        code3 = await host_live(H)
        await open_app(H); await H.get_by_role('button', name='Start a round').click(); await H.wait_for_timeout(300)
        await H.get_by_role('button', name='Start a new round').click(); await H.wait_for_timeout(300); await H.get_by_role('button', name='Tee off').click(); await H.wait_for_timeout(500)
        check('A paused live round stays online while it can be resumed', code3 in DB)
        await H.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('puntaro.state.v1'));s.parked.forEach(x=>x.at-=25*3600*1000);localStorage.setItem('puntaro.state.v1',JSON.stringify(s))})()")
        await open_app(H); await H.wait_for_timeout(800)
        check('After 24 hours the paused live round is removed', code3 not in DB)
        # ---- a player's expired paused round never deletes the host's round
        code4 = await host_live(H)
        await open_app(S2, f'?join={code4}'); await S2.wait_for_timeout(400); await S2.get_by_role('button', name='Sam').first.click(); await S2.wait_for_timeout(500)
        await open_app(S2); await S2.get_by_role('button', name='Start a round').click(); await S2.wait_for_timeout(300)
        await S2.get_by_role('button', name='Start a new round').click(); await S2.wait_for_timeout(300); await S2.get_by_role('button', name='Tee off').click(); await S2.wait_for_timeout(400)
        await S2.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('puntaro.state.v1'));s.parked.forEach(x=>x.at-=25*3600*1000);localStorage.setItem('puntaro.state.v1',JSON.stringify(s))})()")
        await open_app(S2); await S2.wait_for_timeout(800)
        check('A player\'s expired paused copy leaves the host\'s round alone', code4 in DB)
        print('page errors:', eh + es); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
