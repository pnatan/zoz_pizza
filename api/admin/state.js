import { Redis } from '@upstash/redis'

const SLOTS = Array.from({ length: 19 }, (_, i) => {
  const totalMinutes = 18 * 60 + i * 10
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const m = String(totalMinutes % 60).padStart(2, '0')
  return `${h}:${m}`
}).filter(t => t <= '21:00')

const TOPPING_KEYS = ['onion', 'corn', 'mushrooms', 'olives', 'hot_pepper', 'pepperoni', 'corned_beef', 'tuna', 'anchovy']

export default async function handler(req, res) {
  if (req.query.password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  })

  const [disabledResults, capacityResults, countResults] = await Promise.all([
    Promise.all(TOPPING_KEYS.map(k => redis.get(`topping:disabled:${k}`))),
    Promise.all(SLOTS.map(s => redis.get(`slot:capacity:${s}`))),
    Promise.all(SLOTS.map(s => redis.get(`orders:${s}`).then(v => parseInt(v) || 0))),
  ])

  const toppingsDisabled = TOPPING_KEYS.filter((_, i) => disabledResults[i] != null)
  const slotCapacities = Object.fromEntries(
    SLOTS.map((s, i) => [s, capacityResults[i] ? parseInt(capacityResults[i]) : null]).filter(([, v]) => v !== null)
  )
  const slotCounts = Object.fromEntries(SLOTS.map((s, i) => [s, countResults[i]]))

  return res.status(200).json({ toppingsDisabled, slotCapacities, slotCounts })
}
