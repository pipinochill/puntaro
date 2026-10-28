"""Screen stays on during a round and darkens after 30 quiet seconds (tap to wake, without pressing what's underneath).
Feedback can be sent from the Alpha pop-up."""
import asyncio, sys
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
WAKE = """window.__locks = 0; window.__held = 0;
Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: async () => { window.__locks++; window.__held++; let done = false;
  return { release: async () => { if (!done) { done = true; window.__held--; } } }; } } });"""
cloud = fc.Cloud(rules)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); cloud.seed('u_w', fc.profile('Pierre'))
        A = await cloud.phone(b, 'u_w', extra_init=WAKE); await fc.open_app(A, URL)
        check('No wake lock on Home', await A.evaluate('window.__held') == 0)
        await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
        await A.evaluate('scrollTo(0, document.body.scrollHeight)')
        await A.get_by_role('button', name='Tee off').click(); await A.wait_for_timeout(600)
        check('Teeing off keeps the screen on', await A.evaluate('window.__held') == 1)
        await A.get_by_role('button', name='You plus one').click()
        await A.wait_for_timeout(31500)
        dim = A.locator('.dimmer')
        check('After 30 quiet seconds the screen darkens', await dim.count() == 1)
        await A.screenshot(path=f'{OUT}/awake_dim.png')
        box = await A.get_by_role('button', name='You plus one').bounding_box()
        await A.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2); await A.wait_for_timeout(300)
        check('A tap wakes it', await dim.count() == 0)
        check('...without pressing the button underneath', (await A.locator('.holeno').inner_text()) == '1' and await A.get_by_text('PAR', exact=True).count() >= 1 and await A.get_by_text('BOGEY', exact=True).count() == 0)
        await A.get_by_role('button', name='Back').first.click() if await A.get_by_role('button', name='Back').count() else await A.locator('.stripes button').first.click()
        await A.wait_for_timeout(500)
        check('Leaving the round lets the screen lock again', await A.evaluate('window.__held') == 0, str(await A.evaluate('window.__held')))
        # setting
        await A.get_by_role('button', name='Me', exact=True).click(); await A.wait_for_timeout(300)
        check('Me has a Keep screen on setting', await A.get_by_text('Keep screen on in a round').count() == 1)
        row = A.locator('.card', has_text='Keep screen on in a round')
        await row.get_by_role('switch').click(); await A.wait_for_timeout(200)
        await A.get_by_role('button', name='Home', exact=True).click(); await A.wait_for_timeout(300)
        n0 = await A.evaluate('window.__locks')
        await A.get_by_role('button', name='Resume scoring').click(); await A.wait_for_timeout(600)
        check('Turned off, a round leaves the screen alone', await A.evaluate('window.__locks') == n0 and await A.evaluate('window.__held') == 0)
        # feedback
        await A.locator('.stripes button').first.click(); await A.wait_for_timeout(400)
        if await A.get_by_role('button', name='Home', exact=True).count(): await A.get_by_role('button', name='Home', exact=True).click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='About this alpha').first.click(); await A.wait_for_timeout(300)
        sheet = A.get_by_role('dialog')
        check('The Alpha pop-up has Send feedback', await sheet.get_by_label('Your feedback').count() == 1)
        check('...and the button waits for some words', await sheet.get_by_role('button', name='Send feedback').is_disabled())
        await sheet.get_by_label('Your feedback').fill('Bank button hard to find on hole 9'); await A.wait_for_timeout(100)
        await A.screenshot(path=f'{OUT}/feedback_form.png')
        await sheet.get_by_role('button', name='Send feedback').click(); await A.wait_for_timeout(800)
        fb = [v for k, v in cloud.docs.items() if k.startswith('feedback/')]
        check('Sending saves it, with the version and who sent it', len(fb) == 1 and fb[0]['text'] == 'Bank button hard to find on hole 9' and fb[0]['uid'] == 'u_w' and fb[0].get('version'), str(fb))
        check('...and says thanks', await sheet.get_by_text('Thanks! Got it.').count() == 1)
        await A.screenshot(path=f'{OUT}/feedback_sent.png')
        bad = await A.evaluate("window.__fake.raw('feedback/x1', 'get').then(() => 'read', e => 'denied')")
        check('Nobody can read feedback back through the app', bad == 'denied', bad)
        print('page errors:', A.errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
