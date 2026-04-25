import Hero from './components/Hero'
import Gallery from './components/Gallery'
import OrderSection from './components/OrderSection'
import Footer from './components/Footer'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <div className="panel-info">
        <Hero />
        <Gallery />
        <Footer />
      </div>
      <div className="panel-order">
        <OrderSection />
      </div>
    </div>
  )
}
