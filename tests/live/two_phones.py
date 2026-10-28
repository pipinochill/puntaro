import asyncio, json, sys
from playwright.async_api import async_playwright
SRC=sys.argv[1]; OUT=sys.argv[2]
DB={}
def setp(d,path,v):
    for k in path[:-1]: d=d.setdefault(str(k),{})
    d[str(path[-1])]=v
def getp(d,path):
    for k in path:
        if not isinstance(d,dict) or str(k) not in d: return None
        d=d[str(k)]
    return d
INIT="""
(()=>{let uid=localStorage.getItem('fake.uid');if(!uid){uid='u'+Math.random().toString(36).slice(2,8);localStorage.setItem('fake.uid',uid)}
window.__puntaroLiveBackend={uid,
 create:(c,d)=>window.__fb_create(c,JSON.stringify(d)),
 get:async c=>{const r=await window.__fb_get(c);return r?JSON.parse(r):null},
 update:(c,p)=>window.__fb_update(c,JSON.stringify(p)),
 setIfAbsent:(c,p,v)=>window.__fb_sia(c,JSON.stringify(p),JSON.stringify(v)),
 watch:(c,cb)=>{let last=null,alive=true;const t=async()=>{if(!alive)return;const r=await window.__fb_get(c);if(r!==last){last=r;cb(r?JSON.parse(r):null)}setTimeout(t,200)};t();return()=>{alive=false}}};})();
"""
async def phone(b,name):
    ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=1.5,service_workers='block')
    await ctx.add_init_script(INIT)
    async def create(c,d): DB[c]=json.loads(d)
    async def get(c): return json.dumps(DB[c]) if c in DB else None
    async def update(c,p):
        for path,v in json.loads(p): setp(DB[c],path,v)
    async def sia(c,p,v):
        p=json.loads(p)
        if c in DB and getp(DB[c],p) is None: setp(DB[c],p,json.loads(v))
    for n,f in [('__fb_create',create),('__fb_get',get),('__fb_update',update),('__fb_sia',sia)]: await ctx.expose_function(n,f)
    pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(f'{name}: {e}'))
    await pg.goto('file://'+SRC); await pg.wait_for_timeout(800)
    for _ in range(3):
        if await pg.locator('.splash').count(): await pg.locator('.splash').dispatch_event('pointerdown'); await pg.wait_for_timeout(450)
    return pg,errs
async def shot(pg,n,full=False): await pg.wait_for_timeout(500); await pg.screenshot(path=f'{OUT}/{n}.png',full_page=full)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        A,ea=await phone(b,'A'); B,eb=await phone(b,'B')
        # Phone A starts a live round
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(400)
        if await A.get_by_role('button', name='Start a new round').count(): await A.get_by_role('button', name='Start a new round').click(); await A.wait_for_timeout(300)
        await A.get_by_role('switch').last.click()
        await A.get_by_label('Your name for the group').fill('Pierre')
        await shot(A,'a1_setup_live',True)
        await A.get_by_role('button',name='Tee off live').click(); await A.wait_for_timeout(900)
        code=(await A.locator('.px').filter(has_text='PUNT-').first.inner_text()).strip()
        print('code',code, 'docs',list(DB))
        await shot(A,'a2_live_sheet')
        await A.get_by_role('button',name='Close').first.click()
        # Phone B joins as Sam
        await B.get_by_role('button',name='Join a live round').click()
        await B.get_by_label('Join code').fill(code.replace('PUNT-','').lower())
        await B.get_by_role('button',name='Find').click(); await B.wait_for_timeout(600)
        await shot(B,'b1_pick_player')
        await B.get_by_role('button',name='Sam').first.click(); await B.wait_for_timeout(900)
        print('claims',DB[code]['claims'])
        # A is on hole 1? B lands on first open hole
        hA=await A.locator('.px').nth(0).inner_text() if False else None
        # A scores Pierre and Priya; B scores Sam
        await A.get_by_role('button',name='Pierre plus one').click(); await A.wait_for_timeout(150)
        await A.get_by_role('button',name='Priya plus one').click()
        await B.get_by_role('button',name='Sam minus one').click(); await B.wait_for_timeout(150)
        await B.get_by_role('button',name='Sam minus one').click()
        await A.wait_for_timeout(1200); await B.wait_for_timeout(300)
        print('doc scores',json.dumps(DB[code]['s']), 'by',json.dumps(DB[code]['by']))
        await shot(A,'a3_after_scores',True); await shot(B,'b2_after_scores',True)
        # bank rights on B (each mode): Sam's chip enabled, Pierre's disabled
        bank=await B.evaluate("[...document.querySelectorAll('button')].filter(b=>/Bank after hole|Banking after hole|Bank locked|Forced bank/.test(b.textContent)).map(b=>b.disabled)")
        print('B bank chips disabled per player',bank)
        # host switches to one scorer
        await A.get_by_role('button',name='Live round details').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button',name='One scorer').click(); await A.wait_for_timeout(1000)
        await shot(A,'a4_sheet_players')
        print('scoring',DB[code]['scoring'])
        await B.wait_for_timeout(600)
        dis=await B.evaluate("(()=>{const f=document.querySelector('fieldset');return f?f.disabled:null})()")
        print('B read-only after switch',dis)
        await shot(B,'b3_watching',False)
        print('errors',ea+eb)
        await b.close()
asyncio.run(main())
