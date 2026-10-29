"""Home says hello: a line with your first name above the HCP, a different one each time the app opens."""
import asyncio, sys
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
cloud = fc.Cloud(rules)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        A = await cloud.phone(b, 'u_pierre', signed_in=False); await fc.open_app(A, URL)
        await A.get_by_role('button', name='Continue with Google').click(); await A.wait_for_timeout(700)
        await A.get_by_label('First name').fill('Pierre'); await A.get_by_label('Last name').fill('Bobillier'); await fc.next_step(A)
        await A.get_by_role('button', name='I have a handicap', exact=True).click(); await A.get_by_label('Handicap index').fill('18.4')
        await fc.lets_play(A); await A.wait_for_timeout(900)
        g = A.locator('.greet')
        t = await g.inner_text() if await g.count() else ''
        check('Home greets you by first name', 'Pierre' in t and 'Bobillier' not in t, t)
        check('...with the handicap still shown under it', await A.get_by_text('HCP 18.4', exact=True).count() == 1)
        await A.screenshot(path=f'{OUT}/greet_home.png', clip={'x': 0, 'y': 0, 'width': 390, 'height': 260})
        seen = [t]
        for _ in range(8):
            await fc.open_app(A, URL); await A.wait_for_timeout(500)
            seen.append(await g.inner_text())
        check('A new line each time the app opens', all(seen[i] != seen[i + 1] for i in range(len(seen) - 1)), ' | '.join(seen))
        check('...and plenty of variety', len(set(seen)) >= 4, str(len(set(seen))))
        target = [s for s in seen if 'Ready to' in s]
        check('A handicap of 18.4 is aimed at breaking 90 (if that line came up)', all('break 90' in s for s in target), str(target))
        print('lines seen:', *sorted(set(seen)), sep='\n  ')
        print('page errors:', A.errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
