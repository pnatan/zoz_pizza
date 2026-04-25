import Hero from './components/Hero'
import Menu from './components/Menu'
import Gallery from './components/Gallery'
import OrderSection from './components/OrderSection'
import Footer from './components/Footer'
import './App.css'

export default function App() {
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
    </div>
  )
}
