# Live round tests

`secret_banks.py` drives three phones (plus a stranger) through a live round in headless Chromium,
against a stand-in database that enforces `rules.py`, a line-for-line Python copy of `firestore.rules`.
It also attacks the database directly, the way someone with developer tools could.

    pip install playwright && python -m playwright install chromium
    python tests/live/secret_banks.py "$PWD/index.html" /tmp tests/live

Keep `rules.py` in step with `firestore.rules` whenever the rules change.

`parked.py` covers the round-in-progress warning and Paused rounds (24-hour keep, resume, expiry, delete and restore, live rounds).

    python tests/live/parked.py "$PWD/index.html" /tmp tests/live

`scanner.py` covers starting a live round (and the reasons shown when Firebase says no), the LIVE badge, and scanning to join with a fake camera fed a tilted, blurred video of the QR code. It needs OpenCV (`pip install opencv-python`).

    python tests/live/scanner.py "$PWD/index.html" /tmp "$PWD/tests/live"
