import { getRedis } from '../_redis.js'
import { generateSlots, getSlotsConfig } from '../_slots.js'

const TOPPING_KEYS = ['onion', 'corn', 'mushrooms', 'olives', 'hot_pepper', 'pepperoni', 'corned_beef', 'tuna', 'anchovy']

export default async function handler(req, res) {
  if (req.query.password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const redis = getRedis()
  const slotsConfig = await getSlotsConfig(redis)
  const SLOTS = generateSlots(slotsConfig.start, slotsConfig.end, slotsConfig.interval)

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

  return res.status(200).json({ slots: SLOTS, toppingsDisabled, slotCapacities, slotCounts, slotsConfig })
}
