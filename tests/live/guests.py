"""Recent guests: an x on each guest in the Add a friend list removes them, with Undo in case of a slip."""
import asyncio, sys
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
        sheet = A.get_by_role('dialog')
        for n in ('Tom', 'Bazza', 'Shazza'):
            await A.get_by_role('button', name='+ Guest').click(); await A.wait_for_timeout(300)
            await A.get_by_label('Name', exact=True).fill(n); await A.get_by_label('Last name').fill('Jones')
            await A.get_by_role('button', name='No handicap', exact=True).click(); await A.get_by_role('button', name='100 to 109', exact=True).click()
            await A.get_by_role('button', name='Add to round').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='+ Friend').click(); await A.wait_for_timeout(300)
        x = sheet.get_by_role('button', name='Remove Tom from recent guests')
        check('Each recent guest has an x', await x.count() == 1 and await sheet.get_by_role('button', name='Remove Bazza from recent guests').count() == 1)
        await A.screenshot(path=f'{OUT}/guests_list.png')
        await x.click(); await A.wait_for_timeout(300)
        check('Tapping it takes them off the list', await sheet.get_by_text('Tom', exact=True).count() == 0)
        check('...and offers Undo', await sheet.get_by_text('Tom removed from recent guests.').count() == 1 and await sheet.get_by_role('button', name='Undo').count() == 1)
        await A.screenshot(path=f'{OUT}/guests_undo.png')
        await sheet.get_by_role('button', name='Undo').click(); await A.wait_for_timeout(300)
        check('Undo puts them back', await sheet.get_by_text('Tom', exact=True).count() == 1 and await sheet.get_by_role('button', name='Undo').count() == 0)
        await sheet.get_by_role('button', name='Remove Shazza from recent guests').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Close').first.click(); await A.wait_for_timeout(300)
        check('A removed guest also leaves this round\'s players', await A.get_by_role('button', name='Remove Shazza').count() == 0)
        await fc.flushed(A)
        await fc.open_app(A, URL); await A.wait_for_timeout(500)
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
        if await A.get_by_role('button', name='+ Friend').count() == 0: await A.get_by_role('button', name='Start a new round').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='+ Friend').click(); await A.wait_for_timeout(300)
        check('It stays removed after reopening the app', await sheet.get_by_text('Shazza', exact=True).count() == 0 and await sheet.get_by_text('Tom', exact=True).count() == 1)
        print('page errors:', A.errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
