import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <p className="footer-address">מולדת · פיצריה מהלב</p>
      <a href="#admin" className="footer-admin-btn">ניהול</a>
      <p className="footer-copy">{import.meta.env.VITE_CREDITS_NAME} {new Date().getFullYear()} ©</p>
    </footer>
  )
}
