import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <p className="footer-address">מולדת · פיצריה מהלב</p>
      <p className="footer-copy">Natan Preminger {new Date().getFullYear()} ©</p>
    </footer>
  )
}
