import { useState, useEffect } from 'react'
import Hero from './components/Hero'
import Menu from './components/Menu'
import Gallery from './components/Gallery'
import OrderSection from './components/OrderSection'
import Footer from './components/Footer'
import AdminPanel from './components/AdminPanel'
import './App.css'

export default function App() {
  const [showAdmin, setShowAdmin] = useState(window.location.hash === '#admin')

  useEffect(() => {
    function onHashChange() {
      setShowAdmin(window.location.hash === '#admin')
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function closeAdmin() {
    window.location.hash = ''
    setShowAdmin(false)
  }

  return (
    <div className="app">
      <div className="panel-info">
        <Hero />
        <Menu />
        <Gallery />
      </div>
      <div className="panel-order">
        <OrderSection />
      </div>
      <Footer />
      {showAdmin && <AdminPanel onClose={closeAdmin} />}
    </div>
  )
}
