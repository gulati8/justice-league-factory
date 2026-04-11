"""SQLite database access for the dashboard API."""

import sqlite3
from contextlib import contextmanager


def dict_factory(cursor: sqlite3.Cursor, row: tuple) -> dict:
    """Convert SQLite rows to dicts."""
    return {col[0]: row[i] for i, col in enumerate(cursor.description)}


@contextmanager
def get_db(db_path: str):
    """Context manager for database connections."""
    conn = sqlite3.connect(db_path, timeout=10)
    conn.row_factory = dict_factory
    conn.execute("PRAGMA journal_mode=WAL")
    try:
        yield conn
    finally:
        conn.close()
