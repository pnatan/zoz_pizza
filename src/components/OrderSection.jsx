import { useState } from 'react'
import PizzaCard from './PizzaCard'
import './OrderSection.css'

const TOPPING_LABELS = {
  mushrooms: 'פטריות', olives: 'זיתים', peppers: 'פלפלים',
  onion: 'בצל', corn: 'תירס', chicken: 'עוף',
  pepperoni: 'פפרוני', extra_cheese: 'גבינה כפולה',
}
const SAUCE_LABELS = { margarita: 'מרגריטה', white: 'לבנה' }

function formatPizzas(pizzas) {
  return pizzas.map((p, i) => {
    const toppings = Object.entries(p.toppings)
      .filter(([, v]) => v)
      .map(([k]) => TOPPING_LABELS[k])
      .join(', ') || 'ללא תוספות'
    const sauce = Object.entries(p.sauces).find(([, v]) => v)
    const sauceLabel = sauce ? SAUCE_LABELS[sauce[0]] : 'ללא רוטב'
    const name = p.name ? ` (עבור: ${p.name})` : ''
    return `פיצה ${i + 1}${name}\n  סוג: ${sauceLabel}\n  תוספות: ${toppings}`
  }).join('\n\n')
}

const PICKUP_TIMES = [
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00',
]

const PIZZA_PRICE = 60

function createEmptyPizza(id) {
  return {
    id,
    name: '',
    toppings: { mushrooms: false, olives: false, peppers: false, onion: false, corn: false, chicken: false, pepperoni: false, extra_cheese: false },
    sauces: { margarita: true, white: false },
  }
}

export default function OrderSection() {
  const [pizzas, setPizzas] = useState([createEmptyPizza(1)])
  const [nextId, setNextId] = useState(2)
  const [pickupTime, setPickupTime] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const total = pizzas.length * PIZZA_PRICE

  function addPizza() {
    setPizzas(prev => [...prev, createEmptyPizza(nextId)])
    setNextId(n => n + 1)
  }

  function removePizza(id) {
    setPizzas(prev => prev.filter(p => p.id !== id))
  }

  function updatePizza(id, updated) {
    setPizzas(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/send-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          pickup_time: pickupTime,
          order_details: formatPizzas(pizzas),
          total_price: `₪${total}`,
        }),
      })
      if (!res.ok) throw new Error()
      setSubmitted(true)
    } catch {
      setError('שגיאה בשליחת ההזמנה, נסה שוב')
    } finally {
      setSending(false)
    }
  }

  if (submitted) {
    return (
      <section className="order-section">
        <div className="success-box">
          <div className="success-icon">✓</div>
          <h2>ההזמנה נשלחה!</h2>
          <p>תודה {customerName}, נתראה בשעה {pickupTime} 🍕</p>
          <button
            className="btn-submit"
            onClick={() => {
              setSubmitted(false)
              setPizzas([createEmptyPizza(1)])
              setNextId(2)
              setPickupTime('')
              setCustomerName('')
              setCustomerPhone('')
            }}
          >
            הזמנה חדשה
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="order-section">
      <div className="section-label">
        <span className="label-line" />
        <span className="label-text">הזמנה</span>
        <span className="label-line" />
      </div>
      <h2 className="section-title">בנו את הפיצה שלכם</h2>

      <form onSubmit={handleSubmit} className="order-form">
        <div className="burgers-list">
          {pizzas.map((pizza, index) => (
            <PizzaCard
              key={pizza.id}
              burger={pizza}
              index={index}
              canRemove={pizzas.length > 1}
              onChange={updated => updatePizza(pizza.id, updated)}
              onRemove={() => removePizza(pizza.id)}
            />
          ))}
        </div>

        <button type="button" className="btn-add-burger" onClick={addPizza}>
          <span>+</span> הוסף פיצה
        </button>

        <div className="section-label" style={{ marginTop: 32 }}>
          <span className="label-line" />
          <span className="label-text">פרטי הזמנה</span>
          <span className="label-line" />
        </div>

        <div className="order-card">
          <label className="card-label">שעת איסוף</label>
          <select
            className="select-input"
            value={pickupTime}
            onChange={e => setPickupTime(e.target.value)}
            required
          >
            <option value="" disabled>בחר שעה</option>
            {PICKUP_TIMES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="order-card">
          <label className="card-label">פרטי מזמין</label>
          <input
            className="text-input"
            type="text"
            placeholder="שם"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            required
          />
          <input
            className="text-input"
            type="tel"
            placeholder="טלפון נייד"
            value={customerPhone}
            onChange={e => setCustomerPhone(e.target.value)}
            required
          />
        </div>

        <div className="order-total-row">
          <span className="total-label">סה"כ לתשלום</span>
          <span className="total-amount">
            <span className="shekel-sign">₪</span>
            <span className="total-number">{total}</span>
          </span>
        </div>

        {error && <p className="error-msg">{error}</p>}

        <button type="submit" className="btn-submit" disabled={sending}>
          {sending ? 'שולח...' : 'שלח הזמנה'}
          {!sending && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          )}
        </button>
      </form>
    </section>
  )
}
