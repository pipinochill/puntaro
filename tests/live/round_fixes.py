"""Fixing mistakes mid-round: change the play-off winner until the round is saved, and change a player's handicap
mid-round (local rounds: the scorer; live rounds: the host only, never their own, everyone sees it)."""
import asyncio, copy, sys
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
cloud = fc.Cloud(rules)
# Same plan as skins_solo.py: 15 skins go to a chip-off between You, Nic and Mitch.
PLAN = {'You': [-1, -1, 0] + [0] * 15, 'Nic': [0, -1, 0] + [0] * 15, 'Mitch': [0, 0, -1] + [0] * 15, 'Greg': [0, 0, 0] + [0] * 14 + [1]}

async def dismiss(A):
    for _ in range(4):
        if await A.locator('.moment').count(): await A.locator('.moment').click(); await A.wait_for_timeout(150)

async def playoff(b):
    cloud.seed('u_i', fc.profile('Pierre'))
    A = await cloud.phone(b, 'u_i'); await fc.open_app(A, URL)
    await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
    await A.get_by_role('group', name='Game').get_by_role('button', name='Skins').click()
    await A.locator('.card', has_text='Use handicaps').get_by_role('switch').click(); await A.wait_for_timeout(100)
    await A.evaluate('scrollTo(0, document.body.scrollHeight)')
    await A.get_by_role('button', name='Tee off').click(); await A.wait_for_timeout(500)
    for h in range(18):
        if h:
            await A.get_by_role('button', name='Next hole').last.click(); await A.wait_for_timeout(200); await dismiss(A)
        for n, plan in PLAN.items():
            d = plan[h]; await A.get_by_role('button', name=f'{n} plus one').click()
            for _ in range(abs(d)): await A.get_by_role('button', name=f'{n} {"plus" if d > 0 else "minus"} one').click()
    await A.wait_for_timeout(200)
    off = A.locator('[data-skins-off]'); done = A.locator('[data-skins-off-done]'); tick = A.locator('[data-ticker]')
    await off.get_by_role('button', name='Mitch', exact=True).click(); await A.wait_for_timeout(250); await dismiss(A)
    check('After the chip-off the result shows, with Change', 'chip-off won by Mitch' in await done.inner_text() and await done.get_by_role('button', name='Change the play-off result').count() == 1, await done.inner_text() if await done.count() else 'none')
    await A.screenshot(path=f'{OUT}/fix_playoff_done.png')
    await done.get_by_role('button', name='Change the play-off result').click(); await A.wait_for_timeout(250)
    check('Change brings the play-off back', await off.count() == 1 and await done.count() == 0)
    await off.get_by_role('button', name='Nic', exact=True).click(); await A.wait_for_timeout(250); await dismiss(A)
    check('Picking again gives the skins to the right player', (await tick.inner_text()).startswith('Nic 15') and 'chip-off won by Nic' in await done.inner_text(), await tick.inner_text())
    await A.get_by_role('button', name='Finish', exact=True).click(); await A.wait_for_timeout(400)
    if await A.get_by_role('button', name='Finish round').count(): await A.get_by_role('button', name='Finish round').click(); await A.wait_for_timeout(800)
    summ = A.locator('[data-skins-summary]')
    check('The round-complete screen can change it too (before saving)', await summ.get_by_role('button', name='Change the play-off result').count() == 1)
    await summ.get_by_role('button', name='Change the play-off result').click(); await A.wait_for_timeout(250)
    await summ.locator('[data-skins-off]').get_by_role('button', name='You', exact=True).click(); await A.wait_for_timeout(250); await dismiss(A)
    check('...and the result follows', 'chip-off won by You' in await summ.inner_text(), await summ.inner_text())
    await A.screenshot(path=f'{OUT}/fix_playoff_summary.png')
    print('page errors (play-off):', A.errs)

async def local_hcp(b):
    cloud.seed('u_h', fc.profile('Pierre'))
    A = await cloud.phone(b, 'u_h'); await fc.open_app(A, URL)
    await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
    await A.evaluate('scrollTo(0, document.body.scrollHeight)')
    await A.get_by_role('button', name='Tee off').click(); await A.wait_for_timeout(500); await dismiss(A)
    greg = A.locator('.card', has=A.get_by_role('button', name='Greg plus one'))
    before = await greg.inner_text()
    await A.get_by_role('button', name='Edit handicaps').click(); await A.wait_for_timeout(250)
    sh = A.get_by_role('dialog', name='Edit handicaps')
    check('Everyone can be changed, you included', await sh.get_by_role('button', name="Edit Greg's handicap").count() == 1 and await sh.get_by_role('button', name=__import__('re').compile("^Edit .*'s handicap$")).count() == 3 and await sh.get_by_role('button', name='Edit your handicap').count() == 1)
    await sh.get_by_role('button', name="Edit Greg's handicap").click()
    await sh.get_by_label('Handicap index').fill('99')
    check('Out of range can\'t be saved', await sh.get_by_role('button', name='Save').is_disabled())
    await sh.get_by_label('Handicap index').fill('40')
    check('It shows what they\'ll play off on this course', 'plays off 46 on this course' in await sh.inner_text(), await sh.inner_text())
    await sh.get_by_role('button', name='Save').click(); await A.wait_for_timeout(200)
    check('The sheet shows the new playing handicap, marked changed', 'Plays off 46 (changed)' in await sh.inner_text())
    await A.screenshot(path=f'{OUT}/fix_hcp_sheet.png')
    await sh.get_by_role('button', name='Close').click(); await A.wait_for_timeout(200)
    after = await greg.inner_text()
    await A.get_by_role('button', name='Edit handicaps').click(); await A.wait_for_timeout(200)
    await sh.get_by_role('button', name='Edit your handicap').click(); await sh.get_by_label('Handicap index').fill('20')
    await sh.get_by_role('button', name='Save').click(); await A.wait_for_timeout(200)
    check('You can change your own too', 'You' in await sh.inner_text() and 'Plays off 23 (changed)' in await sh.inner_text(), await sh.inner_text())
    await sh.get_by_role('button', name='Close').click(); await A.wait_for_timeout(200)
    you = A.locator('.card', has=A.get_by_role('button', name='You plus one'))
    check('...shown as changed on your card', 'plays off 23 (changed)' in await you.inner_text())
    await fc.flushed(A)
    rz = ((__import__('json').loads(cloud.user('u_h').get('people') or '{}') or {}).get('me') or {}).get('raises') or []
    check('...and raising it is noted for the fair-play checks', rz and rz[-1].get('to') == 20 and rz[-1].get('round') is True, str(rz))
    check('Strokes on the hole follow the new handicap', 'GETS A STROKE' in before.upper() and 'GETS 3 STROKES' in after.upper() and 'plays off 46 (changed)' in after, f'{before!r} -> {after!r}')
    await A.screenshot(path=f'{OUT}/fix_hcp_row.png')
    print('page errors (local hcp):', A.errs)

async def live_hcp(b):
    for u, n in (('u_p', 'Pierre'), ('u_s', 'Nic')): cloud.seed(u, fc.profile(n))
    A = await cloud.phone(b, 'u_p'); B = await cloud.phone(b, 'u_s')
    await fc.open_app(A, URL)
    await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
    await A.get_by_role('switch').last.click(); await A.get_by_label('Your name for the group').fill('Pierre')
    await A.get_by_role('button', name='Tee off live').click(); await A.wait_for_timeout(900)
    code = [k.split('/')[1] for k in cloud.docs if k.startswith('rounds/') and k.count('/') == 1][0]
    await A.get_by_role('button', name='Close').first.click()
    await fc.open_app(B, URL, f'?join={code}'); await B.wait_for_timeout(400); await B.get_by_role('button', name='Nic').first.click(); await B.wait_for_timeout(700)
    check('Only the host gets Edit handicaps', await A.get_by_role('button', name='Edit handicaps').count() == 1 and await B.get_by_role('button', name='Edit handicaps').count() == 0)
    await A.get_by_role('button', name='Edit handicaps').click(); await A.wait_for_timeout(250)
    sh = A.get_by_role('dialog', name='Edit handicaps')
    check('The host is told everyone sees it', 'Everyone in the live round sees the change' in await sh.inner_text())
    await sh.get_by_role('button', name="Edit Greg's handicap").click(); await sh.get_by_label('Handicap index').fill('40')
    await sh.get_by_role('button', name='Save').click(); await A.wait_for_timeout(800)
    check('It goes to the shared round', (cloud.live(code).get('hx') or {}).get('jake') == 46, str(cloud.live(code).get('hx')))
    await B.wait_for_timeout(800)
    check("Nic's phone sees Greg's new handicap, marked changed", 'plays off 46 (changed)' in await B.inner_text('body'))
    await B.screenshot(path=f'{OUT}/fix_hcp_live_other.png')
    # Attacks, checked against the rules
    d = cloud.live(code); t = d['updatedAt'] + 1
    def tryw(uid, mod, host=False):
        a = copy.deepcopy(d); mod(a); a['updatedAt'] = t
        if host: a['hostAt'] = t
        return rules.can_update(d, a, uid, t)[0]
    check('A player can\'t change handicaps', not tryw('u_s', lambda a: (a['hx'].__setitem__('sam', 0), a.__setitem__('hw', 'sam'))))
    check('The host can change their own (everyone sees it)', tryw('u_p', lambda a: (a['hx'].__setitem__('me', 20), a.__setitem__('hw', 'me')), True))
    check('...or two at once', not tryw('u_p', lambda a: (a['hx'].__setitem__('sam', 1), a['hx'].__setitem__('priya', 1), a.__setitem__('hw', 'sam')), True))
    check('...or remove a change to hide it', not tryw('u_p', lambda a: (a['hx'].pop('jake'), a.__setitem__('hw', 'jake')), True))
    check('...or set a silly number', not tryw('u_p', lambda a: (a['hx'].__setitem__('sam', 99), a.__setitem__('hw', 'sam')), True))
    check('...or a player not in the round', not tryw('u_p', lambda a: (a['hx'].__setitem__('zed', 5), a.__setitem__('hw', 'zed')), True))
    check('But the host can change another player', tryw('u_p', lambda a: (a['hx'].__setitem__('sam', 5), a.__setitem__('hw', 'sam')), True))
    print('page errors (live):', A.errs, B.errs)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        await playoff(b); await local_hcp(b); await live_hcp(b)
        print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
