"""Me: the player's name is shown plainly (and heads the page); Edit is there to fix a mistake."""
import asyncio, json, sys
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
cloud = fc.Cloud(rules)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); cloud.seed('u_m', fc.profile('Pierre', last='Bobillier'))
        A = await cloud.phone(b, 'u_m'); await fc.open_app(A, URL)
        await A.get_by_role('button', name='Me', exact=True).click(); await A.wait_for_timeout(300)
        h1 = await A.locator('h1').first.inner_text()
        check("Me is headed with the player's name", h1 == 'Pierre Bobillier', h1)
        card = A.locator('.card', has_text='Your name')
        check('The name is shown plainly, with no boxes to type in', await card.get_by_text('Pierre Bobillier').count() == 1 and await A.get_by_label('Your first name').count() == 0)
        check('...and says what friends see', await card.get_by_text('Friends see Pierre B.').count() == 1)
        check('"Your initials" is gone', await A.get_by_text('Your initials').count() == 0)
        await A.screenshot(path=f'{OUT}/me_name.png', clip={'x': 0, 'y': 0, 'width': 390, 'height': 360})
        await card.get_by_role('button', name='Edit').click(); await A.wait_for_timeout(200)
        check('Edit opens first and last name boxes, filled in', await A.get_by_label('Your first name').input_value() == 'Pierre' and await A.get_by_label('Your last name').input_value() == 'Bobillier')
        await A.get_by_label('Your first name').fill('Pete'); await A.get_by_role('button', name='Cancel').click(); await A.wait_for_timeout(200)
        check('Cancel leaves the name alone', await A.locator('h1').first.inner_text() == 'Pierre Bobillier')
        await card.get_by_role('button', name='Edit').click(); await A.get_by_label('Your first name').fill('')
        check("A blank first name can't be saved", await A.get_by_role('button', name='Save').is_disabled())
        await A.get_by_label('Your first name').fill('Pete'); await A.screenshot(path=f'{OUT}/me_name_edit.png', clip={'x': 0, 'y': 0, 'width': 390, 'height': 520})
        await A.get_by_role('button', name='Save').click(); await A.wait_for_timeout(300); await fc.flushed(A)
        check('Save updates it everywhere', await A.locator('h1').first.inner_text() == 'Pete Bobillier' and (cloud.user('u_m') or {}).get('first') == 'Pete', str((cloud.user('u_m') or {}).get('first')))
        print('page errors:', A.errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
