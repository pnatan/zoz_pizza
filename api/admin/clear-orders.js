import { getRedis } from '../_redis.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { password } = req.body
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

  const redis = getRedis()
  const [slotKeys, readyKeys] = await Promise.all([
    redis.keys('orders:??:??'),
    redis.keys('order:ready:*'),
  ])
  const keysToDelete = ['orders:today', ...slotKeys, ...readyKeys]
  await redis.del(...keysToDelete)
  return res.status(200).json({ ok: true, clearedSlots: slotKeys.map(k => k.replace('orders:', '')) })
}
