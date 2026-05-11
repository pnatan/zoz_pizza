import { getRedis } from '../_redis.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { password, index } = req.body
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })
  if (typeof index !== 'number') return res.status(400).json({ error: 'Invalid index' })

  const redis = getRedis()

  const raw = await redis.lindex('orders:today', index)
  let slot = null
  let newCount = 0
  if (raw) {
    try {
      const order = JSON.parse(raw)
      const count = parseInt(order.pizza_count) || 1
      slot = order.slot || `orders:${order.pickup_time}`
      const slotKey = slot.startsWith('orders:') ? slot : `orders:${slot}`
      const current = parseInt(await redis.get(slotKey)) || 0
      newCount = Math.max(0, current - count)
      if (newCount === 0) {
        await redis.del(slotKey)
      } else {
        await redis.set(slotKey, newCount, 'KEEPTTL')
      }
      slot = slotKey.replace('orders:', '')
    } catch {}
  }

  const tombstone = `__deleted__${Date.now()}_${Math.random()}`
  await redis.lset('orders:today', index, tombstone)
  await redis.lrem('orders:today', 1, tombstone)

  if (raw) {
    try {
      const order = JSON.parse(raw)
      if (order.timestamp) await redis.del(`order:ready:${order.timestamp}`)
    } catch {}
  }

  return res.status(200).json({ ok: true, slot, newCount })
}
