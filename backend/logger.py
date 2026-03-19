import os
import sqlite3
import threading
import time
from datetime import datetime
from typing import Any, List, Optional

# Ensure DB is created in the right place
DB_PATH = os.getenv("EVENTS_DB_PATH", "backend/data/events.db")

class EventRecord:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

class EventLogger:
    def __init__(self, db_path: str = DB_PATH) -> None:
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._lock = threading.Lock()
        self._init_database()

    def _init_database(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL NOT NULL,
                    event_type TEXT NOT NULL,
                    person_id TEXT,
                    person_name TEXT,
                    status TEXT,
                    duration REAL,
                    confidence REAL,
                    message TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            """)
            conn.commit()

    def log_event(self, event_type, message, person_id=None, person_name=None, status=None, duration=None, confidence=None, timestamp=None):
        ts = timestamp if timestamp else time.time()
        
        # Console Log
        emoji = "ℹ️"
        if event_type == "WARNING": emoji = "🟠"
        elif event_type == "CRITICAL": emoji = "🔴"
        elif event_type == "DETECTION": emoji = "🟢"
        elif event_type == "AUTHORIZATION": emoji = "✅"
        
        time_str = datetime.fromtimestamp(ts).strftime("%H:%M:%S")
        print(f"[{time_str}] {emoji} {event_type} | {person_name or 'Unknown'} | {message}", flush=True)

        # DB Log
        try:
            with self._lock, sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO events (timestamp, event_type, person_id, person_name, status, duration, confidence, message)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (ts, event_type, person_id, person_name, status, duration, confidence, message))
                conn.commit()
        except Exception as e:
            print(f"[LOGGER] DB Error: {e}")

    def get_events(self, limit=50, event_type=None):
        query = "SELECT * FROM events"
        params = []
        if event_type:
            query += " WHERE event_type = ?"
            params.append(event_type)
        query += " ORDER BY id DESC LIMIT ?"
        params.append(limit)

        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                rows = conn.execute(query, params).fetchall()
                return [EventRecord(**dict(row)) for row in rows]
        except Exception:
            return []

    def count_events(self):
        try:
            with sqlite3.connect(self.db_path) as conn:
                return conn.execute("SELECT COUNT(*) FROM events").fetchone()[0]
        except:
            return 0