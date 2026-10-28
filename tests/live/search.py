"""Course search: typing a course name finds golf courses (home country first), a town shows what's near it, and
the map service is asked one request at a time. Map replies are recorded fakes shaped like Nominatim/Overpass."""
import asyncio, json, sys, time, urllib.parse as up
from playwright.async_api import async_playwright
sys.path.insert(0, sys.argv[3]); import rules, fakecloud as fc
URL, OUT = sys.argv[1], sys.argv[2]; res = []
def check(n, ok, d=''): ok = bool(ok); res.append(ok); print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
def row(name, cls, typ, lat, lon, osm, addr, disp):
    return {'osm_type': 'way', 'osm_id': osm, 'class': cls, 'type': typ, 'lat': str(lat), 'lon': str(lon), 'name': name, 'display_name': disp, 'address': addr}
WOOD_MEL = row('Woodlands Golf Club', 'leisure', 'golf_course', -37.995, 145.095, 101, {'suburb': 'Mordialloc', 'state': 'Victoria'}, 'Woodlands Golf Club, Centre Dandenong Road, Mordialloc, City of Kingston, Victoria, 3195, Australia')
WOOD_WA = row('Woodlands Golf Course', 'leisure', 'golf_course', -31.9, 115.8, 102, {'suburb': 'Woodlands', 'state': 'Western Australia'}, 'Woodlands Golf Course, Woodlands, Perth, Western Australia, Australia')
SG = row('Woodlands', 'place', 'suburb', 1.436, 103.786, 201, {'city': 'Singapore'}, 'Woodlands, Northwest, Singapore')
MORD = row('Mordialloc', 'place', 'suburb', -38.0, 145.087, 301, {'suburb': 'Mordialloc', 'state': 'Victoria'}, 'Mordialloc, City of Kingston, Victoria, 3195, Australia')
ROAD = row('Jalan Tun Abdul Razak', 'highway', 'primary', 1.46, 103.76, 401, {}, 'Jalan Tun Abdul Razak, Johor Bahru, Malaysia')
def nominatim(q, cc):
    q = q.lower()
    if cc == 'au':
        if 'woodlands' in q and 'golf' in q: return [WOOD_MEL, WOOD_WA]
        if q == 'mordialloc': return [MORD]
        return []
    if q == 'woodlands': return [SG, ROAD]
    return [ROAD]
cloud = fc.Cloud(rules)
async def setup(b, uid, **ctx):
    cloud.seed(uid, fc.profile('Pierre'))
    A = await cloud.phone(b, uid, **ctx); calls = []
    async def nom(route):
        u = up.urlparse(route.request.url); qs = up.parse_qs(u.query)
        calls.append((time.time(), qs.get('q', [''])[0], qs.get('countrycodes', [''])[0]))
        await route.fulfill(status=200, content_type='application/json', body=json.dumps(nominatim(qs.get('q', [''])[0], qs.get('countrycodes', [''])[0])), headers={'Access-Control-Allow-Origin': '*'})
    async def ovp(route):
        await route.fulfill(status=200, content_type='application/json', body=json.dumps({'elements': [
            {'type': 'way', 'id': 101, 'center': {'lat': -37.995, 'lon': 145.095}, 'tags': {'name': 'Woodlands Golf Club', 'leisure': 'golf_course'}},
            {'type': 'way', 'id': 103, 'center': {'lat': -37.98, 'lon': 145.10}, 'tags': {'name': 'Southern Golf Club', 'leisure': 'golf_course'}}]}), headers={'Access-Control-Allow-Origin': '*'})
    await A.route('**/nominatim.openstreetmap.org/**', nom)
    for h in ('overpass-api.de', 'overpass.kumi.systems', 'overpass.private.coffee'): await A.route(f'**/{h}/**', ovp)
    await fc.open_app(A, URL)
    await A.get_by_role('button', name='Start a round').click(); await A.wait_for_timeout(300)
    await A.get_by_role('button', name='Change').first.click(); await A.wait_for_timeout(300)
    return A, calls
async def find(A, text):
    await A.get_by_label('Search by town').fill(text); await A.get_by_role('button', name='Search').click()
    await A.wait_for_timeout(3500)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        A, calls = await setup(b, 'u_au', timezone_id='Australia/Melbourne', locale='en-AU')
        await find(A, 'woodlands')
        body = await A.locator('body').inner_text()
        check('"woodlands" finds Woodlands Golf Club in Mordialloc', 'Woodlands Golf Club' in body and 'Mordialloc, Victoria' in body, body[:400])
        check('...not a road in Malaysia', 'Jalan' not in body)
        check('...searching Australia first (from the phone\'s time zone)', calls and all(c[2] == 'au' for c in calls), str(calls))
        check('...and the list says what it matched', 'Golf courses matching "woodlands"' in body)
        await A.screenshot(path=f'{OUT}/search_woodlands.png')
        await A.get_by_role('button', name='Woodlands Golf Club').click(); await A.wait_for_timeout(1500)
        check('Tapping it opens its scorecard to fill in', await A.get_by_label('Course name').input_value() == 'Woodlands Golf Club')
        await A.get_by_role('button', name='Back').first.click(); await A.wait_for_timeout(300)
        calls.clear()
        await find(A, 'Mordialloc')
        body = await A.locator('body').inner_text()
        check('A town shows the courses near it, and names the town', 'near Mordialloc' in body and 'Southern Golf Club' in body, body[:400])
        gaps = [round(calls[i + 1][0] - calls[i][0], 2) for i in range(len(calls) - 1)]
        check('The map service is asked one request at a time, a second apart', len(calls) >= 2 and all(g >= 0.9 for g in gaps), str(gaps))
        US, calls2 = await setup(b, 'u_us', timezone_id='America/New_York', locale='en-US')
        await find(US, 'woodlands')
        check('Elsewhere it searches that country first', calls2 and calls2[0][2] == 'us', str(calls2))
        print('page errors:', A.errs + US.errs); print(f'{sum(res)}/{len(res)} passed'); await b.close()
asyncio.run(main())
