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

const DEFAULT_CAPACITY = 3

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
  const [capacityInputs, setCapacityInputs] = useState({})
  const [countInputs, setCountInputs] = useState({})
  const [configStart, setConfigStart] = useState('18:00')
  const [configEnd, setConfigEnd] = useState('21:00')
  const [configSaving, setConfigSaving] = useState(false)

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
      setCapacityInputs(Object.fromEntries(slots.map(s => [s, data.slotCapacities?.[s] ?? ''])))
      setCountInputs(Object.fromEntries(slots.map(s => [s, data.slotCounts?.[s] ?? 0])))
      setConfigStart(data.slotsConfig?.start || '18:00')
      setConfigEnd(data.slotsConfig?.end || '21:00')
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

  async function saveCapacity(slot) {
    const val = capacityInputs[slot]
    const capacity = val === '' ? null : parseInt(val)
    await post('/api/admin/capacity', { slot, capacity })
    setState(prev => {
      const next = { ...prev.slotCapacities }
      if (capacity == null) delete next[slot]; else next[slot] = capacity
      return { ...prev, slotCapacities: next }
    })
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
      await post('/api/admin/config', { slotsStart: configStart, slotsEnd: configEnd })
      const res = await fetch(`/api/admin/state?password=${encodeURIComponent(password)}`)
      const data = await res.json()
      const slots = data.slots || []
      setState(data)
      setCapacityInputs(Object.fromEntries(slots.map(s => [s, data.slotCapacities?.[s] ?? ''])))
      setCountInputs(Object.fromEntries(slots.map(s => [s, data.slotCounts?.[s] ?? 0])))
    } finally {
      setConfigSaving(false)
    }
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
          <h3 className="admin-section-title">שעות פעילות</h3>
          <div className="admin-config-row">
            <label className="admin-config-label">משעה</label>
            <select
              className="admin-input admin-input-sm"
              value={configStart}
              onChange={e => setConfigStart(e.target.value)}
            >
              {TIME_OPTIONS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <label className="admin-config-label">עד שעה</label>
            <select
              className="admin-input admin-input-sm"
              value={configEnd}
              onChange={e => setConfigEnd(e.target.value)}
            >
              {TIME_OPTIONS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
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
          <h3 className="admin-section-title">ניהול שעות</h3>
          <div className="admin-slots-table">
            <div className="admin-slots-header">
              <span>שעה</span>
              <span>הזמנות</span>
              <span>קיבולת</span>
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
                <div className="admin-slot-capacity">
                  <input
                    type="number"
                    className="admin-input admin-input-sm"
                    min="0"
                    max="20"
                    placeholder={DEFAULT_CAPACITY}
                    value={capacityInputs[slot] ?? ''}
                    onChange={e => setCapacityInputs(prev => ({ ...prev, [slot]: e.target.value }))}
                  />
                  <button className="admin-btn-small" onClick={() => saveCapacity(slot)}>שמור</button>
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
