"""Python mirror of firestore.rules, used by the fake backend. Kept line-for-line with the rules file."""
import re

def diff(a, b):
    a = a or {}; b = b or {}
    added = {k for k in a if k not in b}; removed = {k for k in b if k not in a}
    changed = {k for k in a if k in b and a[k] != b[k]}
    return added, removed, changed

def affected(a, b):
    ad, rm, ch = diff(a, b); return ad | rm | ch

def moved_on(r, i, h):
    ids = r['base']['playerIds']
    if len(ids) <= i: return True
    pid = ids[i]
    if (r.get('claims') or {}).get(pid) is None: return True
    return (r.get('at') or {}).get(pid, 0) > h

def revealed(r, h):
    return r.get('done') is True or all(moved_on(r, i, h) for i in range(8))

SIX_HOURS = 6 * 3600 * 1000

def can_create(code, data, uid, now=None):
    if now is not None and (data.get('updatedAt') != now or data.get('hostAt') != now): return False
    if data.get('done'): return False
    return (re.fullmatch(r'PUNT-[A-Z0-9]{5}', code) is not None and data.get('code') == code and data.get('host') == uid
            and data.get('scoring') in ('each', 'one') and data.get('claims') == {'me': uid}
            and set(data.get('members', {}).keys()) <= {uid} and data.get('members', {}).get(uid) is True
            and len(data.get('at') or {}) == 0)

JOIN = {'members', 'claims', 'who', 'updatedAt'}
WATCH = {'members', 'claims', 'at', 'who', 'updatedAt'}
PLAY = {'s', 'ev', 'ntp', 'wolf', 'bbb', 'draws', 'deal', 'by', 'ed', 'members', 'claims', 'at', 'who', 'updatedAt'}
HOST = PLAY | {'bk', 'scoring', 'hostAt'}

def can_update(before, after, uid, now=None):
    ch = affected(after, before)
    is_host = before['host'] == uid
    is_member = (before.get('members') or {}).get(uid) is True
    keeps = all(after.get(k) == before.get(k) for k in ('host', 'code', 'base', 'people'))
    if not keeps: return False, 'setup changed'
    if now is not None and after.get('updatedAt') != now: return False, 'clock'
    if now is not None and (after.get('hostAt') != now if is_host else after.get('hostAt') != before.get('hostAt')): return False, 'host clock'
    if before.get('done') is True: return False, 'finished'
    if 'done' in ch or 'doneBy' in ch:
        ok = (ch <= {'done', 'doneBy', 'updatedAt', 'hostAt'} and after.get('done') is True and after.get('doneBy') == uid
              and (is_host or (is_member and now is not None and now > (before.get('hostAt') or 0) + SIX_HOURS)))
        return (True, '') if ok else (False, 'finish')
    if not (is_member or ch <= JOIN): return False, 'not a member'
    allowed = HOST if is_host else PLAY if before['scoring'] == 'each' else WATCH
    if not ch <= allowed: return False, f'keys not allowed: {sorted(ch - allowed)}'
    if 'members' in ch:
        if not (affected(after['members'], before.get('members')) <= {uid} and after['members'].get(uid) is True): return False, 'members'
    if 'claims' in ch:
        ad, rm, chg = diff(after['claims'], before['claims']); w = after.get('who')
        takes = (ad | rm | chg) <= {w} and ad <= {w} and w in before['base']['playerIds'] and after['claims'].get(w) == uid and uid not in before['claims'].values()
        releases = is_host and len(ad | rm | chg) == 1 and len(rm) == 1
        if not (takes or releases): return False, 'claims'
    if 'at' in ch:
        w = after.get('who'); old = before.get('at') or {}
        ok = (affected(after['at'], old) <= {w} and before['claims'].get(w) == uid
              and isinstance(after['at'].get(w), int) and after['at'][w] > old.get(w, 0) and after['at'][w] <= 18)
        if not ok: return False, 'at'
    if 'ed' in ch:
        if not set((before.get('ed') or {}).keys()) <= set((after.get('ed') or {}).keys()): return False, 'ed'
    if 'draws' in ch:
        ad, rm, chg = diff(after.get('draws'), before.get('draws')); dl = after.get('deal')
        if chg or rm or not isinstance(dl, int) or not ad <= {str(dl)}: return False, 'draws'
        if before['scoring'] == 'each' and not revealed(before, dl - 1): return False, 'draws before reveal'
    if 'bk' in ch:
        if not (before['scoring'] == 'one' and after['scoring'] == 'one'): return False, 'bk'
    if 'scoring' in ch and after['scoring'] not in ('each', 'one'): return False, 'scoring'
    return True, ''

def bank_get(r, key, doc, uid):
    h = int(key.split('_')[1])
    return revealed(r, h) or (doc is not None and doc.get('uid') == uid)

def bank_write(r, key, data, uid):
    pid, h = key.split('_')[0], int(key.split('_')[1])
    if set(data.keys()) - {'pid', 'h', 'v', 'uid'}: return False
    if data.get('pid') != pid or data.get('h') != h or not (0 <= h < 18): return False
    if not isinstance(data.get('v'), bool) or data.get('uid') != uid: return False
    if r['scoring'] != 'each' or r.get('done') is True or pid not in r['base']['playerIds']: return False
    if (r.get('members') or {}).get(uid) is not True: return False
    c = (r.get('claims') or {}).get(pid)
    if c == uid: return (r.get('at') or {}).get(pid, 0) <= h
    return c is None and not revealed(r, h)

def bank_delete(r, uid):
    return False

def round_delete(r, uid):
    return False

def user_doc(path_uid, uid):
    """users/{uid}/** : yours alone."""
    return uid is not None and path_uid == uid

def user_update(before, after, uid, path_uid):
    """users/{uid} profile: yours alone; referredBy can't change after sign-up."""
    if uid is None or uid != path_uid: return False
    if before is None: return True
    return (after or {}).get('referredBy') == before.get('referredBy')

def ref_create(code, data, uid, now):
    return (uid is not None and re.fullmatch(r'[a-z]{1,10}-[a-z0-9]{4}', code) is not None and set(data) <= {'owner', 'name', 'createdAt'}
            and data.get('owner') == uid and isinstance(data.get('name'), str) and len(data['name']) <= 30 and data.get('createdAt') == now)

def join_read(ref, uid):
    return uid is not None and ref is not None and ref.get('owner') == uid

def join_create(ref, user, path_uid, data, uid, now):
    return (uid is not None and path_uid == uid and ref is not None and ref.get('owner') != uid
            and (user or {}).get('referredBy', '') == data.get('_code') and set(data) - {'_code'} <= {'name', 'at'}
            and isinstance(data.get('name'), str) and len(data['name']) <= 30 and data.get('at') == now)

# ---- friends (mirrors the Friends block of firestore.rules) ----
def are_friends(docs, a, b): return f'friends/{a}/list/{b}' in docs
def asked(docs, to, frm): return f'requests/{to}/in/{frm}' in docs
def invited_by(docs, me, owner, code):
    if not isinstance(code, str) or re.fullmatch(r'[a-z]{1,10}-[a-z0-9]{4}', code) is None: return False
    ref = docs.get(f'refs/{code}')
    return ref is not None and ref.get('owner') == owner and (docs.get(f'users/{me}') or {}).get('referredBy', '') == code

def profile_read(docs, uid, auth):
    return auth is not None and (auth == uid or are_friends(docs, uid, auth) or asked(docs, auth, uid))
PROFILE_KEYS = {'name', 'first', 'li', 'color', 'hi', 'hk', 'ref', 'stats', 'updatedAt'}
def profile_write(uid, data, auth, now):
    return (auth is not None and auth == uid and set(data) <= PROFILE_KEYS and isinstance(data.get('name'), str)
            and len(data['name']) <= 30 and data.get('updatedAt') == now)

def request_read(to, frm, auth): return auth is not None and auth in (to, frm)
def request_create(docs, to, frm, data, auth, now):
    return (auth is not None and auth == frm and frm != to and not are_friends(docs, to, frm) and set(data) <= {'name', 'at'}
            and isinstance(data.get('name'), str) and len(data['name']) <= 30 and data.get('at') == now)
def request_delete(to, frm, auth): return auth is not None and auth in (to, frm)

def friend_read(uid, auth): return auth is not None and auth == uid
def friend_create(docs, uid, fid, data, auth, now):
    if auth is None or uid == fid or not set(data) <= {'since', 'via'} or data.get('since') != now or not isinstance(data.get('via'), str): return False
    via = data['via']
    if auth == uid: return asked(docs, uid, fid) or are_friends(docs, fid, uid) or invited_by(docs, uid, fid, via)
    if auth == fid: return asked(docs, fid, uid) or invited_by(docs, fid, uid, via)
    return False
def friend_delete(uid, fid, auth): return auth is not None and auth in (uid, fid)

FEEDBACK_KEYS = {'uid', 'text', 'name', 'version', 'device', 'at'}
def feedback_create(data, auth, now):
    t = data.get('text')
    return (auth is not None and data.get('uid') == auth and set(data) <= FEEDBACK_KEYS and isinstance(t, str)
            and 0 < len(t) <= 2000 and data.get('at') == now)

ADMINS = {'ADMIN_UID'}
def is_admin(auth): return auth is not None and auth in ADMINS
def event_create(data, auth, now):
    return (auth is not None and data.get('uid') == auth and set(data) <= {'uid', 'name', 'data', 'at'} and isinstance(data.get('name'), str)
            and len(data['name']) <= 30 and isinstance(data.get('data'), dict) and len(data['data']) <= 8 and data.get('at') == now)
def feedback_done(before, after, auth):
    changed = {k for k in set(before) | set(after) if before.get(k) != after.get(k)}
    return is_admin(auth) and changed <= {'done'} and isinstance(after.get('done'), bool)
