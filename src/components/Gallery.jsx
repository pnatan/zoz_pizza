import './Gallery.css'

const IMAGES = [
  {
    src: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300&q=80',
    alt: 'פיצה מרגריטה',
  },
  {
    src: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&q=80',
    alt: 'פיצה ירקות',
  },
  {
    src: 'https://images.unsplash.com/photo-1528137871618-79d2761e3fd5?w=300&q=80',
    alt: 'פיצה קלאסית',
  },
]

export default function Gallery() {
  return (
    <section className="gallery">
      <div className="gallery-track">
        {IMAGES.map((img, i) => (
          <div key={i} className="gallery-item">
            <img src={img.src} alt={img.alt} />
          </div>
        ))}
      </div>
    </section>
  )
}
