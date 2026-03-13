from flask import Flask, jsonify, request
from flask_cors import CORS
from sqlalchemy import select, text
from sqlalchemy.exc import NoResultFound
from datetime import datetime, time, date
import os
import base64
import uuid
import re
from functools import wraps

# Support running as a package (backend.app) and as a script (python backend/app.py)
try:
    from . import config
    from .db import Base, init_engine_and_session
    from .models import Appointment, Admin, Availability, Student, Guest, GuestAccount
except Exception:  # pragma: no cover
    import config  # type: ignore
    from db import Base, init_engine_and_session  # type: ignore
    from models import Appointment, Admin, Availability, Student, Guest, GuestAccount  # type: ignore

from werkzeug.security import check_password_hash, generate_password_hash

# Constants for validation
VALID_DAYS = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"}
VALID_APPOINTMENT_STATUSES = {"pending", "confirmed", "cancelled", "completed", "rescheduled"}
MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MIN_PASSWORD_LENGTH = 8
ADMIN_TOKEN_HEADER = "X-Admin-Token"  # Token stored in localStorage
VALID_COURSES = {"BSCS", "BSED", "BEED", "BSHM"}

# ============================================================================
# VALIDATION HELPERS
# ============================================================================

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email.strip())) if email else False

def validate_password_strength(password):
    """Validate password has minimum requirements"""
    if len(password) < MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters"
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit"
    return True, "OK"

def validate_time_format(time_str):
    """Parse time string and return time object or None"""
    if not time_str:
        return None
    time_str = str(time_str).strip()
    for fmt in ["%H:%M", "%I:%M %p", "%I:%M%p"]:
        try:
            return datetime.strptime(time_str, fmt).time()
        except Exception:
            pass
    return None

def validate_day_name(day):
    """Validate day name is valid"""
    return (day or "").strip() in VALID_DAYS

def validate_appointment_status(status):
    """Validate appointment status"""
    return (status or "").lower() in VALID_APPOINTMENT_STATUSES

def error_response(message, code=400, details=None):
    """Standardized error response format"""
    resp = {"ok": False, "error": message}
    if details:
        resp["details"] = details
    return jsonify(resp), code

def success_response(data=None, code=200):
    """Standardized success response format"""
    resp = {"ok": True}
    if data is not None:
        resp.update(data)
    return jsonify(resp), code

def require_admin_token(f):
    """Decorator to require admin authentication token"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get(ADMIN_TOKEN_HEADER, "").strip()
        # Token is just placeholder - in production, use JWT
        # For now, we'll check if user sent SOME token (admin sets after login)
        if not token:
            return error_response("Unauthorized: Admin token required", 401)
        # Note: In real app, verify token signature/expiration
        return f(*args, **kwargs)
    return decorated_function


def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    engine, SessionLocal = init_engine_and_session()
    Base.metadata.create_all(bind=engine)

    def _ensure_students_columns():
        # SQLAlchemy create_all() won't add columns to an existing table.
        with engine.connect() as conn:
            rows = conn.execute(
                text(
                    """
                    SELECT COLUMN_NAME
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'students'
                    """
                ),
                {"db": config.DB_NAME},
            ).fetchall()
            existing = {r[0] for r in rows}

            add = []
            if "name" not in existing:
                add.append("ADD COLUMN name VARCHAR(100) NULL")
            if "first_name" not in existing:
                add.append("ADD COLUMN first_name VARCHAR(100) NULL")
            if "middle_name" not in existing:
                add.append("ADD COLUMN middle_name VARCHAR(100) NULL")
            if "last_name" not in existing:
                add.append("ADD COLUMN last_name VARCHAR(100) NULL")

            # Ensure course, avatar, is_active, created_at exist for newer schema
            if "course" not in existing:
                add.append("ADD COLUMN course VARCHAR(100) NULL")
            if "avatar" not in existing:
                add.append("ADD COLUMN avatar VARCHAR(255) NULL")
            if "is_active" not in existing:
                add.append("ADD COLUMN is_active TINYINT(1) DEFAULT 1")
            if "created_at" not in existing:
                add.append("ADD COLUMN created_at DATETIME NULL")

            if add:
                conn.execute(text(f"ALTER TABLE students {', '.join(add)}"))
                conn.commit()

    _ensure_students_columns()

    def _ensure_availability_date_column():
        # Add `date` column to availability table if missing. We add as NULLable
        # to avoid failing on existing rows.
        with engine.connect() as conn:
            rows = conn.execute(
                text(
                    """
                    SELECT COLUMN_NAME
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'availability'
                    """
                ),
                {"db": config.DB_NAME},
            ).fetchall()
            existing = {r[0] for r in rows}
            if "date" not in existing:
                conn.execute(text("ALTER TABLE availability ADD COLUMN `date` DATE NULL"))
                conn.commit()

    _ensure_availability_date_column()

    def _ensure_appointments_cancelled_at_column():
        # Add `cancelled_at` column to appointments table if missing.
        with engine.connect() as conn:
            rows = conn.execute(
                text(
                    """
                    SELECT COLUMN_NAME
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'appointments'
                    """
                ),
                {"db": config.DB_NAME},
            ).fetchall()
            existing = {r[0] for r in rows}
            if "cancelled_at" not in existing:
                conn.execute(text("ALTER TABLE appointments ADD COLUMN cancelled_at DATETIME NULL"))
                conn.commit()

            # Add `cancel_reason` column to appointments table if missing.
            if "cancel_reason" not in existing:
                conn.execute(text("ALTER TABLE appointments ADD COLUMN cancel_reason VARCHAR(500) NULL"))
                conn.commit()
            if "admin_note" not in existing:
                conn.execute(text("ALTER TABLE appointments ADD COLUMN admin_note VARCHAR(500) NULL"))
                conn.commit()

    _ensure_appointments_cancelled_at_column()

    def _ensure_appointments_reschedule_columns():
        # Ensure reschedule-related columns exist for existing DBs
        with engine.connect() as conn:
            rows = conn.execute(
                text(
                    """
                    SELECT COLUMN_NAME
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'appointments'
                    """
                ),
                {"db": config.DB_NAME},
            ).fetchall()
            existing = {r[0] for r in rows}
            add = []
            if 'reschedule_requested' not in existing:
                add.append("ADD COLUMN reschedule_requested TINYINT(1) DEFAULT 0")
            if 'reschedule_date' not in existing:
                add.append("ADD COLUMN reschedule_date DATE NULL")
            if 'reschedule_start_time' not in existing:
                add.append("ADD COLUMN reschedule_start_time TIME NULL")
            if 'reschedule_end_time' not in existing:
                add.append("ADD COLUMN reschedule_end_time TIME NULL")
            if 'reschedule_reason' not in existing:
                add.append("ADD COLUMN reschedule_reason VARCHAR(500) NULL")
            if add:
                conn.execute(text(f"ALTER TABLE appointments {', '.join(add)}"))

    _ensure_appointments_reschedule_columns()

    @app.get("/api/health")
    def health():
        return jsonify({"ok": True})

    @app.post("/api/admin/login")
    def admin_login():
        body = request.get_json(force=True) or {}
        ident = (body.get("username") or body.get("email") or "").strip()
        pwd = body.get("password") or ""
        
        if not ident or not pwd:
            return error_response("Missing username/email or password", 400)
        
        with SessionLocal() as s:
            try:
                q = select(Admin).where((Admin.username == ident) | (Admin.email == ident))
                row = s.execute(q).scalar_one_or_none()
                if not row:
                    return error_response("Invalid credentials", 401)
                if not check_password_hash(row.password, pwd):
                    return error_response("Invalid credentials", 401)
                
                # Return admin info with token indicator
                return success_response({
                    "admin": {
                        "id": row.id,
                        "username": row.username,
                        "name": row.name or "",
                        "email": row.email,
                        "role": row.role or "admin"
                    }
                })
            except Exception as e:
                return error_response("An unexpected error occurred. Please try again later.", 500)

    @app.post("/api/student/signup")
    def student_signup():
        body = request.get_json(force=True) or {}
        student_number = (body.get("studentNumber") or body.get("student_id") or "").strip()
        first_name = (body.get("firstName") or "").strip()
        middle_name = (body.get("middleName") or "").strip()
        last_name = (body.get("lastName") or "").strip()
        name = (body.get("name") or "").strip()
        email = (body.get("email") or "").strip()
        contact = (body.get("contact") or "").strip()
        password = body.get("password") or ""
        course = (body.get("course") or "").strip()
        
        # Validate required fields
        if not student_number:
            return error_response("Student number is required", 400)
        if not email:
            return error_response("Email is required", 400)
        if not password:
            return error_response("Password is required", 400)
        
        # Validate email format
        if not validate_email(email):
            return error_response("Invalid email format", 400)
        
        # Validate password strength
        pwd_valid, pwd_msg = validate_password_strength(password)
        if not pwd_valid:
            return error_response(pwd_msg, 400)

        # Validate course if provided
        if course:
            if course not in VALID_COURSES:
                return error_response(f"Invalid course. Must be one of: {', '.join(sorted(VALID_COURSES))}", 400)
        
        if not name:
            combined = f"{first_name} {middle_name + ' ' if middle_name else ''}{last_name}".strip()
            name = " ".join(combined.split())
        # allow missing name parts from older clients; derive from email/local part
        if not name:
            try:
                name = email.split("@")[0]
                name = " ".join([w.capitalize() for w in name.replace(".", " ").replace("_", " ").split()])
            except Exception:
                name = "Student"

        # best-effort populate missing parts from combined name
        if not first_name and name:
            first_name = name.split(" ")[0]
        if not last_name and name:
            parts = name.split(" ")
            last_name = parts[-1] if len(parts) > 1 else ""
        
        with SessionLocal() as s:
            try:
                # check email or student_id conflicts
                if s.execute(select(Student).where(Student.student_id == student_number)).scalar_one_or_none():
                    return error_response("Student number already registered", 409)
                if s.execute(select(Student).where(Student.email == email)).scalar_one_or_none():
                    return error_response("Email already registered", 409)
                
                stu = Student(
                    student_id=student_number,
                    name=name,
                    first_name=first_name,
                    middle_name=middle_name,
                    last_name=last_name,
                    email=email,
                    contact=contact,
                    password=generate_password_hash(password),
                    course=course or None,
                    is_active=True,
                    created_at=datetime.utcnow()
                )
                s.add(stu)
                s.flush()
                s.commit()
                
                avatar_url = f"/Images/{stu.avatar}" if getattr(stu, "avatar", None) else ""
                return success_response({
                    "student": {
                        "id": stu.id,
                        "studentId": stu.student_id,
                        "name": stu.name or "",
                        "firstName": stu.first_name or "",
                        "middleName": stu.middle_name or "",
                        "lastName": stu.last_name or "",
                        "email": stu.email,
                        "course": stu.course or "",
                        "contact": stu.contact or "",
                        "avatar": avatar_url
                    }
                }, 201)
            except Exception as e:
                s.rollback()
                return error_response("Sign up failed. Please try again later.", 500)

    @app.post("/api/student/login")
    def student_login():
        body = request.get_json(force=True) or {}
        ident = (body.get("studentNumber") or body.get("student_id") or body.get("email") or "").strip()
        password = body.get("password") or ""
        
        if not ident or not password:
            return error_response("Missing student number/email or password", 400)
        
        with SessionLocal() as s:
            try:
                row = s.execute(select(Student).where((Student.student_id == ident) | (Student.email == ident))).scalar_one_or_none()
                if not row or not check_password_hash(row.password, password):
                    return error_response("Invalid credentials", 401)
                
                if not row.is_active:
                    return error_response("Student account is inactive. Please contact administration", 403)
                
                avatar_url = f"/Images/{row.avatar}" if getattr(row, "avatar", None) else ""
                return success_response({
                    "student": {
                        "id": row.id,
                        "studentId": row.student_id,
                        "name": row.name or "",
                        "firstName": row.first_name or "",
                        "middleName": row.middle_name or "",
                        "lastName": row.last_name or "",
                        "email": row.email,
                        "course": row.course or "",
                        "contact": row.contact or "",
                        "avatar": avatar_url,
                        "isActive": row.is_active
                    }
                })
            except Exception as e:
                return error_response("An unexpected error occurred. Please try again later.", 500)

    @app.post("/api/guest/signup")
    def guest_signup():
        body = request.get_json(force=True) or {}
        name = (body.get("fullName") or body.get("name") or "").strip()
        email = (body.get("email") or "").strip()
        contact = (body.get("contact") or "").strip()
        password = body.get("password") or ""
        
        if not name or not email or not password:
            return error_response("Missing name, email, or password", 400)
        
        # Validate email format
        if not validate_email(email):
            return error_response("Invalid email format", 400)
        
        # Validate password strength
        pwd_valid, pwd_msg = validate_password_strength(password)
        if not pwd_valid:
            return error_response(pwd_msg, 400)
        
        with SessionLocal() as s:
            try:
                exists_email = s.execute(select(GuestAccount).where(GuestAccount.email == email)).scalar_one_or_none()
                if exists_email:
                    return error_response("Email already registered", 409)

                # If contact provided, ensure it's not already used by another guest
                if contact:
                    exists_contact = s.execute(select(GuestAccount).where(GuestAccount.contact == contact)).scalar_one_or_none()
                    if exists_contact:
                        return error_response("Contact number already registered", 409)

                g = GuestAccount(
                    name=name,
                    email=email,
                    contact=contact or "",
                    password=generate_password_hash(password)
                )
                s.add(g)
                s.flush()
                s.commit()
                
                return success_response({
                    "guest": {
                        "id": g.id,
                        "name": g.name,
                        "email": g.email
                    }
                }, 201)
            except Exception as e:
                s.rollback()
                return error_response("Sign up failed. Please try again later.", 500)

    @app.post("/api/guest/login")
    def guest_login():
        body = request.get_json(force=True) or {}
        ident = (body.get("email") or "").strip()
        password = body.get("password") or ""
        
        if not ident or not password:
            return error_response("Missing email or password", 400)
        
        if not validate_email(ident):
            return error_response("Invalid email format", 400)
        
        with SessionLocal() as s:
            try:
                row = s.execute(select(GuestAccount).where(GuestAccount.email == ident)).scalar_one_or_none()
                if not row or not check_password_hash(row.password, password):
                    return error_response("Invalid credentials", 401)
                return success_response({"guest": {"id": row.id, "name": row.name, "email": row.email}})
            except Exception as e:
                return error_response("An unexpected error occurred. Please try again later.", 500)

    @app.post("/api/student/avatar")
    def student_avatar():
        """Update a student's avatar image and store its path in the DB."""
        body = request.get_json(force=True) or {}
        student_number = (body.get("studentNumber") or "").strip()
        data_url = body.get("avatar") or ""
        
        if not student_number:
            return error_response("Student number is required", 400)
        if not data_url.startswith("data:image"):
            return error_response("Invalid image format", 400)

        header, _, b64 = data_url.partition(",")
        ext = "png"
        mime_type = "image/png"
        
        if "jpeg" in header or "jpg" in header:
            ext = "jpg"
            mime_type = "image/jpeg"
        elif "gif" in header:
            ext = "gif"
            mime_type = "image/gif"
        elif "webp" in header:
            ext = "webp"
            mime_type = "image/webp"

        try:
            img_bytes = base64.b64decode(b64)
            # Validate file size (max 5MB)
            if len(img_bytes) > MAX_AVATAR_SIZE:
                return error_response(f"Image size exceeds maximum of {MAX_AVATAR_SIZE // (1024*1024)}MB", 400)
        except Exception:
            return error_response("Invalid base64 image data", 400)

        images_root = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Images", "avatars")
        os.makedirs(images_root, exist_ok=True)
        filename = f"student_{student_number}_{uuid.uuid4().hex[:8]}.{ext}"
        filepath = os.path.join(images_root, filename)
        
        try:
            with open(filepath, "wb") as f:
                f.write(img_bytes)
        except Exception as e:
            return error_response("Failed to save avatar. Please try again.", 500)

        rel_path = f"avatars/{filename}"

        with SessionLocal() as s:
            try:
                stu = s.execute(select(Student).where(Student.student_id == student_number)).scalar_one_or_none()
                if not stu:
                    return error_response("Student not found", 404)
                stu.avatar = rel_path
                s.add(stu)
                s.commit()
                return success_response({
                    "avatar": f"/Images/{rel_path}",
                    "message": "Avatar updated successfully"
                })
            except Exception as e:
                s.rollback()
                return error_response("Failed to update avatar. Please try again.", 500)

    @app.get("/api/student/<student_number>")
    def get_student(student_number: str):
        """Return a student's profile details by student number."""
        student_number = (student_number or "").strip()
        if not student_number:
            return error_response("Student number is required", 400)
        
        with SessionLocal() as s:
            try:
                row = s.execute(select(Student).where(Student.student_id == student_number)).scalar_one_or_none()
                if not row:
                    return error_response("Student not found", 404)
                
                avatar_url = f"/Images/{row.avatar}" if getattr(row, "avatar", None) else ""
                return success_response({
                    "student": {
                        "id": row.id,
                        "studentId": row.student_id,
                        "name": row.name or "",
                        "firstName": row.first_name or "",
                        "middleName": row.middle_name or "",
                        "lastName": row.last_name or "",
                        "email": row.email or "",
                        "course": row.course or "",
                        "contact": row.contact or "",
                        "avatar": avatar_url
                    }
                })
            except Exception as e:
                return error_response("Unable to load profile. Please try again.", 500)

    def fmt_time(t):
        if not t:
            return ""
        return t.strftime("%I:%M %p").lstrip("0")

    def _iso_utc(dt):
        """Return an ISO 8601 string marked as UTC (appends 'Z') for naive UTC datetimes."""
        if not dt:
            return ""
        # If datetime already has tzinfo, use isoformat(); otherwise append 'Z' to indicate UTC
        try:
            if getattr(dt, 'tzinfo', None) is None:
                return dt.isoformat() + 'Z'
            return dt.isoformat()
        except Exception:
            return ""

    @app.get("/api/availability")
    def get_availability():
        with SessionLocal() as s:
            rows = s.execute(select(Availability).order_by(Availability.day, Availability.start_time)).scalars().all()
            days = {d: [] for d in ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]}
            today = date.today()
            for r in rows:
                # If this availability has a specific date and it's in the past, skip it (auto-remove from listing)
                if getattr(r, 'date', None) is not None and r.date < today:
                    continue
                days.setdefault(r.day, []).append({
                    "id": r.id,
                    "start": fmt_time(r.start_time),
                    "end": fmt_time(r.end_time),
                    "date": (r.date.isoformat() if getattr(r, 'date', None) is not None else "")
                })
            return jsonify(days)

    @app.get("/api/slots")
    def get_slots():
        """Return available 30-minute slots for a given date (YYYY-MM-DD).

        Combines availability (by weekday or specific date) and existing
        appointments to exclude conflicting times.
        """
        iso = request.args.get("date") or request.args.get("iso") or ""
        try:
            dt_date = datetime.strptime(iso, "%Y-%m-%d").date()
        except Exception:
            return error_response("Invalid or missing date. Use YYYY-MM-DD", 400)

        weekday = dt_date.strftime("%A")

        with SessionLocal() as s:
            # avail rows that apply: either date-specific for this date, or general by weekday
            rows = s.execute(
                select(Availability).where(
                    ((Availability.day == weekday) & (Availability.date == None)) | (Availability.date == dt_date)
                ).order_by(Availability.start_time)
            ).scalars().all()

            # existing appointments on that date (not cancelled)
            appts = s.execute(
                select(Appointment).where((Appointment.date == dt_date) & (Appointment.status != "cancelled"))
            ).scalars().all()

            # build list of occupied intervals
            occupied = []
            for a in appts:
                if a.start_time and a.end_time:
                    occupied.append((a.start_time, a.end_time))

            def is_conflict(s_st, s_et):
                for o_st, o_et in occupied:
                    if (s_st < o_et and s_et > o_st):
                        return True
                return False

            slots = []
            for r in rows:
                st = r.start_time
                et = r.end_time
                if not st or not et:
                    continue
                cur_min = st.hour * 60 + st.minute
                end_min = et.hour * 60 + et.minute
                while cur_min + 30 <= end_min:
                    s_h, s_m = divmod(cur_min, 60)
                    e_min = cur_min + 30
                    e_h, e_m = divmod(e_min, 60)
                    if e_h > 23:
                        break
                    from datetime import time as dt_time
                    slot_start = dt_time(s_h, s_m)
                    slot_end = dt_time(e_h, e_m)
                    if not is_conflict(slot_start, slot_end):
                        slots.append(fmt_time(slot_start))
                    cur_min += 30

            # remove duplicates and sort by time
            seen = set()
            parsed = []
            for s in slots:
                t = validate_time_format(s)
                if t is not None:
                    parsed.append((t, s))

            parsed.sort(key=lambda x: (x[0].hour, x[0].minute))
            out = []
            for t, s in parsed:
                if s not in seen:
                    seen.add(s)
                    out.append(s)

            return success_response({"slots": out})

    @app.post("/api/availability")
    def add_availability():
        body = request.get_json(force=True) or {}
        day = (body.get("day") or "").strip()
        start = body.get("start")
        end = body.get("end")
        raw_date = body.get("date")
        
        if not day or not start or not end:
            return error_response("Missing day, start time, or end time", 400)
        
        # Validate day name
        if not validate_day_name(day):
            return error_response(f"Invalid day. Must be one of: {', '.join(VALID_DAYS)}", 400)
        
        # Parse and validate times
        st = validate_time_format(start)
        et = validate_time_format(end)

        # Parse optional date (accepts YYYY-MM-DD or common formats)
        parsed_date = None
        if raw_date:
            rd = str(raw_date).strip()
            parsed_date = None
            for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%d-%m-%Y"]:
                try:
                    parsed_date = datetime.strptime(rd, fmt).date()
                    break
                except Exception:
                    parsed_date = None
            if not parsed_date:
                return error_response("Invalid date format. Use YYYY-MM-DD", 400)
        
        if not st or not et:
            return error_response("Invalid time format. Use HH:MM or hh:MM AM/PM", 400)
        
        # Validate start < end
        if st >= et:
            return error_response("Start time must be before end time", 400)
        
        with SessionLocal() as s:
            try:
                # Check for overlapping slots on same day
                existing = s.execute(
                    select(Availability).where(Availability.day == day)
                ).scalars().all()
                
                for slot in existing:
                    # Check for overlap
                    if (st < slot.end_time and et > slot.start_time):
                        return error_response(f"Time slot overlaps with existing availability from {slot.start_time.strftime('%I:%M %p')} to {slot.end_time.strftime('%I:%M %p')}", 400)
                
                a = Availability(day=day, start_time=st, end_time=et)
                if parsed_date is not None:
                    a.date = parsed_date
                s.add(a)
                s.flush()
                s.commit()
                return success_response({"id": a.id}, 201)
            except Exception as e:
                s.rollback()
                return error_response("Unable to add availability. Please try again.", 500)

    @app.delete("/api/availability/<int:aid>")
    def delete_availability(aid: int):
        """Delete availability slot - admin only in practice but no token check for now"""
        if not aid or aid < 1:
            return error_response("Invalid availability ID", 400)
        
        with SessionLocal() as s:
            try:
                obj = s.get(Availability, aid)
                if not obj:
                    return error_response("Availability slot not found", 404)
                s.delete(obj)
                s.commit()
                return success_response()
            except Exception as e:
                s.rollback()
                return error_response("Unable to delete availability. Please try again.", 500)

    @app.patch("/api/availability/<int:aid>")
    def update_availability(aid: int):
        body = request.get_json(force=True) or {}
        day = (body.get("day") or "").strip()
        start = body.get("start")
        end = body.get("end")
        raw_date = body.get("date")

        if not aid:
            return error_response("Missing availability id", 400)

        # Validate day if provided
        if day and not validate_day_name(day):
            return error_response(f"Invalid day. Must be one of: {', '.join(VALID_DAYS)}", 400)

        # Parse times if provided
        st = validate_time_format(start) if start is not None else None
        et = validate_time_format(end) if end is not None else None

        # Parse optional date
        parsed_date = None
        if raw_date:
            rd = str(raw_date).strip()
            for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%d-%m-%Y"]:
                try:
                    parsed_date = datetime.strptime(rd, fmt).date()
                    break
                except Exception:
                    parsed_date = None
            if not parsed_date:
                return error_response("Invalid date format. Use YYYY-MM-DD", 400)

        with SessionLocal() as s:
            try:
                obj = s.get(Availability, aid)
                if not obj:
                    return error_response("Availability slot not found", 404)

                new_day = day or obj.day
                new_start = st or obj.start_time
                new_end = et or obj.end_time
                new_date = parsed_date if raw_date is not None else (obj.date if getattr(obj, 'date', None) is not None else None)

                if new_start and new_end and new_start >= new_end:
                    return error_response("Start time must be before end time", 400)

                # Check for overlap with other slots on same day
                existing = s.execute(
                    select(Availability).where(Availability.day == new_day)
                ).scalars().all()
                for slot in existing:
                    if slot.id == aid:
                        continue
                    if (new_start < slot.end_time and new_end > slot.start_time):
                        return error_response(f"Time slot overlaps with existing availability from {slot.start_time.strftime('%I:%M %p')} to {slot.end_time.strftime('%I:%M %p')}", 400)

                # Apply updates
                obj.day = new_day
                obj.start_time = new_start
                obj.end_time = new_end
                if new_date is not None:
                    obj.date = new_date
                else:
                    obj.date = None

                s.add(obj)
                s.commit()
                return success_response({"id": obj.id})
            except Exception as e:
                s.rollback()
                return error_response("Unable to update availability. Please try again.", 500)

    @app.get("/api/appointments")
    def list_appointments():
        try:
            with SessionLocal() as s:
                stmt = select(Appointment, Student).outerjoin(Student, Appointment.student_id == Student.id).order_by(Appointment.id.desc())
                rows = s.execute(stmt).all()
                out = []
                for r, stu in rows:
                    # Build full display name from student record when possible
                    full_name = ""
                    if stu:
                        if getattr(stu, 'name', None):
                            full_name = stu.name
                        else:
                            parts = [p for p in [(stu.first_name or ""), (stu.middle_name or ""), (stu.last_name or "")] if p]
                            full_name = " ".join(parts)
                    else:
                        # fallback: try guest name or empty
                        full_name = getattr(r, 'guest', None) and getattr(r.guest, 'name', '') or ""

                    out.append({
                        "id": r.id,
                        "name": full_name or "",
                        "firstName": (stu.first_name if stu else "") or "",
                        "middleName": (stu.middle_name if stu else "") or "",
                        "lastName": (stu.last_name if stu else "") or "",
                        "studentId": (stu.student_id if stu else (r.student_id or "")) or "",
                        "email": (stu.email if stu else "") or "",
                        "reason": r.reason,
                        "iso": r.date.isoformat() if r.date else "",
                        "date": (r.date.isoformat() if r.date else ""),
                        "submittedAt": (_iso_utc(r.created_at) if r.created_at else ""),
                        "start": fmt_time(r.start_time),
                        "end": fmt_time(r.end_time),
                        "status": r.status or "pending",
                        "rescheduleRequested": bool(getattr(r, 'reschedule_requested', False)),
                        "rescheduleDate": (r.reschedule_date.isoformat() if getattr(r, 'reschedule_date', None) else ""),
                        "rescheduleStart": (fmt_time(getattr(r, 'reschedule_start_time', None)) if getattr(r, 'reschedule_start_time', None) else ""),
                        "rescheduleEnd": (fmt_time(getattr(r, 'reschedule_end_time', None)) if getattr(r, 'reschedule_end_time', None) else ""),
                        "rescheduleReason": (getattr(r, 'reschedule_reason', None) or ""),
                        "cancelledAt": (_iso_utc(getattr(r, 'cancelled_at', None)) if getattr(r, 'cancelled_at', None) else ""),
                        "cancelReason": (getattr(r, 'cancel_reason', None) or ""),
                        "adminNote": (getattr(r, 'admin_note', None) or ""),
                        "guest": bool(r.guest_id) or bool(r.is_walkin)
                    })
                return success_response({"appointments": out})
        except Exception as e:
            return error_response("Unable to load appointments. Please try again.", 500)

    @app.post("/api/appointments")
    def create_appointment():
        body = request.get_json(force=True) or {}
        iso = body.get("iso") or body.get("date") or ""
        
        # Parse and validate date
        dt_date = None
        try:
            dt_date = datetime.strptime(iso, "%Y-%m-%d").date()
        except Exception:
            dt_date = datetime.utcnow().date()
        
        # Don't allow past dates
        if dt_date < datetime.utcnow().date():
            return error_response("Cannot book appointments in the past", 400)
        
        # Parse and validate times
        start_val = body.get("start") or body.get("time")
        end_val = body.get("end")
        
        # If no start time provided, default to 9:00 AM
        if not start_val:
            st = time(9, 0)
        else:
            st = validate_time_format(start_val)
            if not st:
                return error_response("Invalid start time format. Use HH:MM or hh:MM AM/PM", 400)
        
        # If no end time provided, default to 1 hour after start
        if not end_val:
            # Add 1 hour to start time
            start_minutes = st.hour * 60 + st.minute
            end_minutes = min(start_minutes + 60, 23 * 60 + 59)
            et = time(end_minutes // 60, end_minutes % 60)
        else:
            et = validate_time_format(end_val)
            if not et:
                return error_response("Invalid end time format. Use HH:MM or hh:MM AM/PM", 400)
        
        # Validate start < end
        if st >= et:
            return error_response("Start time must be before end time", 400)
        
        # Parse IDs
        def to_int_or_none(v):
            try:
                if v is None or v == "":
                    return None
                return int(v)
            except Exception:
                return None

        raw_student_val = body.get("studentId")
        guest_id = to_int_or_none(body.get("guestId"))
        is_walkin = bool(body.get("guest", False))

        # Resolve student: accept either DB primary key or student number string
        student_id = None

        with SessionLocal() as s:
            # try numeric primary key first if provided
            if raw_student_val is not None and raw_student_val != "":
                try:
                    cand = int(raw_student_val)
                    cand_row = s.get(Student, cand)
                    if cand_row:
                        student_id = cand_row.id
                except Exception:
                    cand = None

                # if not found by PK, try lookup by student.student_id (student number)
                if student_id is None:
                    cand_str = str(raw_student_val)
                    cand_row = s.execute(select(Student).where(Student.student_id == cand_str)).scalar_one_or_none()
                    if cand_row:
                        student_id = cand_row.id

        # Validate that either student_id, guest_id, or is_walkin is provided
        if not student_id and not guest_id and not is_walkin:
            return error_response("Must provide studentId, guestId, or set guest=true for walk-in", 400)

        # Validate status
        status = (body.get("status") or "pending").lower()
        if not validate_appointment_status(status):
            return error_response(f"Invalid status. Must be one of: {', '.join(VALID_APPOINTMENT_STATUSES)}", 400)
        
        reason = (body.get("reason") or "").strip()
        
        with SessionLocal() as s:
            try:
                # Verify student exists if student_id provided
                if student_id:
                    student = s.get(Student, student_id)
                    if not student:
                        return error_response(f"Student with ID {student_id} not found", 404)
                
                # Verify guest exists if guest_id provided
                if guest_id:
                    guest = s.execute(
                        select(GuestAccount).where(GuestAccount.id == guest_id)
                    ).scalar_one_or_none()
                    if not guest:
                        return error_response(f"Guest with ID {guest_id} not found", 404)
                
                # Check for appointment conflicts
                conflicts = s.execute(
                    select(Appointment).where(
                        (Appointment.date == dt_date) &
                        (Appointment.start_time < et) &
                        (Appointment.end_time > st) &
                        (Appointment.status != "cancelled")
                    )
                ).scalars().all()
                
                if conflicts and (student_id or guest_id):
                    return error_response("This time slot has a scheduling conflict", 400)
                
                a = Appointment(
                    reason=reason,
                    status=status,
                    student_id=student_id,
                    guest_id=guest_id,
                    date=dt_date,
                    start_time=st,
                    end_time=et,
                    is_walkin=is_walkin
                )
                s.add(a)
                s.flush()
                s.commit()
                return success_response({"id": a.id}, 201)
            except Exception as e:
                s.rollback()
                return error_response("Unable to create appointment. Please try again.", 500)

    @app.patch("/api/appointments/<int:apt_id>")
    def update_appointment(apt_id: int):
        if not apt_id or apt_id < 1:
            return error_response("Invalid appointment ID", 400)
        
        body = request.get_json(force=True) or {}
        
        with SessionLocal() as s:
            try:
                obj = s.get(Appointment, apt_id)
                if not obj:
                    return error_response("Appointment not found", 404)
                
                # Update status if provided
                if "status" in body:
                    status = (body["status"] or "").lower()
                    if not validate_appointment_status(status):
                        return error_response(f"Invalid status. Must be one of: {', '.join(VALID_APPOINTMENT_STATUSES)}", 400)
                    # If cancelling, record cancelled_at timestamp
                    if status == 'cancelled':
                        from datetime import datetime as _dt
                        obj.status = 'cancelled'
                        obj.cancelled_at = _dt.utcnow()
                        # record optional cancellation reason if provided
                        cr = body.get('cancelReason') or body.get('cancel_reason') or ''
                        if cr:
                            try:
                                obj.cancel_reason = str(cr)[:500]
                            except Exception:
                                obj.cancel_reason = ''
                    else:
                        # clear cancelled_at when setting other statuses
                        obj.status = status
                        if getattr(obj, 'cancelled_at', None) is not None:
                            obj.cancelled_at = None

                # Allow updating cancel reason or admin note even when status not provided
                if 'cancelReason' in body or 'cancel_reason' in body:
                    try:
                        obj.cancel_reason = str(body.get('cancelReason') or body.get('cancel_reason') or '')[:500]
                    except Exception:
                        obj.cancel_reason = ''
                if 'adminNote' in body or 'admin_note' in body:
                    try:
                        obj.admin_note = str(body.get('adminNote') or body.get('admin_note') or '')[:500]
                    except Exception:
                        obj.admin_note = ''

                # Reschedule request handling
                # Accept either camelCase or snake_case fields from frontend
                res_date_raw = body.get('rescheduleDate') or body.get('reschedule_date')
                res_start_raw = body.get('rescheduleStart') or body.get('reschedule_start')
                res_end_raw = body.get('rescheduleEnd') or body.get('reschedule_end')
                res_reason = body.get('rescheduleReason') or body.get('reschedule_reason')
                approve_res = body.get('approveReschedule') or body.get('approve_reschedule')

                # If client is requesting a reschedule proposal
                if any([res_date_raw, res_start_raw, res_end_raw, res_reason]):
                    # Parse date
                    parsed_res_date = None
                    try:
                        if res_date_raw:
                            parsed_res_date = datetime.strptime(str(res_date_raw), "%Y-%m-%d").date()
                    except Exception:
                        return error_response("Invalid reschedule date format. Use YYYY-MM-DD", 400)

                    # Parse times
                    parsed_res_start = validate_time_format(res_start_raw) if res_start_raw else None
                    parsed_res_end = validate_time_format(res_end_raw) if res_end_raw else None

                    if parsed_res_start and parsed_res_end and parsed_res_start >= parsed_res_end:
                        return error_response("Reschedule start time must be before end time", 400)

                    # Do not allow rescheduling into the past
                    if parsed_res_date and parsed_res_date < datetime.utcnow().date():
                        return error_response("Cannot request reschedule to a past date", 400)

                    obj.reschedule_requested = True
                    obj.reschedule_date = parsed_res_date
                    obj.reschedule_start_time = parsed_res_start
                    obj.reschedule_end_time = parsed_res_end
                    try:
                        obj.reschedule_reason = str(res_reason)[:500] if res_reason else None
                    except Exception:
                        obj.reschedule_reason = None
                    # Mark appointment as rescheduled (proposal) — requires admin approval to become confirmed/ongoing
                    obj.status = 'rescheduled'

                # If admin approves a pending reschedule request
                if approve_res:
                    # Only allow approve when there is a proposed reschedule
                    if getattr(obj, 'reschedule_requested', False) and getattr(obj, 'reschedule_date', None):
                        # Promote proposed values to appointment
                        if getattr(obj, 'reschedule_date', None):
                            obj.date = obj.reschedule_date
                        if getattr(obj, 'reschedule_start_time', None):
                            obj.start_time = obj.reschedule_start_time
                        if getattr(obj, 'reschedule_end_time', None):
                            obj.end_time = obj.reschedule_end_time
                        # Promote to confirmed (ongoing) and clear reschedule fields
                        obj.status = 'confirmed'
                        obj.reschedule_requested = False
                        obj.reschedule_date = None
                        obj.reschedule_start_time = None
                        obj.reschedule_end_time = None
                        obj.reschedule_reason = None

                s.add(obj)
                s.commit()
                return success_response()
            except Exception as e:
                s.rollback()
                return error_response("Unable to update appointment. Please try again.", 500)

    @app.get("/api/admin/students")
    def list_all_students():
        """Get all students (admin only in practice but no token check for now)"""
        try:
            with SessionLocal() as s:
                rows = s.execute(select(Student).order_by(Student.created_at.desc())).scalars().all()
                out = []
                for row in rows:
                    avatar_url = f"/Images/{row.avatar}" if getattr(row, "avatar", None) else ""
                    out.append({
                        "id": row.id,
                        "studentId": row.student_id,
                        "name": row.name or "",
                        "firstName": row.first_name or "",
                        "middleName": row.middle_name or "",
                        "lastName": row.last_name or "",
                        "email": row.email,
                        "contact": row.contact or "",
                        "course": row.course or "",
                        "isActive": row.is_active,
                        "createdAt": _iso_utc(row.created_at) if row.created_at else "",
                        "avatar": avatar_url
                    })
                return success_response({"students": out})
        except Exception as e:
            return error_response("Unable to load students. Please try again.", 500)

    @app.get("/api/admin/students/<int:student_id>")
    def get_student_by_id(student_id: int):
        """Get a specific student by ID (admin only in practice but no token check for now)"""
        if not student_id or student_id < 1:
            return error_response("Invalid student ID", 400)
        
        try:
            with SessionLocal() as s:
                row = s.get(Student, student_id)
                if not row:
                    return error_response("Student not found", 404)
                avatar_url = f"/Images/{row.avatar}" if getattr(row, "avatar", None) else ""
                return success_response({
                    "student": {
                        "id": row.id,
                        "studentId": row.student_id,
                        "name": row.name or "",
                        "firstName": row.first_name or "",
                        "middleName": row.middle_name or "",
                        "lastName": row.last_name or "",
                        "email": row.email,
                        "contact": row.contact or "",
                        "course": row.course or "",
                        "isActive": row.is_active,
                                "createdAt": _iso_utc(row.created_at) if row.created_at else "",
                        "avatar": avatar_url
                    }
                })
        except Exception as e:
            return error_response("Unable to load student details. Please try again.", 500)

    @app.patch("/api/admin/students/<int:student_id>/status")
    def update_student_status(student_id: int):
        """Toggle student active status (admin only in practice but no token check for now)"""
        if not student_id or student_id < 1:
            return error_response("Invalid student ID", 400)
        
        body = request.get_json(force=True) or {}
        is_active = body.get("isActive")
        
        if is_active is None:
            return error_response("Missing isActive field", 400)
            
        try:
            with SessionLocal() as s:
                row = s.get(Student, student_id)
                if not row:
                    return error_response("Student not found", 404)
                
                row.is_active = bool(is_active)
                s.add(row)
                s.commit()
                
                return success_response({
                    "message": f"Student account {'activated' if is_active else 'deactivated'} successfully",
                    "isActive": row.is_active
                })
        except Exception as e:
            return error_response("Unable to update student status. Please try again.", 500)

    return app