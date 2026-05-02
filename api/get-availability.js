import { getRedis } from './_redis.js'
import { generateSlots, getSlotsConfig } from './_slots.js'

const MAX_PIZZAS = 3
const TOPPING_KEYS = ['onion', 'corn', 'mushrooms', 'olives', 'hot_pepper', 'pepperoni', 'corned_beef', 'tuna', 'anchovy']

function computeRemaining(slots, counts, capacities) {
  const remaining = {}
  const rolloverProvided = {}
  let rollover = 0
  for (const slot of slots) {
    const max = capacities[slot] ?? MAX_PIZZAS
    const count = counts[slot] || 0
    remaining[slot] = Math.max(0, max + rollover - count)
    rollover = Math.max(0, max - count)
    rolloverProvided[slot] = rollover
  }
  for (let i = 0; i < slots.length - 1; i++) {
    const slot = slots[i]
    const next = slots[i + 1]
    const max = capacities[slot] ?? MAX_PIZZAS
    const provided = rolloverProvided[slot]
    if (provided > 0) {
      const consumed = Math.min(provided, Math.max(0, (counts[next] || 0) - max))
      if (consumed > 0) {
        remaining[slot] = Math.max(0, max - (counts[slot] || 0) - consumed)
      }
    }
  }
  for (let i = 0; i < slots.length - 1; i++) {
    const slot = slots[i]
    const next = slots[i + 1]
    const max = capacities[slot] ?? MAX_PIZZAS
    const nextMax = capacities[next] ?? MAX_PIZZAS
    const jointCap = max + nextMax - (counts[slot] || 0) - (counts[next] || 0)
    remaining[slot] = Math.min(remaining[slot], Math.max(0, jointCap))
  }
  return remaining
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('CDN-Cache-Control', 'no-store')
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store')

  const redis = getRedis()
  const slotsConfig = await getSlotsConfig(redis)
  const SLOTS = generateSlots(slotsConfig.start, slotsConfig.end, slotsConfig.interval)

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
  const slotRemaining = computeRemaining(SLOTS, slotCounts, slotCapacities)

  return res.status(200).json({ slots: SLOTS, slotCounts, slotRemaining, toppingsDisabled, slotsConfig })
}
