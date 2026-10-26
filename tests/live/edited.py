import asyncio, json, sys, copy
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules
SRC, OUT = sys.argv[1], sys.argv[2]; res = []; DB = {}
def check(n, ok, d=''): res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
def setp(d, path, v):
    for k in path[:-1]: d = d.setdefault(str(k), {})
    d[str(path[-1])] = v
INIT = """(()=>{let uid=localStorage.getItem('fake.uid');if(!uid){uid='u'+Math.random().toString(36).slice(2,8);localStorage.setItem('fake.uid',uid)}
const call=async(f,...a)=>{const r=JSON.parse(await window[f](uid,...a.map(x=>JSON.stringify(x))));if(r.err)throw new Error(r.err);return r.v};
window.__puntaroLiveBackend={uid,create:(c,d)=>call('__c',c,d),get:c=>call('__g',c),update:(c,p)=>call('__u',c,p),setIfAbsent:async()=>{},putBank:async()=>{},getBank:async()=>null,
watch:(c,cb)=>{let l=null,a=true;const t=async()=>{if(!a)return;const r=await call('__g',c);const s=JSON.stringify(r);if(s!==l){l=s;cb(r)}setTimeout(t,150)};t();return()=>{a=false}}};})();"""
async def phone(b):
    ctx = await b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block'); await ctx.add_init_script(INIT)
    async def c(uid, code, d): DB[json.loads(code)] = json.loads(d); return json.dumps({'v': None})
    async def g(uid, code): return json.dumps({'v': DB.get(json.loads(code))})
    async def u(uid, code, p):
        code = json.loads(code); after = copy.deepcopy(DB[code])
        for path, v in json.loads(p): setp(after, path, v)
        ok, why = rules.can_update(DB[code], after, uid)
        if not ok: return json.dumps({'err': why})
        DB[code] = after; return json.dumps({'v': None})
    for n, f in (('__c', c), ('__g', g), ('__u', u)): await ctx.expose_function(n, f)
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); return pg, errs
async def open_app(pg, q=''):
    await pg.wait_for_timeout(1000)  # let storage finish saving, as it would before a person reopens the app
    await pg.goto((SRC if SRC.startswith('http') else 'file://' + SRC) + q); await pg.wait_for_timeout(700)
    for _ in range(3):
        if await pg.locator('.splash').count(): await pg.locator('.splash').dispatch_event('pointerdown'); await pg.wait_for_timeout(400)
    await pg.wait_for_timeout(300)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); A, ea = await phone(b); B, eb = await phone(b)
        await open_app(A)
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Start a new round').click(); await A.wait_for_timeout(300)
        await A.get_by_role('switch').last.click(); await A.get_by_label('Your name for the group').fill('Pierre')
        await A.get_by_role('button', name='Tee off live').click(); await A.wait_for_timeout(900)
        code = list(DB)[0]; await A.get_by_role('button', name='Close').first.click()
        await open_app(B, f'?join={code}'); await B.wait_for_timeout(400); await B.get_by_role('button', name='Sam').first.click(); await B.wait_for_timeout(600)
        for _ in range(3): await A.get_by_role('button', name='Pierre plus one').click(); await A.wait_for_timeout(120)
        await A.get_by_role('button', name='Pierre minus one').click(); await A.wait_for_timeout(120)
        for _ in range(2): await B.get_by_role('button', name='Sam plus one').click(); await B.wait_for_timeout(120)
        await B.get_by_role('button', name='Priya plus one').click(); await B.get_by_role('button', name='Priya plus one').click()
        await asyncio.sleep(0.8)
        check('Tapping + and - on the current hole is not an edit', not DB[code].get('ed'), json.dumps(DB[code].get('ed')))
        check('...even when filling in for someone else', not (DB[code].get('ed') or {}).get('priya_0'))
        txt = await A.inner_text('body')
        check('No "edited" shown on screen', 'edited' not in txt)
        await A.get_by_role('button', name='Go to hole 2', exact=True).click(); await A.wait_for_timeout(400)
        await A.get_by_role('button', name='Go to hole 1', exact=True).click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Pierre minus one').click(); await asyncio.sleep(0.8)
        check('Going back to change a finished hole is an edit', (DB[code].get('ed') or {}).get('me_0') == 'me', json.dumps(DB[code].get('ed')))
        check('...and it shows as "edited"', await A.get_by_text('edited').count() >= 1)
        check('Sam\'s untouched score stays unmarked', 'sam_0' not in (DB[code].get('ed') or {}))
        check('Only a last initial goes online', all(len(v.get('last', '')) <= 1 for v in DB[code]['people'].values()), json.dumps({k: v.get('last') for k, v in DB[code]['people'].items()}))
        check('The round carries an expiry date for clean-up', bool(DB[code].get('expireAt')))
        print('page errors:', ea + eb); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
