"""The UnderCover database."""

import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCHEMA = HERE / "schema.sql"


def path() -> Path:
    """Return the path of the database file."""
    return Path(os.getenv("UNDERCOVER_DB") or HERE / "undercover.db")


@contextmanager
def connection() -> Iterator[sqlite3.Connection]:
    """Open the database, commit the work and close it."""
    conn = sqlite3.connect(path())
    conn.row_factory = sqlite3.Row
    try:
        with conn:
            yield conn
    finally:
        conn.close()
