import asyncio, json, sys, copy
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules
SRC, OUT = sys.argv[1], sys.argv[2]; res = []
import fakecloud as fc
cloud = fc.Cloud(rules)
for u, n in (('u_pierre', 'Pierre'), ('u_sam', 'Sam')): cloud.seed(u, fc.profile(n))
class _Rounds:
    def __getitem__(self, code): return cloud.docs[f'rounds/{code}']
    def __iter__(self): return iter([k.split('/')[1] for k in cloud.docs if k.startswith('rounds/') and k.count('/') == 1])
DB = _Rounds()
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
NEXT = iter(['u_pierre', 'u_sam'])
async def phone(b):
    pg = await cloud.phone(b, next(NEXT)); return pg, pg.errs
async def open_app(pg, q=''):
    await fc.open_app(pg, SRC, q)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); A, ea = await phone(b); B, eb = await phone(b)
        await open_app(A)
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
        if await A.get_by_role('button', name='Start a new round').count(): await A.get_by_role('button', name='Start a new round').click(); await A.wait_for_timeout(300)
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
        check('No expiry date: finished rounds are kept for everyone', 'expireAt' not in DB[code])
        print('page errors:', ea + eb); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
