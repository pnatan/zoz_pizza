import './Menu.css'

const ITEMS = [
  { num: '1', name: 'מרגריטה', price: 39 },
  { num: '2', name: 'אוהבי בשר', price: 57, ingredients: ['רוטב פיצה', 'קונפי שום', 'פפרוני', 'קורנביף', 'פרמז׳ן', 'עלי רוקט', 'איולי הבית'] },
  { num: '3', name: 'פסטו', price: 53, ingredients: ['פסטו הבית', 'קונפי שום', 'שרי צלוי', 'שמנת מתוקה', 'מוצרלה', 'זילוף בלסמי', 'פרמז׳ן', 'עלי רוקט'] },
  { num: '4', name: 'לבנה', price: 53, ingredients: ['תערובת גבינות', 'מוצרלה', 'פטריות', 'שום קונפי', 'זילוף בלסמי', 'עלי רוקט'] },
]

export default function Menu() {
  return (
    <section className="menu-section">
      <div className="section-label">
        <span className="menu-label-line" />
        <span className="menu-label-text">תפריט</span>
        <span className="menu-label-line" />
      </div>
      <ul className="menu-list">
        {ITEMS.map(item => (
          <li key={item.num} className="menu-item">
            <div className="menu-item-header">
              <span className="menu-num">{item.num}</span>
              <span className="menu-name">{item.name}</span>
              <span className="menu-price">₪{item.price}</span>
            </div>
            {item.ingredients && (
              <ul className="menu-ingredients">
                {item.ingredients.map(ing => (
                  <li key={ing}>{ing}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
