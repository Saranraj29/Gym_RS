import os
import tempfile
from pathlib import Path

# Must be set before the app is imported so the tests never touch the real DB/ folder.
_tmp = tempfile.mkdtemp(prefix="gym_rs_test_")
os.environ["DB_DIR"] = _tmp
os.environ["SEED_DEMO"] = "false"
os.environ["AUTO_REMINDERS"] = "false"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c
