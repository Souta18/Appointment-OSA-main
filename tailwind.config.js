/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'nc-blue': '#0B63B7',
      },
      borderRadius: {
        'nc-lg': '18px',
      },
      boxShadow: {
        'nc-card': '0 14px 30px rgba(16,24,40,0.08)',
        'nc-soft': '0 8px 18px rgba(16,24,40,0.06)',
      }
    },
  },
  plugins: [],
}
