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

const TYPES = [
  { key: 'margarita', label: 'מרגריטה' },
  { key: 'white', label: 'לבנה' },
]

export default function PizzaCard({ burger, index, canRemove, onChange, onRemove }) {
  function handleToppingChange(key) {
    onChange({ toppings: { ...burger.toppings, [key]: !burger.toppings[key] } })
  }

  function handleTypeChange(key) {
    const newSauces = Object.fromEntries(TYPES.map(t => [t.key, t.key === key]))
    onChange({ sauces: newSauces })
  }

  return (
    <div className="pizza-card">
      <div className="pizza-card-header">
        <div className="pizza-card-title-row">
          <div>
            <span className="pizza-card-title">פיצה {index + 1}</span>
            <span className="pizza-card-price">₪ 60</span>
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
        <span className="group-label">סוג</span>
        <div className="checkboxes-grid">
          {TYPES.map(({ key, label }) => (
            <label key={key} className="checkbox-label">
              <input
                type="radio"
                name={`type-${burger.id || index}`}
                checked={burger.sauces[key]}
                onChange={() => handleTypeChange(key)}
              />
              <span className="custom-checkbox">
                {burger.sauces[key] && (
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

      <div className="pizza-group">
        <span className="group-label">תוספות</span>
        <div className="checkboxes-grid">
          {TOPPINGS.map(({ key, label }) => (
            <label key={key} className="checkbox-label">
              <input
                type="checkbox"
                checked={burger.toppings[key]}
                onChange={() => handleToppingChange(key)}
              />
              <span className="custom-checkbox">
                {burger.toppings[key] && (
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
    </div>
  )
}
