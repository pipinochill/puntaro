# Tests

Each suite drives simulated phones in headless Chromium against `fakecloud.py`, a stand-in for Firebase
(accounts, each account's private data, live rounds and secret bank calls). Every read and write is checked
against `rules.py`, a line-for-line Python copy of `firestore.rules`, and the suites attack it directly the way
someone with developer tools could. Keep `rules.py` in step with `firestore.rules` whenever the rules change.

Serve the app over http, not file:// (headless Chromium sometimes starts a file:// page with empty storage).

    pip install playwright opencv-python && python -m playwright install chromium
    python -m http.server 8777 --bind 127.0.0.1 &
    APP=http://127.0.0.1:8777/index.html; T="$PWD/tests/live"
    python $T/accounts.py     $APP /tmp $T   # sign-in, setup, importing phone data, cloud storage, scoresheets, sign out, delete (41)
    python $T/finished.py     $APP /tmp $T   # finished live rounds: lock, recorded for every player, 6-hour fallback (23)
    python $T/secret_banks.py $APP /tmp $T   # secret bank calls and cheating attempts (42)
    python $T/parked.py       $APP /tmp $T   # round-in-progress warning, paused rounds (15)
    python $T/scanner.py      $APP /tmp $T   # live start-up and scan to join with a fake camera (14)
    python $T/edited.py       $APP /tmp $T   # "edited" marks, what goes online (8)
    python $T/invites.py      $APP /tmp $T   # invite links, crediting who brought people in, gaming attempts (26)
    python $T/cards_haptics.py $APP /tmp $T   # cards always come up (even offline), new holes start at the top, vibration (11)
    python $T/handicap.py     $APP /tmp $T src/hcp.js  # estimates, EST/APP tags, Puntaro handicap from witnessed rounds (22)
    node tests/live/hcp_unit.mjs                       # handicap maths: differentials, WHS table, slow up (18)
