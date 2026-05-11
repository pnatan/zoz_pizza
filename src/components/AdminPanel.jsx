import React, { useState } from 'react'
import './AdminPanel.css'

const TOPPINGS = [
  { key: 'onion', label: 'בצל' },
  { key: 'corn', label: 'תירס' },
  { key: 'mushrooms', label: 'פטריות' },
  { key: 'olives', label: 'זיתים' },
  { key: 'hot_pepper', label: 'פלפל חריף' },
  { key: 'pepperoni', label: 'פפרוני' },
  { key: 'corned_beef', label: 'קורנביף' },
  { key: 'tuna', label: 'טונה' },
  { key: 'anchovy', label: 'אנשובי' },
]

const TOPPING_LABELS = Object.fromEntries(TOPPINGS.map(t => [t.key, t.label]))
const SAUCE_LABELS = { margarita: 'מרגריטה', meat: 'אוהבי בשר', pesto: 'פסטו', white: 'לבנה' }

const SECTOR_PATHS = {
  'half-1':    'M 26 26 L 26 4 A 22 22 0 0 1 26 48 Z',
  'half-2':    'M 26 26 L 26 4 A 22 22 0 0 0 26 48 Z',
  'third-1':   'M 26 26 L 26 4 A 22 22 0 0 1 45.05 37 Z',
  'third-2':   'M 26 26 L 45.05 37 A 22 22 0 0 1 6.95 37 Z',
  'third-3':   'M 26 26 L 6.95 37 A 22 22 0 0 1 26 4 Z',
  'quarter-1': 'M 26 26 L 26 4 A 22 22 0 0 1 48 26 Z',
  'quarter-2': 'M 26 26 L 48 26 A 22 22 0 0 1 26 48 Z',
  'quarter-3': 'M 26 26 L 26 48 A 22 22 0 0 1 4 26 Z',
  'quarter-4': 'M 26 26 L 4 26 A 22 22 0 0 1 26 4 Z',
}

function ToppingDiagram({ val }) {
  if (val === 'full') {
    return (
      <svg width="36" height="36" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r="22" fill="var(--accent)" stroke="var(--accent)" strokeWidth="1.5"/>
        <circle cx="26" cy="26" r="3" fill="#fff"/>
      </svg>
    )
  }
  const { portion, sections } = val
  const keys = portion === 'half'
    ? ['half-1', 'half-2']
    : portion === 'third'
      ? ['third-1', 'third-2', 'third-3']
      : ['quarter-1', 'quarter-2', 'quarter-3', 'quarter-4']
  return (
    <svg width="36" height="36" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r="22" fill="#faf7f4" stroke="var(--border)" strokeWidth="1.5"/>
      {keys.map((k, i) => (
        <path
          key={k}
          d={SECTOR_PATHS[k]}
          fill={sections.includes(i + 1) ? 'var(--accent)' : 'transparent'}
          stroke="var(--border)"
          strokeWidth="1.5"
        />
      ))}
      <circle cx="26" cy="26" r="3" fill="var(--border)"/>
    </svg>
  )
}

function OrderPizzas({ pizzas }) {
  if (!pizzas?.length) return null
  return (
    <div className="admin-order-pizzas">
      {pizzas.map((p, i) => {
        const sauce = Object.entries(p.sauces).find(([, v]) => v)
        const sauceLabel = sauce ? SAUCE_LABELS[sauce[0]] : ''
        const activeToppings = Object.entries(p.toppings).filter(([, v]) => v)
        return (
          <div key={i} className="admin-order-pizza">
            <div className="admin-order-pizza-title">
              פיצה {i + 1} — <span>{sauceLabel}</span>
            </div>
            {activeToppings.length > 0 && (
              <div className="admin-order-toppings">
                {activeToppings.map(([k, v]) => (
                  <div key={k} className="admin-order-topping">
                    <ToppingDiagram val={v} />
                    <span>{TOPPING_LABELS[k]}</span>
                  </div>
                ))}
              </div>
            )}
            {p.removals?.length > 0 && (
              <div className="admin-order-removals">ללא: {p.removals.join(', ')}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const TIME_OPTIONS = Array.from({ length: 56 }, (_, i) => {
  const t = 10 * 60 + i * 15
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0')
})

export default function AdminPanel({ onClose }) {
  const [password, setPassword] = useState(() => localStorage.getItem('admin_password') || '')
  const [loggedIn, setLoggedIn] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(false)
  const [countInputs, setCountInputs] = useState({})
  const [configStart, setConfigStart] = useState('18:00')
  const [configEnd, setConfigEnd] = useState('21:00')
  const [configInterval, setConfigInterval] = useState(15)
  const [configSaving, setConfigSaving] = useState(false)
  const [orders, setOrders] = useState(null)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [readyOrders, setReadyOrders] = useState(new Set())

  async function login(e) {
    e.preventDefault()
    setLoginError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/state?password=${encodeURIComponent(password)}`)
      if (res.status === 401) { setLoginError('סיסמה שגויה'); return }
      const data = await res.json()
      localStorage.setItem('admin_password', password)
      const slots = data.slots || []
      setState(data)
      setCountInputs(Object.fromEntries(slots.map(s => [s, data.slotCounts?.[s] ?? 0])))
      setConfigStart(data.slotsConfig?.start || '18:00')
      setConfigEnd(data.slotsConfig?.end || '21:00')
      setConfigInterval(data.slotsConfig?.interval || 15)
      setLoggedIn(true)
    } catch {
      setLoginError('שגיאת חיבור')
    } finally {
      setLoading(false)
    }
  }

  async function post(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, ...body }),
    })
    if (!res.ok) throw new Error('שגיאה')
  }

  async function toggleTopping(key, currentlyDisabled) {
    await post('/api/admin/topping', { key, disabled: !currentlyDisabled })
    setState(prev => ({
      ...prev,
      toppingsDisabled: currentlyDisabled
        ? prev.toppingsDisabled.filter(k => k !== key)
        : [...prev.toppingsDisabled, key],
    }))
  }

  async function saveCount(slot) {
    const count = parseInt(countInputs[slot]) || 0
    await post('/api/admin/clear-slot', { slot, count })
    setState(prev => ({ ...prev, slotCounts: { ...prev.slotCounts, [slot]: count } }))
  }

  async function clearSlot(slot) {
    await post('/api/admin/clear-slot', { slot, count: 0 })
    setState(prev => ({ ...prev, slotCounts: { ...prev.slotCounts, [slot]: 0 } }))
    setCountInputs(prev => ({ ...prev, [slot]: 0 }))
  }

  async function saveConfig() {
    setConfigSaving(true)
    try {
      await post('/api/admin/config', { slotsStart: configStart, slotsEnd: configEnd, slotsInterval: configInterval })
      const res = await fetch(`/api/admin/state?password=${encodeURIComponent(password)}`)
      const data = await res.json()
      const slots = data.slots || []
      setState(data)
      setCountInputs(Object.fromEntries(slots.map(s => [s, data.slotCounts?.[s] ?? 0])))
    } finally {
      setConfigSaving(false)
    }
  }

  async function loadOrders() {
    setOrdersLoading(true)
    try {
      const res = await fetch(`/api/admin/orders?password=${encodeURIComponent(password)}`)
      const data = await res.json()
      if (data.error && !data.orders) throw new Error(data.error)
      const list = data.orders || []
      setOrders(list)
      setReadyOrders(new Set(list.filter(o => o.ready).map(o => o.timestamp)))
    } catch (err) {
      setOrders([])
      alert(`שגיאה בטעינת הזמנות: ${err.message}`)
    } finally {
      setOrdersLoading(false)
    }
  }

  async function deleteOrder(index) {
    const res = await fetch('/api/admin/delete-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, index }),
    })
    const data = await res.json()
    setOrders(prev => prev.filter((_, i) => i !== index))
    setReadyOrders(prev => {
      const next = new Set(prev)
      next.delete(orders[index]?.timestamp)
      return next
    })
    if (expandedOrder === index) setExpandedOrder(null)
    else if (expandedOrder > index) setExpandedOrder(expandedOrder - 1)
    if (data.slot) {
      setState(prev => ({
        ...prev,
        slotCounts: { ...prev.slotCounts, [data.slot]: data.newCount },
      }))
      setCountInputs(prev => ({ ...prev, [data.slot]: data.newCount }))
    }
  }

  async function toggleReady(order) {
    const isReady = readyOrders.has(order.timestamp)
    await fetch('/api/admin/toggle-ready', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, timestamp: order.timestamp, ready: !isReady }),
    })
    setReadyOrders(prev => {
      const next = new Set(prev)
      isReady ? next.delete(order.timestamp) : next.add(order.timestamp)
      return next
    })
  }

  function logout() {
    localStorage.removeItem('admin_password')
    setLoggedIn(false)
    setPassword('')
    setState(null)
  }

  if (!loggedIn) {
    return (
      <div className="admin-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="admin-panel">
          <button className="admin-close" onClick={onClose}>✕</button>
          <h2 className="admin-title">כניסת מנהל</h2>
          <form onSubmit={login} className="admin-login-form">
            <input
              type="password"
              className="admin-input"
              placeholder="סיסמה"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
            {loginError && <p className="admin-error">{loginError}</p>}
            <button type="submit" className="admin-btn-primary" disabled={loading}>
              {loading ? 'מתחבר...' : 'כניסה'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const slots = state?.slots || []

  return (
    <div className="admin-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="admin-panel admin-panel-wide">
        <div className="admin-header">
          <h2 className="admin-title">ניהול</h2>
          <div className="admin-header-actions">
            <button className="admin-btn-secondary" onClick={logout}>התנתקות</button>
            <button className="admin-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <section className="admin-section">
          <div className="admin-section-title-row">
            <h3 className="admin-section-title">הזמנות היום</h3>
            <button className="admin-btn-small" onClick={loadOrders} disabled={ordersLoading}>
              {ordersLoading ? '...' : orders === null ? 'טען' : 'רענן'}
            </button>
          </div>
          {orders !== null && (
            orders.length === 0
              ? <p className="admin-empty">אין הזמנות עדיין</p>
              : <div className="admin-orders-list">
                  {orders.map((order, i) => (
                    <div key={i} className={`admin-order-row${readyOrders.has(order.timestamp) ? ' admin-order-ready' : ''}`}>
                      <div
                        className="admin-order-summary"
                        onClick={() => setExpandedOrder(expandedOrder === i ? null : i)}
                      >
                        <span className="admin-order-time">{order.pickup_time}</span>
                        <span className="admin-order-name">{order.customer_name}</span>
                        <span className="admin-order-meta">{order.pizza_count} פיצות · {order.total_price}</span>
                        <span className="admin-order-payment">{order.payment_method}</span>
                        <span className="admin-order-chevron">{expandedOrder === i ? '▲' : '▼'}</span>
                        <button
                          className={`admin-order-ready-btn${readyOrders.has(order.timestamp) ? ' active' : ''}`}
                          onClick={e => { e.stopPropagation(); toggleReady(order) }}
                          title="סמן כמוכן"
                        >✓</button>
                        <button
                          className="admin-order-delete"
                          onClick={e => { e.stopPropagation(); if (window.confirm('האם אתה בטוח שברצונך למחוק הזמנה זו?')) deleteOrder(i) }}
                          title="מחק הזמנה"
                        >✕</button>
                      </div>
                      {expandedOrder === i && (
                        <div className="admin-order-details">
                          <div className="admin-order-phone">{order.customer_phone}</div>
                          <OrderPizzas pizzas={order.pizzas} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
          )}
        </section>

        <section className="admin-section">
          <h3 className="admin-section-title">שעות פעילות</h3>
          <div className="admin-config-row">
            <div className="admin-config-field">
              <label className="admin-config-label">משעה</label>
              <select
                className="admin-input admin-select"
                value={configStart}
                onChange={e => setConfigStart(e.target.value)}
              >
                {TIME_OPTIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="admin-config-field">
              <label className="admin-config-label">עד שעה</label>
              <select
                className="admin-input admin-select"
                value={configEnd}
                onChange={e => setConfigEnd(e.target.value)}
              >
                {TIME_OPTIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="admin-config-field">
              <label className="admin-config-label">מרווח</label>
              <select
                className="admin-input admin-select"
                value={configInterval}
                onChange={e => setConfigInterval(parseInt(e.target.value))}
              >
                {[10, 15, 20, 25, 30].map(n => (
                  <option key={n} value={n}>{n} דק'</option>
                ))}
              </select>
            </div>
            <button className="admin-btn-small" onClick={saveConfig} disabled={configSaving}>
              {configSaving ? '...' : 'שמור'}
            </button>
          </div>
        </section>

        <section className="admin-section">
          <h3 className="admin-section-title">זמינות תוספות</h3>
          <div className="admin-toppings-grid">
            {TOPPINGS.map(({ key, label }) => {
              const disabled = state.toppingsDisabled.includes(key)
              return (
                <label key={key} className="admin-toggle-label">
                  <span className={disabled ? 'admin-topping-name disabled' : 'admin-topping-name'}>{label}</span>
                  <button
                    className={`admin-toggle ${disabled ? 'off' : 'on'}`}
                    onClick={() => toggleTopping(key, disabled)}
                  >
                    {disabled ? 'לא זמין' : 'זמין'}
                  </button>
                </label>
              )
            })}
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-slots-table">
            <div className="admin-slots-header">
              <span>שעה</span>
              <span>הזמנות</span>
              <span></span>
            </div>
            {slots.map(slot => (
              <div key={slot} className="admin-slot-row">
                <span className="admin-slot-time">{slot}</span>
                <div className="admin-slot-capacity">
                  <input
                    type="number"
                    className="admin-input admin-input-sm"
                    min="0"
                    max="50"
                    value={countInputs[slot] ?? 0}
                    onChange={e => setCountInputs(prev => ({ ...prev, [slot]: e.target.value }))}
                  />
                  <button className="admin-btn-small" onClick={() => saveCount(slot)}>שמור</button>
                </div>
                <button
                  className="admin-btn-danger"
                  onClick={() => clearSlot(slot)}
                  disabled={!state.slotCounts?.[slot]}
                >
                  אפס
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
