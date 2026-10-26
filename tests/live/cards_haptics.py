"""Cards always come up, new holes start at the top of the page, and haptics buzz for the right moments."""
import asyncio, sys
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
cloud = fc.Cloud(rules)
VIB = "window.__buzz=[];navigator.vibrate=p=>{window.__buzz.push(p);return true};"
buzzes = lambda pg: pg.evaluate('window.__buzz.length')

async def start(pg, live=None):
    await pg.get_by_role('button', name='Start a round').click(); await pg.wait_for_timeout(300)
    if live:
        await pg.get_by_role('switch').last.click(); await pg.get_by_label('Your name for the group').fill('Pierre')
        await pg.get_by_role('button', name=live, exact=True).click()
        await pg.get_by_role('button', name='Tee off live').click(); await pg.wait_for_timeout(1200)
        await pg.get_by_role('button', name='Close').first.click()
    else:
        await pg.get_by_role('button', name='Tee off').click(); await pg.wait_for_timeout(600)

async def play_hole(pg, only=None):
    for x in await pg.locator('button[aria-label$="plus one"]').all():
        if only and not (await x.get_attribute('aria-label')).startswith(only): continue
        await x.click(); await pg.wait_for_timeout(40)
    if await pg.get_by_role('button', name='Nobody').count(): await pg.get_by_role('button', name='Nobody').first.click(); await pg.wait_for_timeout(100)

async def to_cards(pg, only=None):
    """Play holes until the last-chance-to-bank sheet comes up, then draw."""
    for _ in range(18):
        await play_hole(pg, only); await pg.get_by_role('button', name='Next hole').last.click(); await pg.wait_for_timeout(400)
        if await pg.get_by_role('button', name='Draw the cards').count():
            await pg.get_by_role('button', name='Draw the cards').click(); await pg.wait_for_timeout(1200); return

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # ---- solo: scroll to top and haptics
        cloud.seed('u_a', fc.profile('Pierre'))
        A = await cloud.phone(b, 'u_a', extra_init=VIB); await fc.open_app(A, URL); await start(A)
        n0 = await buzzes(A)
        await A.locator('button[aria-label$="plus one"]').first.click(); await A.wait_for_timeout(100)
        check('Entering a score gives a little buzz', await buzzes(A) > n0)
        await play_hole(A)
        await A.evaluate('scrollTo(0, 600)'); y0 = await A.evaluate('scrollY')
        n1 = await buzzes(A)
        await A.get_by_role('button', name='Next hole').last.click(); await A.wait_for_timeout(900)
        check('Next hole goes back to the top of the page', y0 > 200 and await A.evaluate('scrollY') == 0, f'{y0} -> {await A.evaluate("scrollY")}')
        check('...with a buzz', await buzzes(A) > n1)
        await to_cards(A)
        check('Solo: Draw the cards brings up the cards', await A.get_by_role('dialog', name='Draw your cards').count() == 1)
        n2 = await buzzes(A); await A.get_by_role('button', name='Flip all').click(); await A.wait_for_timeout(900)
        check('Flipping cards buzzes', await buzzes(A) > n2)
        await A.get_by_role('button', name="Let's play").click(); await A.wait_for_timeout(300)
        await A.get_by_role('button', name='Me', exact=True).count()
        # turning vibration off
        await A.evaluate("localStorage.setItem('puntaro.haptics','off')"); await fc.open_app(A, URL)
        await A.get_by_role('button', name='Resume round').first.click() if await A.get_by_role('button', name='Resume round').count() else None
        await A.wait_for_timeout(300); n3 = await buzzes(A)
        if await A.locator('button[aria-label$="plus one"]').first.count():
            await A.locator('button[aria-label$="plus one"]').first.click(); await A.wait_for_timeout(100)
            check('With vibration off, nothing buzzes', await buzzes(A) == n3)

        # ---- live, one scorer, the network refuses the deal: cards still come up, and it's saved once it can be
        orig = rules.can_update; block = {'on': True}
        def guarded(before, after, uid, now=None):
            if block['on'] and 'draws' in rules.affected(after, before): return False, 'offline'
            return orig(before, after, uid, now)
        rules.can_update = guarded
        cloud.seed('u_b', fc.profile('Pierre'))
        B = await cloud.phone(b, 'u_b'); await fc.open_app(B, URL); await start(B, 'One scorer')
        code = [k.split('/')[1] for k in cloud.docs if k.startswith('rounds/') and k.count('/') == 1][-1]
        await to_cards(B)
        check('Live with no connection: the cards still come up', await B.get_by_role('dialog', name='Draw your cards').count() == 1)
        check('...and aren\'t saved yet', not (cloud.live(code).get('draws') or {}))
        block['on'] = False; await B.wait_for_timeout(5000)
        check('...then saved for the group once the connection is back', bool(cloud.live(code).get('draws')))
        rules.can_update = orig

        # ---- live, everyone scores: cards wait for a player who hasn't moved on, and say who
        cloud.seed('u_c', fc.profile('Pierre')); cloud.seed('u_s', fc.profile('Sam'))
        C = await cloud.phone(b, 'u_c'); await fc.open_app(C, URL); await start(C, 'Everyone scores')
        code = [k.split('/')[1] for k in cloud.docs if k.startswith('rounds/') and k.count('/') == 1][-1]
        S = await cloud.phone(b, 'u_s'); await fc.open_app(S, URL, q=f'?join={code}'); await S.wait_for_timeout(500)
        await S.get_by_role('button', name='Sam').first.click(); await S.wait_for_timeout(700)
        await to_cards(C, 'Pierre')
        check('Everyone scores: cards wait while Sam is still on an earlier hole', await C.get_by_role('dialog', name='Draw your cards').count() == 0)
        check('...and the page says who it\'s waiting for', await C.get_by_text('Waiting for Sam to move on.').count() == 1)
        await C.screenshot(path=f'{OUT}/cards_wait.png')
        await to_cards(S, 'Sam')
        await C.wait_for_timeout(1500)
        check('...then the cards come up on both phones', await C.get_by_role('dialog', name='Draw your cards').count() == 1 and await S.get_by_role('dialog', name='Draw your cards').count() == 1)

        errs = sum([x.errs for x in (A, B, C, S)], [])
        print('page errors:', errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
