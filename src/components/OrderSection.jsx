import { useState, useEffect } from 'react'
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

const PICKUP_TIMES = Array.from({ length: 19 }, (_, i) => {
  const totalMinutes = 18 * 60 + i * 10
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const m = String(totalMinutes % 60).padStart(2, '0')
  return `${h}:${m}`
}).filter(t => t <= '21:00')

const PIZZA_PRICE = 60
const MAX_PIZZAS = 3

function createEmptyPizza(id) {
  return {
    id,
    name: '',
    toppings: { mushrooms: false, olives: false, peppers: false, onion: false, corn: false, chicken: false, pepperoni: false, extra_cheese: false },
    sauces: { margarita: false, white: false },
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
  const [phoneError, setPhoneError] = useState(null)
  const [slotCounts, setSlotCounts] = useState({})

  function validatePhone(value) {
    const digits = value.replace(/[-\s]/g, '')
    return /^05[0-9]{8}$/.test(digits)
  }

  function loadAvailability() {
    fetch('/api/get-availability')
      .then(r => r.json())
      .then(data => setSlotCounts(data.slotCounts || {}))
      .catch(() => {})
  }

  useEffect(() => { loadAvailability() }, [])

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
    if (!validatePhone(customerPhone)) {
      setPhoneError('מספר טלפון לא תקין, יש להזין מספר נייד ישראלי')
      return
    }
    const missingType = pizzas.some(p => !Object.values(p.sauces).some(Boolean))
    if (missingType) {
      setError('יש לבחור סוג פיצה לכל הזמנה')
      return
    }
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
          pizza_count: pizzas.length,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '')
      }
      setSubmitted(true)
      loadAvailability()
    } catch (err) {
      setError(err.message || 'שגיאה בשליחת ההזמנה, נסה שוב')
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
        <div className="pizzas-list">
          {pizzas.map((pizza, index) => (
            <PizzaCard
              key={pizza.id}
              pizza={pizza}
              index={index}
              canRemove={pizzas.length > 1}
              typeError={!Object.values(pizza.sauces).some(Boolean) && !!error}
              onChange={updated => updatePizza(pizza.id, updated)}
              onRemove={() => removePizza(pizza.id)}
            />
          ))}
        </div>

        <button type="button" className="btn-add-pizza" onClick={addPizza}>
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
            {PICKUP_TIMES.map(t => {
              const ordered = slotCounts[t] || 0
              const remaining = MAX_PIZZAS - ordered
              const isFull = remaining <= 0
              const label = isFull
                ? `${t} — מלא`
                : remaining === 1
                  ? `${t} — נותרה 1`
                  : `${t} — נותרו ${remaining}`
              return (
                <option key={t} value={t} disabled={isFull}>
                  {label}
                </option>
              )
            })}
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
            className={`text-input${phoneError ? ' input-error' : ''}`}
            type="tel"
            placeholder="טלפון נייד"
            value={customerPhone}
            onChange={e => {
              setCustomerPhone(e.target.value)
              if (phoneError) setPhoneError(null)
            }}
            onBlur={() => {
              if (customerPhone && !validatePhone(customerPhone))
                setPhoneError('מספר טלפון לא תקין, יש להזין מספר נייד ישראלי')
            }}
            required
          />
          {phoneError && <p className="field-error">{phoneError}</p>}
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
