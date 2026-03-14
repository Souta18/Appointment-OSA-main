import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './Landing.css'

const FOOTER_LOGOS = [
  { src: '/Logos/osa.png', alt: 'Norzagaray College - Student Affairs', fallback: 'OSA' },
  { src: '/Logos/nc.png', alt: 'Norzagaray College', fallback: 'NC' },
  { src: '/Logos/ccs.png', alt: 'College of Computing Studies', fallback: 'CCS' },
  { src: '/Logos/2a.png', alt: 'ICON', fallback: 'ICON' },
]


export default function Landing() {
  const [logoErrors, setLogoErrors] = useState({})
  const [menuOpen, setMenuOpen] = useState(false)
  const setLogoError = (i) => setLogoErrors((prev) => ({ ...prev, [i]: true }))

    // no per-letter split effect — use section reveal + staggered children instead

  // intersection observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // add in-view to the element
          entry.target.classList.add('in-view')
          // if the element contains stagger children, reveal them with delays
          const staggerChildren = entry.target.querySelectorAll('.stagger-child')
          if (staggerChildren && staggerChildren.length) {
            staggerChildren.forEach((ch, i) => {
              ch.style.transitionDelay = `${i * 120}ms`
              ch.classList.add('in-view')
            })
          }
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.15 })

    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el))
  }, [])

  // nav shadow when scrolled
  useEffect(() => {
    const nav = document.querySelector('.landing-nav')
    const onScroll = () => {
      if (window.scrollY > 30) nav && nav.classList.add('scrolled')
      else nav && nav.classList.remove('scrolled')
    }
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // scroll spy to highlight nav links
  useEffect(() => {
    const sections = document.querySelectorAll('section[id]')
    const navLinks = document.querySelectorAll('.landing-nav-links a')
    const spy = (entries) => {
      entries.forEach(entry => {
        const id = entry.target.id
        const link = document.querySelector(`.landing-nav-links a[href=\"#${id}\"]`)
        if (entry.isIntersecting) {
          navLinks.forEach(l => l.classList.remove('active'))
          if (link) link.classList.add('active')
        }
      })
    }
    const spyObs = new IntersectionObserver(spy, { threshold: 0.5 })
    sections.forEach(sec => spyObs.observe(sec))
  }, [])

  // remove typewriter effect; use reveal animations instead

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-brand">
          <div className="landing-logo-osa" />
          <div className="landing-logo-nc" />
          <div className="landing-labels">
            <span className="landing-label">Norzagaray College</span>
            <div className="landing-title-line" />
            <h1 className="landing-title">Office of Student Affairs</h1>
            <span className="landing-address">Norzagaray, Bulacan</span>
          </div>
        </div>
        <button className={`landing-hamburger ${menuOpen ? 'open' : ''}`} aria-label="Toggle menu" onClick={() => setMenuOpen(!menuOpen)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M4 7H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="line line-1" />
            <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="line line-2" />
            <path d="M4 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="line line-3" />
          </svg>
        </button>
        <div className={`landing-nav-links ${menuOpen ? 'open' : ''}`}>
          <a href="#home" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#services" onClick={() => setMenuOpen(false)}>Services</a>
          <a href="#contacts" onClick={() => setMenuOpen(false)}>Contacts</a>
        </div>
        <Link to="/student/login" className="landing-cta">Book Appointment</Link>
      </nav>
      <div className="landing-divider" />

      <section id="home" className="landing-hero">
        <video className="hero-video" src="/Images/NcVids.mp4" autoPlay muted loop playsInline preload="metadata" />
        <div className="hero-video-overlay" />
        <h1 className="animate-on-scroll reveal-zoom">Welcome to the
          <span className="hero-accent">Office of Student Affairs</span>
        </h1>
        <p className="animate-on-scroll reveal-zoom">Your partner in academic success and personal growth. We provide comprehensive support services to help you thrive during your time at Norzagaray College.</p>
        <div className="hero-buttons">
          <Link to="/student/login" className="btn-hero-primary">Book Now</Link>
          <a href="#services" className="btn-hero-outline">View Services</a>
        </div>
      </section>

      <section id="about" className="landing-about">
        <div className="about-overlay" />
        <div className="about-content animate-on-scroll">
          <h2 className="about-title stagger-child">About Office of Student Affairs</h2>
          <p className="about-paragraph stagger-child">
            The Office of Student Affairs (OSA) is responsible for providing educational and student support services that focus on the overall development and welfare of students. Based on the interview, OSA handles several important services such as student counseling, mental health support, academic and personal concern assistance, and referrals to the guidance center when necessary.
          </p>
          <p className="about-paragraph stagger-child">
            The office also manages student discipline by implementing the student code of conduct and handling disciplinary processes. OSA supports student organizations, leadership programs, and student engagement activities. It also promotes equality, inclusion, and advocacy by addressing student complaints and maintaining a respectful campus environment.
          </p>
        </div>
      </section>

      <section id="services" className="landing-services">
        <div className="services-overlay" />
        <h2 className="animate-on-scroll">Services</h2>
        <p className="services-subtitle animate-on-scroll">Comprehensive support for your academic and personal development</p>
        <div className="services-grid">
          <div className="service-card animate-on-scroll">
            <div className="service-icon">🤝</div>
            <h3>Academic Consultation</h3>
            <p>One-on-one guidance for your academic planning and course selection</p>
          </div>
          <div className="service-card animate-on-scroll">
            <div className="service-icon">👥</div>
            <h3>Student Support</h3>
            <p>Scholarship inquiries, document requests, and student welfare services</p>
          </div>
          <div className="service-card animate-on-scroll">
            <div className="service-icon">📅</div>
            <h3>Appointment Scheduling</h3>
            <p>Book your visit conveniently through our online appointment system</p>
          </div>
        </div>
      </section>

      <section id="contacts" className="landing-contact">
        <div className="contact-overlay" />
        <h2 className="animate-on-scroll">Contact Us</h2>
        <p className="contact-subtitle animate-on-scroll">Reach out to the OSA team</p>
        <div className="contact-grid">
          <div className="contact-item animate-on-scroll">
            <div className="contact-circle contact-circle--phone">
              <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
            </div>
            <div className="contact-details">
              <h3 className="contact-heading">Call Us</h3>
              <p className="contact-line">(+63) 123-456-7890</p>
              <p className="contact-line">Mon-Fri: 8AM-5PM</p>
            </div>
          </div>
          <div className="contact-item animate-on-scroll">
            <div className="contact-circle contact-circle--email">
              <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </div>
            <div className="contact-details">
              <h3 className="contact-heading">Email Us</h3>
              <p className="contact-line">osa@norzagaray.edu.ph</p>
              <p className="contact-line">We reply within 24 hours</p>
            </div>
          </div>
          <div className="contact-item animate-on-scroll">
            <div className="contact-circle contact-circle--hours">
              <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
              </svg>
            </div>
            <div className="contact-details">
              <h3 className="contact-heading">Office Hours</h3>
              <p className="contact-line">Monday - Friday</p>
              <p className="contact-line">8:00 AM - 5:00 PM</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logos">
              {FOOTER_LOGOS.map((logo, i) => (
                <div key={i} className="footer-logo-item">
                  {!logoErrors[i] ? (
                    <img src={logo.src} alt={logo.alt} onError={() => setLogoError(i)} />
                  ) : null}
                  {(logoErrors[i] || !logo.src) && (
                    <span className="footer-logo-fallback">{logo.fallback}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="footer-brand-text">
              <h4>Norzagaray College</h4>
              <p className="footer-osa">Office of the Student Affairs</p>
              <p className="footer-mission">Committed to providing comprehensive support services to ensure student success and well-being throughout their academic journey.</p>
            </div>
          </div>
          <div className="footer-contact-block">
            <h4 className="footer-contact-title">Contact Information</h4>
            <div className="footer-contact">
              <p><span className="footer-icon" aria-hidden><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></span> Norzagaray, Bulacan, Philippines</p>
              <p><span className="footer-icon" aria-hidden><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg></span> (+63) 123-456-7890</p>
              <p><span className="footer-icon" aria-hidden><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg></span> osa@norzagaray.edu.ph</p>
              <p><span className="footer-icon" aria-hidden><svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></span> Norzagaray College, Office of the Student Affairs</p>
            </div>
          </div>
        </div>
          <div className="footer-bottom">
          <p className="footer-copyright">© BSCS2A - Norzagaray College All rights reserved</p>
          <div className="footer-auth-links">
            <Link to="/student/login">Student Login</Link>
            <Link to="/admin/walkin" className="walkin-link">Walk-in</Link>
            <Link to="/admin/login" className="admin-link">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
