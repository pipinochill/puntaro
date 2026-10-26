# Live round tests

Each suite drives simulated phones in headless Chromium against a stand-in database that enforces
`rules.py`, a line-for-line Python copy of `firestore.rules`, and attacks it directly the way someone
with developer tools could. Keep `rules.py` in step with `firestore.rules` whenever the rules change.

Serve the app over http, not file://. Headless Chromium sometimes starts a file:// page with empty
localStorage after a reload, which looks like lost data but is a browser quirk.

    pip install playwright opencv-python && python -m playwright install chromium
    python -m http.server 8777 --bind 127.0.0.1 &
    APP=http://127.0.0.1:8777/index.html
    python tests/live/secret_banks.py $APP /tmp tests/live   # secret bank calls, 42 checks incl. 25 attacks
    python tests/live/parked.py       $APP /tmp tests/live   # round-in-progress warning, paused rounds
    python tests/live/scanner.py      $APP /tmp "$PWD/tests/live"  # live start-up, scan to join (fake camera)
    python tests/live/edited.py       $APP /tmp tests/live   # "edited" marks, what goes online
    python tests/live/cleanup.py      $APP /tmp tests/live   # host removes finished live rounds
