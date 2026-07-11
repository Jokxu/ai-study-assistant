"""
Logging configuration for AI Study Assistant.
Uses Python's built-in logging module with console + file handlers.
Log levels: DEBUG, INFO, WARNING, ERROR
Set LOG_LEVEL env var to override (default: INFO).
"""
import logging
import os
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler

LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
LOG_FILE = LOG_DIR / "app.log"


class ColorFormatter(logging.Formatter):
    """Add ANSI color codes to console log output."""
    COLORS = {
        logging.DEBUG: "\033[36m",      # Cyan
        logging.INFO: "\033[32m",       # Green
        logging.WARNING: "\033[33m",    # Yellow
        logging.ERROR: "\033[31m",      # Red
        logging.CRITICAL: "\033[35m",   # Magenta
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelno, self.RESET)
        record.levelname_colored = f"{color}{record.levelname}{self.RESET}"
        return super().format(record)


def setup_logging():
    """Configure root logger with console + file handlers."""
    level_name = os.environ.get("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    root = logging.getLogger()
    root.setLevel(level)

    # Remove existing handlers to avoid duplicates on reload
    root.handlers.clear()

    # --- Console handler (colored, INFO+) ---
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(level)
    console.setFormatter(ColorFormatter(
        "%(asctime)s | %(levelname_colored)s | %(name)s:%(lineno)d | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    ))
    root.addHandler(console)

    # --- File handler (plain, DEBUG+, rotating) ---
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        file_handler = RotatingFileHandler(
            str(LOG_FILE), maxBytes=10_485_760, backupCount=5, encoding="utf-8"
        )
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(logging.Formatter(
            "%(asctime)s | %(levelname)-7s | %(name)s:%(lineno)d | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        ))
        root.addHandler(file_handler)
    except Exception:
        pass  # File logging is optional

    return root


# Auto-setup on import
logger = setup_logging()
__all__ = ["logger", "setup_logging"]
