import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration (normalized names for backward compatibility)
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3307")
DB_USER = os.getenv("DB_USER", "root")
# Prefer DB_PASSWORD but also expose DB_PASS for older code
DB_PASSWORD = os.getenv("DB_PASSWORD", os.getenv("DB_PASS", ""))
DB_PASS = DB_PASSWORD
DB_NAME = os.getenv("DB_NAME", "osa_appointment_db")
DB_ECHO = os.getenv("DB_ECHO", "False").lower() == "true"

# API configuration
API_HOST = os.getenv("API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("API_PORT", "5000"))