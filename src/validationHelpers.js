/**
 * Frontend Validation Helpers
 * Provides client-side validation for forms and user input
 */

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

export function validateEmail(email) {
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return pattern.test(email.trim())
}

export function validateEmailMessage(email) {
  if (!email) return 'Email is required'
  if (!validateEmail(email)) return 'Invalid email format'
  return ''
}

// ============================================================================
// PASSWORD VALIDATION
// ============================================================================

const MIN_PASSWORD_LENGTH = 8

export function validatePassword(password) {
  const errors = []
  
  if (!password) {
    return { valid: false, errors: ['Password is required'] }
  }
  
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  }
}

export function validatePasswordMessage(password) {
  const result = validatePassword(password)
  return result.errors.length > 0 ? result.errors[0] : ''
}

// ============================================================================
// PHONE VALIDATION
// ============================================================================

export function validatePhone(phone) {
  if (!phone) return true // Phone is optional
  const raw = String(phone).trim()
  // Reject if contains letters or invalid characters
  if (/[^0-9+\s()\-]/.test(raw)) return false
  const cleaned = raw.replace(/[^0-9+]/g, '')
  // Accept +63 or 63 (country code) followed by 9 or 10 digits, or local 09XXXXXXXXX (11 digits)
  if (/^\+63\d{9,10}$/.test(cleaned)) return true
  if (/^63\d{9,10}$/.test(cleaned)) return true
  if (/^09\d{9}$/.test(cleaned)) return true
  return false
}

export function validatePhoneMessage(phone) {
  if (!phone) return ''
  if (!validatePhone(phone)) return 'Phone number must be 11 digits (09XXXXXXXXX) or start with 63/+63 followed by 9–10 digits'
  return ''
}

// ============================================================================
// NAME VALIDATION
// ============================================================================

export function validateName(name, minLength = 2) {
  if (!name) return false
  return name.trim().length >= minLength
}

export function validateNameMessage(name, fieldName = 'Name', minLength = 2) {
  if (!name) return `${fieldName} is required`
  if (name.trim().length < minLength) return `${fieldName} must be at least ${minLength} characters`
  return ''
}

// ============================================================================
// STUDENT NUMBER VALIDATION
// ============================================================================

export function validateStudentNumber(studentNumber) {
  if (!studentNumber) return false
  // Require format: four digits, a dash, then four digits (e.g. 2023-0000)
  return /^\d{4}-\d{4}$/.test(String(studentNumber).trim())
}

export function validateStudentNumberMessage(studentNumber) {
  if (!studentNumber) return 'Student number is required'
  if (!/^\d{4}-\d{4}$/.test(String(studentNumber).trim())) return 'Student number must be in the format 0000-0000 (four digits, dash, four digits)'
  return ''
}

// ============================================================================
// TIME VALIDATION
// ============================================================================

export function validateTimeFormat(timeStr) {
  if (!timeStr) return false
  
  // Try HH:MM format
  const time24Regex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/
  if (time24Regex.test(timeStr)) return true
  
  // Try hh:MM AM/PM format
  const time12Regex = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s?(AM|PM|am|pm)$/
  return time12Regex.test(timeStr)
}

export function validateTimeFormatMessage(timeStr) {
  if (!timeStr) return 'Time is required'
  if (!validateTimeFormat(timeStr)) return 'Invalid time format (use HH:MM or hh:MM AM/PM)'
  return ''
}

export function validateTimeRange(startTime, endTime) {
  if (!validateTimeFormat(startTime) || !validateTimeFormat(endTime)) {
    return false
  }
  
  try {
    const start = new Date(`2000-01-01 ${startTime}`)
    const end = new Date(`2000-01-01 ${endTime}`)
    return start < end
  } catch {
    return false
  }
}

export function validateTimeRangeMessage(startTime, endTime) {
  if (!validateTimeRange(startTime, endTime)) {
    return 'Start time must be before end time'
  }
  return ''
}

// ============================================================================
// DATE VALIDATION
// ============================================================================

export function validateDateFormat(dateStr) {
  if (!dateStr) return false
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateStr)) return false
  
  const date = new Date(dateStr)
  return date instanceof Date && !isNaN(date)
}

export function validateFutureDate(dateStr) {
  if (!validateDateFormat(dateStr)) return false
  
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return date >= today
}

export function validateFutureDateMessage(dateStr) {
  if (!dateStr) return 'Date is required'
  if (!validateDateFormat(dateStr)) return 'Invalid date format (use YYYY-MM-DD)'
  if (!validateFutureDate(dateStr)) return 'Cannot book appointments in the past'
  return ''
}

// ============================================================================
// FILE VALIDATION
// ============================================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export function validateImageFile(file) {
  if (!file) return { valid: false, error: 'File is required' }
  
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size must be less than 5MB (current: ${(file.size / (1024 * 1024)).toFixed(2)}MB)` }
  }
  
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: `File type not allowed. Supported: ${ALLOWED_IMAGE_TYPES.join(', ')}` }
  }
  
  return { valid: true, error: '' }
}

// ============================================================================
// COMBINATION VALIDATORS
// ============================================================================

export function validateStudentSignup(data) {
  const errors = {}

  // Order validations to match the visual layout of the signup form
  // 1) First Name
  if (!validateName(data.firstName)) {
    errors.firstName = validateNameMessage(data.firstName, 'First Name')
  }

  // 2) Last Name
  if (!validateName(data.lastName)) {
    errors.lastName = validateNameMessage(data.lastName, 'Last Name')
  }

  // 3) Middle Name (optional) - validate if provided
  if (data.middleName && !validateName(data.middleName)) {
    errors.middleName = validateNameMessage(data.middleName, 'Middle Name')
  }

  // 4) Student Number
  if (!validateStudentNumber(data.studentNumber)) {
    errors.studentNumber = validateStudentNumberMessage(data.studentNumber)
  }

  // 5) Email
  const emailMsg = validateEmailMessage(data.email)
  if (emailMsg) errors.email = emailMsg

  // 6) Contact
  // 6) Contact (required)
  if (!data.contact || String(data.contact).trim().length === 0) {
    errors.contact = 'Contact number is required'
  } else {
    const phoneMsg = validatePhoneMessage(data.contact)
    if (phoneMsg) {
      errors.contact = phoneMsg
    }
  }

  // 7) Course (required)
  if (!data.course || data.course.trim().length === 0) {
    errors.course = 'Course is required'
  }

  // 8) Password
  const pwdValidation = validatePassword(data.password)
  if (!pwdValidation.valid) {
    errors.password = pwdValidation.errors[0]
  }

  // 9) Confirm Password
  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  }
}

export function validateGuestLogin(email, password) {
  const errors = {}
  
  const emailMsg = validateEmailMessage(email)
  if (emailMsg) errors.email = emailMsg
  
  if (!password) {
    errors.password = 'Password is required'
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  }
}

export function validateAppointment(data) {
  const errors = {}
  
  if (!validateFutureDate(data.date)) {
    errors.date = validateFutureDateMessage(data.date)
  }
  
  if (!validateTimeFormat(data.startTime)) {
    errors.startTime = validateTimeFormatMessage(data.startTime)
  }
  
  if (!validateTimeFormat(data.endTime)) {
    errors.endTime = validateTimeFormatMessage(data.endTime)
  }
  
  if (data.startTime && data.endTime && !validateTimeRange(data.startTime, data.endTime)) {
    errors.timeRange = validateTimeRangeMessage(data.startTime, data.endTime)
  }
  
  if (!data.reason || data.reason.trim().length === 0) {
    errors.reason = 'Reason for appointment is required'
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors) {
  return Object.entries(errors)
    .map(([field, message]) => `${field}: ${message}`)
    .join('\n')
}

/**
 * Get first error message
 */
export function getFirstError(errors) {
  const errorValues = Object.values(errors)
  return errorValues.length > 0 ? errorValues[0] : ''
}
