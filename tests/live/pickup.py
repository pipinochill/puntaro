"""P for a pick-up: counts as net double bogey (a bust), shows P on the row and the scoresheet, syncs in live rounds,
and tapping + or − after a pick-up turns it back into a normal score."""
import asyncio, json, sys
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
        await A.evaluate('scrollTo(0, document.body.scrollHeight)'); await A.get_by_role('button', name='Tee off').click(); await A.wait_for_timeout(400)
        row = lambda n: A.locator('.card', has=A.get_by_role('button', name=f'{n} plus one'))
        # You (14.2) get a stroke on hole 1 (index 7); Nic (8.4) doesn't
        await A.get_by_role('button', name='Nic plus one').click(); await A.get_by_role('button', name='Nic plus one').click()  # bogey, pot builds? (1 pt)
        await A.get_by_role('button', name='You picked up').click(); await A.wait_for_timeout(300)
        t = await row('You').inner_text()
        check('P marks a pick-up on the row', 'PICK UP (7)' in t and await row('You').get_by_text('P', exact=True).count() >= 1, t)
        check('...counted as net double bogey: par 4 + 2 + your stroke = 7, so it busts', 'BUST' in t, t)
        check('...and the P button shows it\'s on', await A.get_by_role('button', name='You picked up').get_attribute('aria-pressed') == 'true')
        await A.screenshot(path=f'{OUT}/pickup_row.png')
        await A.get_by_role('button', name='Nic picked up').click(); await A.wait_for_timeout(200)
        check('Nic gets a stroke here too, so his pick-up also counts 7', 'PICK UP (7)' in await row('Nic').inner_text())
        await A.get_by_role('button', name='Nic minus one').click(); await A.wait_for_timeout(200)
        t = await row('Nic').inner_text()
        check('Tapping − after a pick-up makes it a normal score again (6)', 'PICK UP' not in t and 'BOGEY' in t and await A.get_by_role('button', name='Nic picked up').get_attribute('aria-pressed') == 'false', t)
        await A.get_by_role('button', name='Mitch plus one').click(); await A.get_by_role('button', name='Mitch picked up').click(); await A.get_by_role('button', name='Mitch picked up').click(); await A.wait_for_timeout(200)
        check('Tapping P again takes the pick-up off', 'PICK UP' not in await row('Mitch').inner_text())
        await A.get_by_role('button', name='Greg plus one').click()
        await A.get_by_role('button', name='Next hole').last.click(); await A.wait_for_timeout(400)
        for _ in range(3):
            if await A.locator('.moment').count(): await A.locator('.moment').click(); await A.wait_for_timeout(200)
        await A.get_by_role('button', name='Finish', exact=True).click(); await A.wait_for_timeout(500)
        if await A.get_by_role('button', name='Finish round').count(): await A.get_by_role('button', name='Finish round').click(); await A.wait_for_timeout(600)
        body = await A.locator('body').inner_text()
        check('The scoresheet shows P (and explains it)', 'P picked up (counts as net double bogey)' in body and await A.locator('[title="Picked up (counts as 7)"]').count() >= 1)
        await A.screenshot(path=f'{OUT}/pickup_sheet.png')
        print('page errors:', A.errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
