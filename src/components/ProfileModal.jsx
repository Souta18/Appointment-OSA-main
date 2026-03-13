import { useState, useEffect, useRef } from 'react'
import { updateStudentAvatar, getStudentProfile } from '../api'
import './ProfileModal.css'

export default function ProfileModal({ userType = 'student', onClose }) {
  const prefix = userType === 'admin' ? 'admin' : 'student'
  const nameKey = `${prefix}Name`
  const emailKey = `${prefix}Email`
  const idKey = `${prefix}Id`
  const courseKey = `${prefix}Course`
  const contactKey = `${prefix}Contact`
  const avatarKey = `${prefix}Avatar`

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [ident, setIdent] = useState('')
  const [course, setCourse] = useState('')
  const [contact, setContact] = useState('')
  const [avatar, setAvatar] = useState(null)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    const run = async () => {
      let n = ''
      let e = ''
      let i = ''
      let crs = ''
      let c = ''
      let a = ''
      try {
        n = localStorage.getItem(nameKey) || ''
        e = localStorage.getItem(emailKey) || ''
        i = localStorage.getItem(idKey) || ''
        crs = localStorage.getItem(courseKey) || ''
        c = localStorage.getItem(contactKey) || ''
        a = localStorage.getItem(avatarKey) || ''
      } catch (err) {}

      // If any key fields are missing and this is a student, refresh from API.
      if (userType === 'student' && i && (!n || !e || !crs || !c || !a)) {
        const res = await getStudentProfile(i)
        if (res?.ok && res.student) {
          n = res.student.name || n
          e = res.student.email || e
          crs = res.student.course || crs
          c = res.student.contact || c
          a = res.student.avatar || a
          try {
            localStorage.setItem(nameKey, n)
            localStorage.setItem(emailKey, e)
            localStorage.setItem(courseKey, crs)
            localStorage.setItem(contactKey, c)
            localStorage.setItem(avatarKey, a)
          } catch (err) {}
        }
      }

      setName(n)
      setEmail(e)
      setIdent(i)
      setCourse(crs)
      setContact(c)
      setAvatar(a)
      setPreview(a || null)
    }
    run()
  }, [userType, nameKey, emailKey, idKey, courseKey, contactKey, avatarKey])

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPreview(ev.target.result)
    }
    reader.readAsDataURL(f)
  }

  const handleSave = () => {
    const run = async () => {
      // Only upload if we have a new data URL; otherwise just persist local preview.
      const studentNumber = ident
      let finalAvatar = preview

      if (preview && preview.startsWith('data:image') && studentNumber) {
        const res = await updateStudentAvatar(studentNumber, preview)
        if (res?.ok && res.avatar) {
          finalAvatar = res.avatar
        }
      }

      try {
        if (finalAvatar) localStorage.setItem(avatarKey, finalAvatar)
      } catch (e) {}

      if (typeof onClose === 'function') onClose()
    }
    run()
  }

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="profile-modal-inner">
          <h3 className="profile-title">Personal Information</h3>
          <div className="profile-grid">
            <div className="profile-left">
              <div className="avatar-preview">
                {preview ? (
                  <img src={preview} alt="avatar preview" />
                ) : (
                  <div className="avatar-placeholder">👤</div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" id="profile-file" className="profile-file" onChange={onFile} />
              <label htmlFor="profile-file" className="profile-browse">Browse</label>
            </div>
            <div className="profile-right">
              <label className="field-label">Full Name</label>
              <input className="field-input" value={name} disabled />

              <label className="field-label">Student ID</label>
              <input className="field-input" value={ident} disabled />

              <label className="field-label">Course</label>
              <input className="field-input" value={course} disabled />

              <label className="field-label">Email Address</label>
              <input className="field-input" value={email} disabled />

              <label className="field-label">Contact Number</label>
              <input className="field-input" value={contact} disabled />

              <div className="profile-actions">
                <button className="btn btn-secondary" onClick={onClose}>Close</button>
                <button className="btn btn-primary" onClick={handleSave}>Update</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
