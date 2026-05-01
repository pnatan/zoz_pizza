import { Redis } from '@upstash/redis'

const SLOTS = Array.from({ length: 19 }, (_, i) => {
  const totalMinutes = 18 * 60 + i * 10
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const m = String(totalMinutes % 60).padStart(2, '0')
  return `${h}:${m}`
}).filter(t => t <= '21:00')

const MAX_PIZZAS = 3
const TOPPING_KEYS = ['onion', 'corn', 'mushrooms', 'olives', 'hot_pepper', 'pepperoni', 'corned_beef', 'tuna', 'anchovy']

function computeRemaining(counts, capacities) {
  const remaining = {}
  const rolloverProvided = {}
  let rollover = 0
  for (const slot of SLOTS) {
    const max = capacities[slot] ?? MAX_PIZZAS
    const cap = max + rollover
    const count = counts[slot] || 0
    const left = Math.max(0, cap - count)
    remaining[slot] = left
    rollover = count >= max ? 0 : Math.min(left, max)
    rolloverProvided[slot] = rollover
  }
  for (let i = 0; i < SLOTS.length - 1; i++) {
    const slot = SLOTS[i]
    const next = SLOTS[i + 1]
    const max = capacities[slot] ?? MAX_PIZZAS
    const provided = rolloverProvided[slot]
    if (provided > 0) {
      const consumed = Math.min(provided, Math.max(0, (counts[next] || 0) - max))
      remaining[slot] -= consumed
    }
  }
  return remaining
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('CDN-Cache-Control', 'no-store')
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store')

  const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  })

  const [counts, capacityResults, disabledResults] = await Promise.all([
    Promise.all(SLOTS.map(slot => redis.get(`orders:${slot}`).then(v => parseInt(v) || 0))),
    Promise.all(SLOTS.map(s => redis.get(`slot:capacity:${s}`))),
    Promise.all(TOPPING_KEYS.map(k => redis.get(`topping:disabled:${k}`))),
  ])

  const slotCounts = Object.fromEntries(SLOTS.map((slot, i) => [slot, counts[i]]))
  const slotCapacities = Object.fromEntries(
    SLOTS.map((s, i) => [s, capacityResults[i] ? parseInt(capacityResults[i]) : null]).filter(([, v]) => v !== null)
  )
  const toppingsDisabled = TOPPING_KEYS.filter((_, i) => disabledResults[i] != null)
  const slotRemaining = computeRemaining(slotCounts, slotCapacities)

  return res.status(200).json({ slotCounts, slotRemaining, toppingsDisabled })
}
