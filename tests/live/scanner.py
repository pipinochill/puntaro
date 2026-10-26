"""Scan-to-join and live start-up tests.
The joining phone gets a fake camera (a video of the host's QR code, tilted, blurred, noisy).
Frames the app grabs from that camera are decoded by OpenCV, standing in for the phone's QR reader."""
import asyncio, base64, copy, json, subprocess, sys
import cv2, numpy as np
from playwright.async_api import async_playwright
HERE = sys.argv[3]; sys.path.insert(0, HERE); import rules
SRC, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
import fakecloud as fc
cloud = fc.Cloud(rules)
NAMES = iter(['u_host', 'u_sam', 'u_other', 'u_iphone', 'u_blocked'])
for u in ['u_host', 'u_sam', 'u_other', 'u_iphone', 'u_blocked']: cloud.seed(u, fc.profile(u.split('_')[1].title()))
class _Rounds:
    def __getitem__(self, code): return cloud.docs[f'rounds/{code}']
    def __iter__(self): return iter([k.split('/')[1] for k in cloud.docs if k.startswith('rounds/') and k.count('/') == 1])
    def __bool__(self): return any(True for _ in self)
DB = _Rounds()
class _Fail(dict):
    def __setitem__(self, k, v): cloud.fail_create = v
    def clear(self): cloud.fail_create = None
FAIL_CREATE = _Fail()
# Camera hooks: remember the stream so tests can check the camera switches off.
CAM = """(()=>{const g=navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
if(g)navigator.mediaDevices.getUserMedia=async c=>{const s=await g(c);window.__lastStream=s;return s};})();"""
DETECTOR = """window.BarcodeDetector=class{static async getSupportedFormats(){return['qr_code']}
async detect(v){if(!v.videoWidth)return[];const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;
c.getContext('2d').drawImage(v,0,0);window.__frames=(window.__frames||0)+1;const t=await window.__cv(c.toDataURL('image/png'));return t?[{rawValue:t}]:[]}};"""
NO_DETECTOR = "delete window.BarcodeDetector;"

async def phone(b, extra='', perms=True):
    pg = await cloud.phone(b, next(NAMES), extra_init=CAM + extra, permissions=['camera'] if perms else [])
    async def cv(url):
        img = cv2.imdecode(np.frombuffer(base64.b64decode(url.split(',')[1]), np.uint8), cv2.IMREAD_GRAYSCALE)
        for d in (cv2.QRCodeDetector(), cv2.QRCodeDetectorAruco()):
            t = d.detectAndDecode(img)[0]
            if t: return t
        return None
    await pg.context.expose_function('__cv', cv)
    return None, pg, pg.errs

async def open_app(pg, q=''):
    await fc.open_app(pg, SRC, q)

def make_video(text, name):
    subprocess.run(['node', f'{HERE}/cam/mkvideo.mjs', text, f'{HERE}/cam/{name}.json'], check=True)
    subprocess.run(['python3', f'{HERE}/cam/mkvideo.py', f'{HERE}/cam/{name}.json', f'{HERE}/cam/{name}.y4m'], check=True, capture_output=True)
    return f'{HERE}/cam/{name}.y4m'

def cam_args(video): return ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', f'--use-file-for-fake-video-capture={video}']

async def start_live(pg):
    await pg.get_by_role('button', name='Start a round').click(); await pg.wait_for_timeout(300)
    if await pg.get_by_role('button', name='Start a new round').count(): await pg.get_by_role('button', name='Start a new round').click(); await pg.wait_for_timeout(300)
    await pg.get_by_role('switch').last.click(); await pg.get_by_label('Your name for the group').fill('Pierre')
    await pg.get_by_role('button', name='Tee off live').click()

async def main():
    async with async_playwright() as p:
        # ---------- host: start-up failures are explained, no fake code shown
        hb = await p.chromium.launch()
        _, H, eh = await phone(hb)
        await open_app(H)
        FAIL_CREATE['code'] = 'permission-denied'
        await start_live(H); await H.wait_for_timeout(800)
        txt = await H.get_by_role('dialog', name='Live round').inner_text()
        check('If Firebase turns the round down, the host is told why', "didn't start" in txt and 'firestore.rules' in txt, txt[:120])
        check('...and no join code is shown', 'PUNT-' not in txt and not DB)
        await H.screenshot(path=f'{OUT}/c_fail.png')
        await H.get_by_role('button', name='OK', exact=True).click()
        check('...and they carry on scoring the round on their own phone', await H.get_by_role('button', name='Next hole').count() >= 1)
        await open_app(H)
        FAIL_CREATE['code'] = 'auth/admin-restricted-operation'
        await start_live(H); await H.wait_for_timeout(800)
        txt = await H.get_by_role('dialog', name='Live round').inner_text()
        check('A sign-in method switched off in Firebase is explained', "sign-in method isn't switched on" in txt, txt[:160])
        await H.get_by_role('button', name='OK', exact=True).click()
        await open_app(H)
        FAIL_CREATE.clear()
        await start_live(H); await H.wait_for_timeout(900)
        code = list(DB)[0]
        check('When it works, the code sheet opens by itself', await H.get_by_text(code).count() >= 1)
        await H.get_by_role('button', name='Close').first.click()
        await open_app(H)
        await H.get_by_role('button', name='Show join code').click(); await H.wait_for_timeout(300)
        check('The LIVE badge on Home reopens the code', await H.get_by_text(code).count() >= 1)
        await H.screenshot(path=f'{OUT}/c_home_badge.png')

        # ---------- joiner with a camera pointed at the host's QR
        video = make_video(f'https://pipinochill.github.io/puntaro/?join={code}', 'host')
        jb = await p.chromium.launch(args=cam_args(video))
        _, J, ej = await phone(jb, DETECTOR)
        await open_app(J)
        await J.get_by_role('button', name='Join a live round').click(); await J.wait_for_timeout(300)
        check('Join a live round has a Scan QR code button', await J.get_by_role('button', name='Scan QR code').count() == 1)
        await J.screenshot(path=f'{OUT}/c_join.png')
        await J.get_by_role('button', name='Scan QR code').click(); await J.wait_for_timeout(250)
        await J.screenshot(path=f'{OUT}/c_scanning.png')
        await J.wait_for_selector('text=Which one are you?', timeout=15000)
        frames = await J.evaluate('window.__frames || 0')
        check('Scanning the host\'s QR (tilted, blurry, noisy) finds the round', True)
        print('   frames grabbed from the camera:', frames)
        ended = await J.evaluate("window.__lastStream ? window.__lastStream.getTracks().every(t=>t.readyState==='ended') : null")
        check('The camera switches off as soon as it has the code', ended is True, str(ended))
        await J.get_by_role('button', name='Nic').first.click(); await J.wait_for_timeout(700)
        check('...and joining works from there', (DB[code]['claims'] or {}).get('sam') is not None)
        await J.screenshot(path=f'{OUT}/c_joined.png')

        # ---------- a QR code that isn't a Puntaro round
        other = make_video('https://example.com/menu', 'other')
        ob = await p.chromium.launch(args=cam_args(other))
        _, O, eo = await phone(ob, DETECTOR)
        await open_app(O)
        await O.get_by_role('button', name='Join a live round').click(); await O.wait_for_timeout(300)
        await O.get_by_role('button', name='Scan QR code').click()
        await O.wait_for_timeout(4000)
        hint = await O.get_by_role('dialog', name='Scan QR code').inner_text()
        check('A QR code that isn\'t a Puntaro round is ignored, with a hint', "isn't a Puntaro round" in hint, hint)
        await O.get_by_role('button', name='Cancel').click(); await O.wait_for_timeout(300)
        ended = await O.evaluate("window.__lastStream.getTracks().every(t=>t.readyState==='ended')")
        check('Cancel switches the camera off', ended is True)

        # ---------- iPhone path: no built-in reader, so jsQR is loaded
        fb = await p.chromium.launch(args=cam_args(video))
        _, F, ef = await phone(fb, NO_DETECTOR)
        calls = []
        async def fake_jsqr(route):
            calls.append(1)
            # Stand-in for jsQR with the same call shape: jsQR(rgba, width, height) -> { data }.
            await route.fulfill(content_type='application/javascript', body=f"""window.jsQR=function(d,w,h){{window.__jsqr={{len:d.length,w:w,h:h}};
              return (d.length===w*h*4&&w>0&&w<=640)?{{data:'https://pipinochill.github.io/puntaro/?join={code}'}}:null}};""")
        await F.route('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js', fake_jsqr)
        await open_app(F)
        await F.get_by_role('button', name='Join a live round').click(); await F.wait_for_timeout(300)
        await F.get_by_role('button', name='Scan QR code').click()
        await F.wait_for_selector('text=Which one are you?', timeout=15000)
        info = await F.evaluate('window.__jsqr')
        check('Without a built-in reader, jsQR is loaded and fed camera frames', len(calls) == 1 and info and info['w'] <= 640, json.dumps(info))

        # ---------- camera blocked
        nb = await p.chromium.launch(args=['--use-fake-device-for-media-stream'])
        # What iPhone Safari and Android Chrome report when someone taps "Don't Allow".
        DENY = "navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Permission denied','NotAllowedError')};"
        _, N, en = await phone(nb, DETECTOR + DENY, perms=False)
        await open_app(N)
        await N.get_by_role('button', name='Join a live round').click(); await N.wait_for_timeout(300)
        await N.get_by_role('button', name='Scan QR code').click(); await N.wait_for_timeout(2500)
        msg = await N.get_by_role('dialog', name='Join a live round').inner_text()
        check('If the camera is blocked, the player is told how to fix it', 'Camera access is blocked' in msg and 'site settings' in msg, msg[-160:])
        print('   message:', [l for l in msg.split('\n') if 'amera' in l])

        print('page errors:', eh + ej + eo + ef + en); print(f'{sum(res)}/{len(res)} passed')
        for b in (hb, jb, ob, fb, nb): await b.close()
asyncio.run(main())
