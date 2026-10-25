# Live round tests

`secret_banks.py` drives three phones (plus a stranger) through a live round in headless Chromium,
against a stand-in database that enforces `rules.py`, a line-for-line Python copy of `firestore.rules`.
It also attacks the database directly, the way someone with developer tools could.

    pip install playwright && python -m playwright install chromium
    python tests/live/secret_banks.py "$PWD/index.html" /tmp tests/live

Keep `rules.py` in step with `firestore.rules` whenever the rules change.
