"""Stand-in for Firebase in tests: accounts, each account's private data (users/{uid}/...), live rounds
and secret bank calls. Every read and write is checked against rules.py, a copy of firestore.rules.
Each simulated phone is signed in to one account; sign-in state survives reloads like the real thing."""
import copy, json, time

def setp(d, path, v):
    for k in path[:-1]:
        d = d.setdefault(str(k), {})
    if isinstance(v, dict) and v.get('__delete'): d.pop(str(path[-1]), None)
    else: d[str(path[-1])] = v

def getp(d, path):
    for k in path:
        if not isinstance(d, dict) or str(k) not in d: return None
        d = d[str(k)]
    return d

DEMO = {
    'sam': {'id': 'sam', 'name': 'Nic', 'last': 'Walker', 'hi': 8.4, 'color': '#8B6B4A'},
    'priya': {'id': 'priya', 'name': 'Mitch', 'last': 'Nair', 'hi': 19.0, 'color': '#A5543A'},
    'jake': {'id': 'jake', 'name': 'Greg', 'last': 'Morrison', 'hi': 11.6, 'color': '#6F7F73'},
}

def profile(first, hi=14.2, last='', friends=('sam', 'priya', 'jake')):
    people = {k: v for k, v in DEMO.items() if k in friends}
    people['me'] = {'id': 'me', 'name': 'You', 'first': first, 'last': last, 'hi': hi, 'color': '#4F7A5A'}
    return {'first': first, 'last': last, 'hi': hi, 'email': f'{first.lower()}@example.com', 'createdAt': 0,
            'people': json.dumps(people), 'friendIds': list(friends), 'courses': '[]'}

INIT = r"""(()=>{
const A = window.__fakeAccount;   // the account this phone signs in to
let me = null; try { me = JSON.parse(localStorage.getItem('fake.auth')); } catch(e) {}
const subs = new Set(); const tell = () => subs.forEach(cb => cb(me));
const call = async (f, ...a) => { const r = JSON.parse(await window[f]((me && me.uid) || null, ...a.map(x => JSON.stringify(x)))); if (r.err) { const e = new Error(r.err); e.code = r.err.startsWith('permission') ? 'permission-denied' : r.err; throw e; } return r.v; };
const signIn = () => { me = { uid: A.uid, email: A.email, name: A.name || '' }; localStorage.setItem('fake.auth', JSON.stringify(me)); tell(); };
const poll = (fetch, cb) => { let last = '\u0000', alive = true; const t = async () => { if (!alive) return; try { const r = await fetch(); const s = JSON.stringify(r); if (s !== last) { last = s; cb(r); } } catch (e) {} setTimeout(t, 150); }; t(); return () => { alive = false; }; };
window.__fake = { signIn, raw: (path, op, data) => call('__fc_raw', path, op, data || null) };
window.__puntaroLiveBackend = {
  get uid() { return me ? me.uid : null; },
  watchAuth: cb => { subs.add(cb); setTimeout(() => cb(me), 0); return () => subs.delete(cb); },
  signInGoogle: async () => { if (A.googleError) { const e = new Error('x'); e.code = A.googleError; throw e; } signIn(); },
  sendEmailLink: async email => { window.__sentTo = email; localStorage.setItem('puntaro.signinEmail', email); },
  isEmailLink: url => /fakeEmailLink/.test(url || ''),
  finishEmailLink: async (email, url) => { if (email !== A.email) { const e = new Error('x'); e.code = 'auth/invalid-email'; throw e; } localStorage.removeItem('puntaro.signinEmail'); signIn(); },
  signOut: async () => { me = null; localStorage.removeItem('fake.auth'); window.__signedOut = true; tell(); },
  deleteLogin: async () => { await call('__fc_dellogin'); },
  getMine: p => call('__fc_uget', p), setMine: (p, d, m = true) => call('__fc_uset', p, d, m), deleteMine: p => call('__fc_udel', p),
  listMine: async p => (await call('__fc_ulist', p)).map(x => x.id),
  watchMine: (p, cb) => poll(() => call('__fc_ulist', p), cb),
  getRef: c => call('__fc_getref', c), createRef: (c, n) => call('__fc_mkref', c, n), addJoin: (c, n) => call('__fc_addjoin', c, n),
  listJoins: c => call('__fc_joins', c),
  create: (c, d) => call('__fc_create', c, d), get: c => call('__fc_get', c), update: (c, p, host) => call('__fc_update', c, p, !!host),
  setIfAbsent: (c, p, v, e, host) => call('__fc_sia', c, p, v, e || [], !!host), finish: (c, host) => call('__fc_finish', c, !!host),
  putBank: (c, i, h, v) => call('__fc_putbank', c, i, h, v), getBank: (c, i, h) => call('__fc_getbank', c, i, h),
  watch: (c, cb) => poll(() => call('__fc_get', c), cb),
  setProfile: d => call('__fc_setprofile', d),
  sendFeedback: (text, meta) => call('__fc_feedback', text, meta),
  logEvent: (name, data) => call('__fc_event', name, data),
  adminLoad: () => call('__fc_adminload'),
  adminFeedbackDone: (id, done) => call('__fc_fbdone', id, done),
  adminDeleteUser: uid => call('__fc_admindel', uid),
  listVoids: () => call('__fc_voids'),
  adminSetVoid: (key, status, reason) => call('__fc_setvoid', key, status, reason),
  adminClearVoid: key => call('__fc_clearvoid', key),
  deleteProfile: () => call('__fc_delprofile'),
  watchProfile: (u, cb, err) => poll(() => call('__fc_getprofile', u).catch(e => { if (err) err(e); return '__denied'; }).then(v => v === '__denied' ? null : v), cb),
  watchFriends: cb => poll(() => call('__fc_friends'), cb),
  watchRequests: cb => poll(() => call('__fc_requests'), cb),
  sendRequest: (to, name) => call('__fc_sendreq', to, name),
  hasRequested: to => call('__fc_hasreq', to),
  acceptRequest: f => call('__fc_accept', f),
  declineRequest: f => call('__fc_decline', f),
  befriendInviter: (code, owner) => call('__fc_befriend', code, owner),
  unfriend: f => call('__fc_unfriend', f),
};
})();"""

class Cloud:
    def __init__(self, rules):
        self.rules = rules; self.docs = {}; self.denied = []; self.clock_offset = 0; self.logins = {}

    def now(self): return int(time.time() * 1000) + self.clock_offset
    def _ok(self, v=None): return json.dumps({'v': v})
    def _no(self, why): self.denied.append(why); return json.dumps({'err': 'permission-denied: ' + why})

    # ---- convenience for tests
    def user(self, uid, path=''): return self.docs.get(f'users/{uid}' + (f'/{path}' if path else ''))
    def now_state(self, uid):
        d = self.user(uid, 'state/now'); return json.loads(d['json']) if d and d.get('json') else {}
    def finished(self, uid): return {k.split('/')[-1]: v for k, v in self.docs.items() if k.startswith(f'users/{uid}/rounds/')}
    def live(self, code): return self.docs.get(f'rounds/{code}')
    def banks(self, code): return {k.split('/')[-1]: v for k, v in self.docs.items() if k.startswith(f'rounds/{code}/banks/')}
    def seed(self, uid, prof): self.docs[f'users/{uid}'] = copy.deepcopy(prof)

    async def phone(self, browser, uid, email=None, signed_in=True, extra_init='', **ctx):
        email = email or f'{uid}@example.com'
        c = await browser.new_context(viewport={'width': 390, 'height': 844}, service_workers='block', **ctx)
        await c.add_init_script(f"window.__fakeAccount = {json.dumps({'uid': uid, 'email': email})};"
                                + (f"if(!localStorage.getItem('fake.auth'))localStorage.setItem('fake.auth', JSON.stringify({json.dumps({'uid': uid, 'email': email})}));" if signed_in else '')
                                + INIT + extra_init)
        R = self.rules

        def upath(me, p): return f'users/{me}' + (f'/{p}' if p else '')
        async def uget(me, p):
            p = json.loads(p)
            if not R.user_doc(me, me) or me is None: return self._no('user read')
            return self._ok(copy.deepcopy(self.docs.get(upath(me, p))))
        async def uset(me, p, d, m):
            p, d, m = json.loads(p), json.loads(d), json.loads(m)
            if me is None: return self._no('signed out')
            k = upath(me, p)
            new = {**self.docs.get(k, {}), **d} if m else d
            if p == '' and not R.user_update(self.docs.get(k), new, me, me): return self._no('profile referredBy')
            self.docs[k] = new
            return self._ok()
        async def udel(me, p):
            p = json.loads(p)
            if me is None: return self._no('signed out')
            self.docs.pop(upath(me, p), None); return self._ok()
        async def ulist(me, p):
            p = json.loads(p)
            if me is None: return self._no('signed out')
            pre = upath(me, p) + '/'
            return self._ok([{'id': k[len(pre):], **copy.deepcopy(v)} for k, v in self.docs.items() if k.startswith(pre) and '/' not in k[len(pre):]])
        async def dellogin(me): self.logins[me] = 'deleted'; return self._ok()
        # Raw access to any path, like calling Firebase directly from developer tools. Rules decide.
        async def raw(me, path, op, data):
            path, op, data = json.loads(path), json.loads(op), json.loads(data)
            parts = path.split('/')
            if parts[0] == 'users' and not R.user_doc(parts[1], me) and not (op == 'get' and R.is_admin(me)): return self._no('raw ' + op + ' ' + path)
            if parts[0] == 'users' and op == 'set' and len(parts) == 2 and not R.user_update(self.docs.get(path), data, me, parts[1]): return self._no('raw referredBy')
            if parts[0] == 'refs':
                ref = self.docs.get(f'refs/{parts[1]}')
                if len(parts) == 2 and op != 'get': return self._no('raw ref ' + op)
                if len(parts) == 4:
                    if op == 'get' and not R.join_read(ref, me): return self._no('raw join read')
                    if op == 'delete': return self._no('raw join delete')
                    if op == 'set':
                        if path in self.docs: return self._no('raw join overwrite')
                        if not R.join_create(ref, self.docs.get(f'users/{me}'), parts[3], {**(data or {}), '_code': parts[1]}, me, (data or {}).get('at')): return self._no('raw join create')
            t = self.now()
            if parts[0] == 'voids' and op == 'get' and me is not None: return self._ok(copy.deepcopy(self.docs.get(path)))
            if parts[0] == 'voids' and op != 'get' and not (op == 'set' and R.void_write({**(data or {}), 'at': t}, me, t)) and not (op == 'delete' and R.is_admin(me)): return self._no('raw voids ' + op)
            if parts[0] == 'events' and not (op == 'get' and R.is_admin(me)) and not (op == 'set' and path not in self.docs and R.event_create({**(data or {}), 'at': t}, me, t)): return self._no('raw events ' + op)
            if parts[0] == 'feedback' and op == 'get' and R.is_admin(me): return self._ok(copy.deepcopy(self.docs.get(path)))
            if parts[0] == 'feedback' and op != 'set': return self._no('raw feedback ' + op)
            if parts[0] == 'feedback' and op == 'set' and not R.feedback_create({**(data or {}), 'at': t}, me, t): return self._no('raw feedback create')
            if parts[0] == 'profiles':
                if op == 'get' and not R.profile_read(self.docs, parts[1], me): return self._no('raw profile read')
                if op == 'set' and not R.profile_write(parts[1], {**(data or {}), 'updatedAt': t}, me, t): return self._no('raw profile write')
            if parts[0] == 'requests':
                if op == 'get' and not R.request_read(parts[1], parts[3], me): return self._no('raw request read')
                if op == 'set' and (path in self.docs or not R.request_create(self.docs, parts[1], parts[3], {**(data or {}), 'at': t}, me, t)): return self._no('raw request create')
                if op == 'delete' and not R.request_delete(parts[1], parts[3], me): return self._no('raw request delete')
            if parts[0] == 'friends':
                if op == 'get' and not R.friend_read(parts[1], me): return self._no('raw friends read')
                if op == 'set' and (path in self.docs or not R.friend_create(self.docs, parts[1], parts[3], {**(data or {}), 'since': t}, me, t)): return self._no('raw friend create')
                if op == 'delete' and not R.friend_delete(parts[1], parts[3], me): return self._no('raw friend delete')
            if op == 'get': return self._ok(copy.deepcopy(self.docs.get(path)))
            if op == 'set': self.docs[path] = data; return self._ok()
            if op == 'delete': self.docs.pop(path, None); return self._ok()
            return self._no('op')
        async def create(me, code, d):
            code, d = json.loads(code), json.loads(d)
            k = f'rounds/{code}'
            if getattr(self, 'fail_create', None): return json.dumps({'err': self.fail_create})  # tests: Firebase says no
            if me is None or k in self.docs: return self._no('create')
            t = self.now(); d = {**d, 'updatedAt': t, 'hostAt': t}
            if not R.can_create(code, d, me, t): return self._no('create')
            self.docs[k] = d; return self._ok()
        async def get(me, code):
            code = json.loads(code)
            if me is None: return self._no('signed out')
            return self._ok(copy.deepcopy(self.docs.get(f'rounds/{code}')))
        async def update(me, code, pairs, host='false'):
            code, pairs, host = json.loads(code), json.loads(pairs), json.loads(host)
            k = f'rounds/{code}'
            if me is None or k not in self.docs: return self._no('update')
            t = self.now(); after = copy.deepcopy(self.docs[k])
            for path, v in pairs: setp(after, path, v)
            after['updatedAt'] = t
            if host: after['hostAt'] = t
            ok, why = R.can_update(self.docs[k], after, me, t)
            if not ok: return self._no('update ' + why)
            self.docs[k] = after; return self._ok()
        async def sia(me, code, path, v, extra, host='false'):
            c, p, val, ex = json.loads(code), json.loads(path), json.loads(v), json.loads(extra)
            d = self.docs.get(f'rounds/{c}')
            if d is None or getp(d, p) is not None: return self._ok()
            return await update(me, json.dumps(c), json.dumps([[p, val]] + ex), host)
        async def finish(me, code, host='false'):
            return await update(me, code, json.dumps([[['done'], True], [['doneBy'], me]]), host)
        async def putbank(me, code, i, h, v):
            code, i, h, v = json.loads(code), json.loads(i), json.loads(h), json.loads(v)
            key = f'{i}_{h}'; d = {'pid': i, 'h': h, 'v': v, 'uid': me}
            r = self.docs.get(f'rounds/{code}')
            if me is None or r is None or not R.bank_write(r, key, d, me): return self._no('bank write ' + key)
            self.docs[f'rounds/{code}/banks/{key}'] = d; return self._ok()
        async def getbank(me, code, i, h):
            code, i, h = json.loads(code), json.loads(i), json.loads(h)
            key = f'{i}_{h}'; d = self.docs.get(f'rounds/{code}/banks/{key}'); r = self.docs.get(f'rounds/{code}')
            if me is None or r is None or not R.bank_get(r, key, d, me): return self._no('bank read ' + key)
            return self._ok(None if d is None else d['v'])
        async def getref(me, code):
            code = json.loads(code)
            if me is None: return self._no('signed out')
            return self._ok(copy.deepcopy(self.docs.get(f'refs/{code}')))
        async def mkref(me, code, name):
            code, name = json.loads(code), json.loads(name); k = f'refs/{code}'; t = self.now()
            d = {'owner': me, 'name': name, 'createdAt': t}
            if k in self.docs or not R.ref_create(code, d, me, t): return self._no('ref create ' + code)
            self.docs[k] = d; return self._ok()
        async def addjoin(me, code, name):
            code, name = json.loads(code), json.loads(name); k = f'refs/{code}/joins/{me}'; t = self.now()
            if k in self.docs or not R.join_create(self.docs.get(f'refs/{code}'), self.docs.get(f'users/{me}'), me, {'name': name, 'at': t, '_code': code}, me, t): return self._no('join ' + code)
            self.docs[k] = {'name': name, 'at': t}; return self._ok()
        async def joins(me, code):
            code = json.loads(code)
            if not R.join_read(self.docs.get(f'refs/{code}'), me): return self._no('joins read ' + code)
            pre = f'refs/{code}/joins/'
            return self._ok([{'id': k[len(pre):], **v} for k, v in self.docs.items() if k.startswith(pre)])
        # ---- friends
        def fl(a, b): return f'friends/{a}/list/{b}'
        def batch(me, ops):
            # Like a Firestore batch: every write is checked against the state before the batch, then all apply.
            t = self.now(); pre = self.docs
            for op, path, data in ops:
                parts = path.split('/')
                if parts[0] == 'friends':
                    if op == 'set' and not R.friend_create(pre, parts[1], parts[3], {**data, 'since': t}, me, t): return self._no('friend ' + path)
                    if op == 'delete' and not R.friend_delete(parts[1], parts[3], me): return self._no('unfriend ' + path)
                if parts[0] == 'requests' and op == 'delete' and not R.request_delete(parts[1], parts[3], me): return self._no('request delete')
            for op, path, data in ops:
                if op == 'set': self.docs[path] = {**data, 'since': t}
                else: self.docs.pop(path, None)
            return self._ok()
        async def setprofile(me, d):
            d = json.loads(d); t = self.now(); d = {**d, 'updatedAt': t}
            if not R.profile_write(me, d, me, t): return self._no('profile write')
            self.docs[f'profiles/{me}'] = d; return self._ok()
        async def feedback(me, text, meta):
            t = self.now(); d = {'uid': me, 'text': json.loads(text), **json.loads(meta), 'at': t}
            if not R.feedback_create(d, me, t): return self._no('feedback')
            self.docs[f'feedback/{len([k for k in self.docs if k.startswith("feedback/")]) + 1}'] = d; return self._ok()
        async def event(me, name, data):
            t = self.now(); d = {'uid': me, 'name': json.loads(name), 'data': json.loads(data), 'at': t}
            if not R.event_create(d, me, t): return self._no('event')
            self.docs[f'events/{len([k for k in self.docs if k.startswith("events/")]) + 1}'] = d; return self._ok()
        async def adminload(me):
            if not R.is_admin(me): return self._no('admin load')
            D = self.docs
            def raises(v):
                try: return ((json.loads(v.get('people') or '{}') or {}).get('me') or {}).get('raises') or []
                except Exception: return []
            users = [{'uid': k.split('/')[1], **{f: v.get(f) for f in ('first', 'last', 'email', 'hi', 'hcpKind', 'createdAt', 'referredBy', 'refCode')}, 'raises': raises(v)} for k, v in D.items() if k.startswith('users/') and k.count('/') == 1]
            rounds = [{'owner': k.split('/')[1], **v} for k, v in D.items() if k.startswith('users/') and k.count('/') == 3 and k.split('/')[2] == 'rounds']
            live = [{'code': k.split('/')[1], 'done': bool(v.get('done')), 'createdAt': v.get('createdAt')} for k, v in D.items() if k.startswith('rounds/') and k.count('/') == 1]
            fb = [{'id': k.split('/')[1], **v} for k, v in D.items() if k.startswith('feedback/')]
            ev = [v for k, v in D.items() if k.startswith('events/')]
            vo = [{'key': k.split('/')[1], **v} for k, v in D.items() if k.startswith('voids/')]
            return self._ok(copy.deepcopy({'users': users, 'rounds': rounds, 'live': live, 'feedback': fb, 'events': ev, 'voids': vo}))
        async def voids(me):
            if me is None: return self._no('signed out')
            return self._ok([{'key': k.split('/')[1], **v} for k, v in self.docs.items() if k.startswith('voids/')])
        async def setvoid(me, key, status, reason):
            key, status, reason = json.loads(key), json.loads(status), json.loads(reason); t = self.now()
            d = {'status': status, 'reason': str(reason or '')[:200], 'by': me, 'at': t}
            if not R.void_write(d, me, t): return self._no('void')
            self.docs[f'voids/{key}'] = d; return self._ok()
        async def clearvoid(me, key):
            if not R.is_admin(me): return self._no('clear void')
            self.docs.pop(f'voids/{json.loads(key)}', None); return self._ok()
        async def admindel(me, uid):
            uid = json.loads(uid)
            if not R.is_admin(me) or uid == me: return self._no('admin delete')
            def gone(k, v):
                p = k.split('/')
                return (k == f'users/{uid}' or k.startswith(f'users/{uid}/') or k == f'profiles/{uid}'
                        or (p[0] == 'friends' and len(p) == 4 and (p[1] == uid or p[3] == uid))
                        or (p[0] == 'requests' and len(p) == 4 and (p[1] == uid or p[3] == uid))
                        or (p[0] in ('feedback', 'events') and v.get('uid') == uid))
            ks = [k for k, v in self.docs.items() if gone(k, v)]
            for k in ks: self.docs.pop(k)
            return self._ok(len(ks))
        async def fbdone(me, fid, done):
            fid, done = json.loads(fid), json.loads(done); path = f'feedback/{fid}'
            before = self.docs.get(path)
            if before is None or not R.feedback_done(before, {**before, 'done': done}, me): return self._no('feedback done')
            self.docs[path] = {**before, 'done': done}; return self._ok()
        async def delprofile(me):
            if me is None: return self._no('signed out')
            self.docs.pop(f'profiles/{me}', None); return self._ok()
        async def getprofile(me, u):
            u = json.loads(u)
            if not R.profile_read(self.docs, u, me): return self._no('profile read ' + u)
            return self._ok(copy.deepcopy(self.docs.get(f'profiles/{u}')))
        async def friends(me):
            if me is None: return self._no('signed out')
            pre = f'friends/{me}/list/'
            return self._ok(sorted([{'id': k[len(pre):], 'via': v.get('via', '')} for k, v in self.docs.items() if k.startswith(pre)], key=lambda x: x['id']))
        async def requests(me):
            if me is None: return self._no('signed out')
            pre = f'requests/{me}/in/'
            return self._ok(sorted([{'id': k[len(pre):], 'name': v.get('name', '')} for k, v in self.docs.items() if k.startswith(pre)], key=lambda x: x['id']))
        async def sendreq(me, to, name):
            to, name = json.loads(to), json.loads(name); t = self.now(); d = {'name': name, 'at': t}
            if not R.request_create(self.docs, to, me, d, me, t): return self._no('request create')
            self.docs[f'requests/{to}/in/{me}'] = d; return self._ok()
        async def hasreq(me, to):
            to = json.loads(to); return self._ok(f'requests/{to}/in/{me}' in self.docs)
        async def accept(me, f):
            f = json.loads(f)
            return batch(me, [('set', fl(me, f), {'via': 'request'}), ('set', fl(f, me), {'via': 'request'}), ('delete', f'requests/{me}/in/{f}', None)])
        async def decline(me, f):
            f = json.loads(f)
            if not R.request_delete(me, f, me): return self._no('decline')
            self.docs.pop(f'requests/{me}/in/{f}', None); return self._ok()
        async def befriend(me, code, owner):
            code, owner = json.loads(code), json.loads(owner)
            return batch(me, [('set', fl(me, owner), {'via': code}), ('set', fl(owner, me), {'via': code})])
        async def unfriend(me, f):
            f = json.loads(f)
            return batch(me, [('delete', fl(me, f), None), ('delete', fl(f, me), None)])
        for n, f in [('__fc_voids', voids), ('__fc_setvoid', setvoid), ('__fc_clearvoid', clearvoid), ('__fc_admindel', admindel), ('__fc_event', event), ('__fc_adminload', adminload), ('__fc_fbdone', fbdone), ('__fc_feedback', feedback), ('__fc_delprofile', delprofile), ('__fc_setprofile', setprofile), ('__fc_getprofile', getprofile), ('__fc_friends', friends), ('__fc_requests', requests), ('__fc_sendreq', sendreq),
                     ('__fc_hasreq', hasreq), ('__fc_accept', accept), ('__fc_decline', decline), ('__fc_befriend', befriend), ('__fc_unfriend', unfriend)]:
            await c.expose_function(n, f)
        for n, f in [('__fc_getref', getref), ('__fc_mkref', mkref), ('__fc_addjoin', addjoin), ('__fc_joins', joins), ('__fc_raw', raw), ('__fc_uget', uget), ('__fc_uset', uset), ('__fc_udel', udel), ('__fc_ulist', ulist), ('__fc_dellogin', dellogin),
                     ('__fc_create', create), ('__fc_get', get), ('__fc_update', update), ('__fc_sia', sia), ('__fc_finish', finish),
                     ('__fc_putbank', putbank), ('__fc_getbank', getbank)]:
            await c.expose_function(n, f)
        pg = await c.new_page(); pg.errs = []
        pg.on('pageerror', lambda e: pg.errs.append(f'{uid}: {e}'))
        return pg

async def open_app(pg, url, q='', setup=None):
    """Open the app, tap through the splash, and fill in first-time setup if asked (setup = (first, hcp))."""
    await pg.wait_for_timeout(300)
    await pg.goto(url + q); await pg.wait_for_timeout(600)
    for _ in range(4):
        if await pg.locator('.splash').count(): await pg.locator('.splash').dispatch_event('pointerdown'); await pg.wait_for_timeout(350)
    await pg.wait_for_timeout(400)
    if setup and await pg.get_by_label('First name').count():
        await pg.get_by_label('First name').fill(setup[0]); await fill_hcp(pg, setup[1])
        await lets_play(pg); await pg.wait_for_timeout(700)

async def next_step(pg):
    """Sign-up asks one question at a time: move from your name to your handicap if we're still on the name."""
    if await pg.get_by_role('button', name='Next', exact=True).count(): await pg.get_by_role('button', name='Next', exact=True).click(); await pg.wait_for_timeout(250)

async def lets_play(pg):
    """Finish sign-up: past the handicap question (and the optional friend-code step, if it's asked), then Let's play."""
    if await pg.get_by_role('button', name='Next', exact=True).count(): await pg.get_by_role('button', name='Next', exact=True).click(); await pg.wait_for_timeout(250)
    if await pg.get_by_role('button', name="Let's play").count(): await pg.get_by_role('button', name="Let's play").click()

async def fill_hcp(pg, v):
    """Sign-up asks whether you have a handicap first; say yes and type it."""
    await next_step(pg)
    if not await pg.get_by_label('Handicap index').count(): await pg.get_by_role('button', name='I have a handicap', exact=True).click(); await pg.wait_for_timeout(100)
    await pg.get_by_label('Handicap index').fill(str(v))

async def flushed(pg, ms=1100):
    """Wait for the app's batched saves (700ms) to reach the cloud."""
    await pg.wait_for_timeout(ms)
