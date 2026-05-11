import { getRedis } from '../_redis.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { password, index, updatedOrder } = req.body
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

  const redis = getRedis()

  const raw = await redis.lindex('orders:today', index)
  if (!raw) return res.status(404).json({ error: 'Order not found' })

  let slot = null
  let newCount = 0
  try {
    const original = JSON.parse(raw)
    const originalCount = original.pizzas?.length ?? parseInt(original.pizza_count) ?? 1
    const removedCount = originalCount - (updatedOrder.pizzas?.length || 0)

    if (removedCount > 0) {
      const slotTime = original.slot || original.pickup_time
      const slotKey = `orders:${slotTime}`
      const current = parseInt(await redis.get(slotKey)) || 0
      newCount = Math.max(0, current - removedCount)
      if (newCount === 0) {
        await redis.del(slotKey)
      } else {
        await redis.set(slotKey, newCount, 'KEEPTTL')
      }
      slot = slotTime
    }
  } catch (err) {
    console.error('update-order slot error:', err)
  }

  await redis.lset('orders:today', index, JSON.stringify(updatedOrder))

  return res.status(200).json({ ok: true, slot, newCount })
}
