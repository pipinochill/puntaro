"""Safety net keeps your pot; every score gets a name tag; the row shows the pot before and after."""
import asyncio, sys, json
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
cloud = fc.Cloud(rules)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); cloud.seed('u_a', fc.profile('Pierre'))
        A = await cloud.phone(b, 'u_a'); await fc.open_app(A, URL)
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Tee off').click(); await A.wait_for_timeout(500)
        async def clear():
            for _ in range(3):
                if await A.locator('.moment').count(): await A.locator('.moment').click(); await A.wait_for_timeout(200)
        for h in range(3):
            for n in ['You','Nic','Mitch','Greg']: await A.get_by_role('button', name=f'{n} plus one').click()
            if await A.get_by_role('button', name='Nobody hit the green').count(): await A.get_by_role('button', name='Nobody hit the green').first.click()
            await clear(); await A.get_by_role('button', name='Next hole').last.click(); await A.wait_for_timeout(400); await clear()
        await A.get_by_role('button', name='Draw the cards').click(); await A.wait_for_timeout(400)
        await A.get_by_role('button', name='Flip all').click(); await A.wait_for_timeout(400); await A.get_by_role('button', name="Let's play").click(); await A.wait_for_timeout(1500)
        st = json.loads(cloud.docs['users/u_a/state/now']['json']); r = st['round']
        r['draws'][3]['me'] = 'safe'; cloud.docs['users/u_a/state/now']['json'] = json.dumps(st)
        await fc.open_app(A, URL); await A.get_by_role('button', name='Resume scoring').click(); await A.wait_for_timeout(500)
        row = A.locator('fieldset > div.card').first
        await A.get_by_role('button', name='You plus one').click(); await A.wait_for_timeout(200)
        check('A par is tagged PAR', 'PAR' in await row.inner_text())
        await A.get_by_role('button', name='You plus one').click(); await A.wait_for_timeout(200)
        check('...a bogey BOGEY', 'BOGEY' in await row.inner_text() and 'DOUBLE' not in await row.inner_text())
        await A.get_by_role('button', name='You plus one').click(); await A.wait_for_timeout(200)
        check('...a double DOUBLE BOGEY', 'DOUBLE BOGEY' in await row.inner_text())
        await A.get_by_role('button', name='You plus one').click(); await A.wait_for_timeout(300)
        t = await row.inner_text()
        check('...a triple TRIPLE BOGEY', 'TRIPLE BOGEY' in t, t)
        check('With a Safety net, a net double bogey doesn\'t bust', 'BUST' not in t and 'SAFETY NET SAVED THE POT' in t, t)
        check('...and the pot is kept (Pot 12 → 12)', 'Pot 12 → 12' in t, t)
        nic = A.locator('fieldset > div.card').nth(1)
        for _ in range(5): await A.get_by_role('button', name='Nic plus one').click()
        await A.wait_for_timeout(300); tn = await nic.inner_text()
        check('Without one, the row shows the bust and what was lost (Pot 9 → 0)', 'BUST' in tn and 'Pot 9 → 0' in tn, tn)
        print('page errors:', A.errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
