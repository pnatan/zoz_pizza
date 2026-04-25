import { Redis } from '@upstash/redis'

const SLOTS = Array.from({ length: 19 }, (_, i) => {
  const totalMinutes = 18 * 60 + i * 10
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const m = String(totalMinutes % 60).padStart(2, '0')
  return `${h}:${m}`
}).filter(t => t <= '21:00')

const MAX_PIZZAS = 3

function computeRemaining(counts) {
  const remaining = {}
  let rollover = 0
  for (const slot of SLOTS) {
    const cap = MAX_PIZZAS + rollover
    const count = counts[slot] || 0
    const left = Math.max(0, cap - count)
    remaining[slot] = left
    rollover = Math.min(left, MAX_PIZZAS)
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

  const counts = await Promise.all(
    SLOTS.map(slot => redis.get(`orders:${slot}`).then(v => parseInt(v) || 0))
  )

  const slotCounts = Object.fromEntries(SLOTS.map((slot, i) => [slot, counts[i]]))
  const slotRemaining = computeRemaining(slotCounts)

  return res.status(200).json({ slotCounts, slotRemaining })
}
