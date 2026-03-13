# OSA Appointment System

Office of Student Affairs appointment booking system built with React, based on Figma design specifications.

## Features

- **Student Login / Signup** – Authentication with split-panel layout
- **Admin Login** – Centered admin authentication
- **Guest Login** – Book appointments without account
- **Student Dashboard** – View and create appointments
- **Appointment Modal** – Calendar, time slots, and reason selection
- **Admin Dashboard** – Stats, calendar, and appointment management
- **Responsive Design** – Mobile-friendly layouts

## Design Specs (from Figma)

- Primary: `#264F94`, `#0098EF`, `#2F5CE1`
- Fonts: Inter, Montserrat, Poppins
- Border radius: 16px, 25px, 30px

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Routes

| Path | Description |
|------|-------------|
| `/` | Home / landing |
| `/student/login` | Student sign in |
| `/student/signup` | Student registration |
| `/student/dashboard` | Student appointments |
| `/admin/login` | Admin sign in |
| `/admin/dashboard` | Admin management |
| `/guest/login` | Guest booking |

## Build

```bash
npm run build
```
