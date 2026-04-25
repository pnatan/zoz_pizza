import { useState } from 'react'
import './PizzaCard.css'

const TOPPINGS = [
  { key: 'mushrooms', label: 'פטריות' },
  { key: 'olives', label: 'זיתים' },
  { key: 'peppers', label: 'פלפלים' },
  { key: 'onion', label: 'בצל' },
  { key: 'corn', label: 'תירס' },
  { key: 'chicken', label: 'עוף' },
  { key: 'pepperoni', label: 'פפרוני' },
  { key: 'extra_cheese', label: 'גבינה כפולה' },
]

const PIZZA_PRICES = { margarita: 39, meat: 57, pesto: 53, white: 53 }

const TYPES = [
  { key: 'margarita', label: 'מרגריטה' },
  { key: 'meat', label: 'אוהבי בשר' },
  { key: 'pesto', label: 'פסטו' },
  { key: 'white', label: 'לבנה' },
]

const TYPE_INGREDIENTS = {
  margarita: [],
  meat: ['רוטב פיצה', 'קונפי שום', 'פפרוני', 'קורנביף', 'פרמז׳ן', 'עלי רוקט', 'איולי הבית'],
  pesto: ['פסטו הבית', 'קונפי שום', 'שרי צלוי', 'שמנת מתוקה', 'מוצרלה', 'זילוף בלסמי', 'פרמז׳ן', 'עלי רוקט'],
  white: ['תערובת גבינות', 'מוצרלה', 'פטריות', 'שום קונפי', 'זילוף בלסמי', 'עלי רוקט'],
}

const TOPPING_PRICE = 4

const PORTION_LABELS = { full: 'הכל', half: 'חצי', third: 'שליש', quarter: 'רבע' }
// half-1 = right, half-2 = left
// third-1 = upper-right, third-2 = bottom, third-3 = upper-left
const SECTOR_PATHS = {
  'half-1': 'M 26 26 L 26 4 A 22 22 0 0 1 26 48 Z',
  'half-2': 'M 26 26 L 26 4 A 22 22 0 0 0 26 48 Z',
  'third-1': 'M 26 26 L 26 4 A 22 22 0 0 1 45.05 37 Z',
  'third-2': 'M 26 26 L 45.05 37 A 22 22 0 0 1 6.95 37 Z',
  'third-3': 'M 26 26 L 6.95 37 A 22 22 0 0 1 26 4 Z',
  'quarter-1': 'M 26 26 L 26 4 A 22 22 0 0 1 48 26 Z',
  'quarter-2': 'M 26 26 L 48 26 A 22 22 0 0 1 26 48 Z',
  'quarter-3': 'M 26 26 L 26 48 A 22 22 0 0 1 4 26 Z',
  'quarter-4': 'M 26 26 L 4 26 A 22 22 0 0 1 26 4 Z',
}

function PizzaDiagram({ portionType, selectedSections, onToggle }) {
  const keys = portionType === 'half'
    ? ['half-1', 'half-2']
    : portionType === 'third'
      ? ['third-1', 'third-2', 'third-3']
      : ['quarter-1', 'quarter-2', 'quarter-3', 'quarter-4']

  return (
    <svg className="pizza-diagram" width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r="22" fill="#faf7f4" stroke="var(--border)" strokeWidth="1.5"/>
      {keys.map((k, i) => (
        <path
          key={k}
          d={SECTOR_PATHS[k]}
          fill={selectedSections.includes(i + 1) ? 'var(--accent)' : 'transparent'}
          stroke="var(--border)"
          strokeWidth="1.5"
          style={{ cursor: 'pointer' }}
          onClick={() => onToggle(i + 1)}
        />
      ))}
      <circle cx="26" cy="26" r="3" fill="var(--border)" pointerEvents="none"/>
    </svg>
  )
}

export default function PizzaCard({ pizza, index, canRemove, typeError, onChange, onRemove }) {
  const selectedType = Object.entries(pizza.sauces).find(([, v]) => v)
  const toppingCount = Object.values(pizza.toppings).filter(Boolean).length
  const price = selectedType ? PIZZA_PRICES[selectedType[0]] + toppingCount * TOPPING_PRICE : null
  const ingredients = selectedType ? TYPE_INGREDIENTS[selectedType[0]] : []
  const [toppingsOpen, setToppingsOpen] = useState(false)

  function handleToppingChange(key) {
    const current = pizza.toppings[key]
    onChange({ toppings: { ...pizza.toppings, [key]: current ? null : 'full' } })
  }

  function handlePortionChange(key, portion) {
    const val = portion === 'full' ? 'full' : { portion, sections: [] }
    onChange({ toppings: { ...pizza.toppings, [key]: val } })
  }

  function handleSectionToggle(key, section) {
    const current = pizza.toppings[key]
    if (!current || current === 'full') return
    const sections = current.sections
    const total = current.portion === 'half' ? 2 : current.portion === 'third' ? 3 : 4
    const newSections = sections.includes(section)
      ? sections.filter(s => s !== section)
      : [...sections, section].sort()
    if (newSections.length === total) return
    onChange({ toppings: { ...pizza.toppings, [key]: { ...current, sections: newSections } } })
  }

  function handleTypeChange(key) {
    const newSauces = Object.fromEntries(TYPES.map(t => [t.key, t.key === key]))
    onChange({ sauces: newSauces, removals: [] })
  }

  function handleRemovalToggle(ingredient) {
    const removals = pizza.removals || []
    const newRemovals = removals.includes(ingredient)
      ? removals.filter(r => r !== ingredient)
      : [...removals, ingredient]
    onChange({ removals: newRemovals })
  }

  return (
    <div className="pizza-card">
      <div className="pizza-card-header">
        <div className="pizza-card-title-row">
          <div>
            <span className="pizza-card-title">פיצה {index + 1}</span>
            <span className="pizza-card-price">{price !== null ? `₪ ${price}` : ''}</span>
          </div>
          <div className="pizza-card-icon">🍕</div>
        </div>
        {canRemove && (
          <button type="button" className="btn-remove" onClick={onRemove} aria-label="הסר פיצה">
            ✕
          </button>
        )}
      </div>

      <div className="pizza-group">
        <span className="group-label" style={typeError ? { color: 'var(--accent)' } : {}}>סוג{typeError ? ' — יש לבחור סוג' : ''}</span>
        <div className="checkboxes-grid">
          {TYPES.map(({ key, label }) => (
            <label key={key} className="checkbox-label">
              <input
                type="radio"
                name={`type-${pizza.id || index}`}
                checked={pizza.sauces[key]}
                onChange={() => handleTypeChange(key)}
              />
              <span className="custom-checkbox">
                {pizza.sauces[key] && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              <span className="checkbox-text">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {ingredients.length > 0 && (
        <div className="pizza-group">
          <span className="group-label">התאם את המנה</span>
          <div className="checkboxes-grid">
            {ingredients.map(ing => {
              const removed = (pizza.removals || []).includes(ing)
              return (
                <label key={ing} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={!removed}
                    onChange={() => handleRemovalToggle(ing)}
                  />
                  <span className="custom-checkbox">
                    {!removed && (
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  <span className="checkbox-text">{ing}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      <div className="pizza-group">
        <button type="button" className="group-label group-label-toggle" onClick={() => setToppingsOpen(o => !o)}>
          <span>תוספות</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: toppingsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {toppingsOpen && (
          <div className="toppings-list">
            {TOPPINGS.map(({ key, label }) => {
              const val = pizza.toppings[key]
              const portionType = !val ? null : val === 'full' ? 'full' : val.portion
              const selectedSections = val && val !== 'full' ? val.sections : []
              return (
                <div key={key} className="topping-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={!!val}
                      onChange={() => handleToppingChange(key)}
                    />
                    <span className="custom-checkbox">
                      {val && (
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    <span className="checkbox-text">{label} <span className="topping-price">4₪</span></span>
                  </label>
                  {val && (
                    <div className="portion-btns">
                      {['full', 'half', 'third', 'quarter'].map(p => (
                        <button
                          key={p}
                          type="button"
                          className={`portion-btn${portionType === p ? ' active' : ''}`}
                          onClick={() => handlePortionChange(key, p)}
                        >
                          {PORTION_LABELS[p]}
                        </button>
                      ))}
                    </div>
                  )}
                  {val && portionType !== 'full' && (
                    <div className="topping-diagram-row">
                      <PizzaDiagram
                        portionType={portionType}
                        selectedSections={selectedSections}
                        onToggle={section => handleSectionToggle(key, section)}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
