try:
    from .db import Base
except Exception:  # pragma: no cover
    from db import Base  # type: ignore
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Time, Date
from sqlalchemy.orm import relationship
from datetime import datetime

class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    name = Column(String(100))
    role = Column(String(50), default="admin")
    created_at = Column(DateTime, default=datetime.utcnow)

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True)
    student_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(100))
    first_name = Column(String(100))
    middle_name = Column(String(100))
    last_name = Column(String(100))
    email = Column(String(100), unique=True, nullable=False)
    contact = Column(String(20))
    password = Column(String(255), nullable=False)
    course = Column(String(100))
    avatar = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    appointments = relationship("Appointment", back_populates="student")

class GuestAccount(Base):
    __tablename__ = "guest_accounts"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    contact = Column(String(20))
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    appointments = relationship("Appointment", back_populates="guest")

class Availability(Base):
    __tablename__ = "availability"
    id = Column(Integer, primary_key=True)
    day = Column(String(20), nullable=False)
    date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True)
    reason = Column(String(500))
    status = Column(String(50), default="pending")
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time)
    is_walkin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    cancelled_at = Column(DateTime, nullable=True)
    cancel_reason = Column(String(500), nullable=True)
    admin_note = Column(String(500), nullable=True)
    # Reschedule request fields
    reschedule_requested = Column(Boolean, default=False)
    reschedule_date = Column(Date, nullable=True)
    reschedule_start_time = Column(Time, nullable=True)
    reschedule_end_time = Column(Time, nullable=True)
    reschedule_reason = Column(String(500), nullable=True)
    # Track who created/cancelled the appointment: 'student', 'guest', 'admin', or 'system'
    created_by = Column(String(20), default=None)
    cancelled_by = Column(String(20), nullable=True)
    
    student_id = Column(Integer, ForeignKey("students.id"))
    guest_id = Column(Integer, ForeignKey("guest_accounts.id"))
    
    student = relationship("Student", back_populates="appointments")
    guest = relationship("GuestAccount", back_populates="appointments")


class Ban(Base):
    __tablename__ = "bans"
    id = Column(Integer, primary_key=True)
    email = Column(String(120), nullable=False)
    until = Column(DateTime, nullable=False)
    reason = Column(String(200))
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    user_type = Column(String(20), nullable=False)
    title = Column(String(100), nullable=False)
    message = Column(String(500), nullable=False)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class OTP(Base):
    __tablename__ = "otps"
    id = Column(Integer, primary_key=True)
    email = Column(String(120), nullable=False)
    otp = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)