import { getRedis } from '../_redis.js'

export default async function handler(req, res) {
  if (req.query.password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const redis = getRedis()
    const raw = await redis.lrange('orders:today', 0, -1)
    const orders = raw
      .map(s => { try { return JSON.parse(s) } catch { return null } })
      .filter(Boolean)
      .sort((a, b) => a.pickup_time.localeCompare(b.pickup_time))

    const readyResults = await Promise.all(
      orders.map(o => redis.get(`order:ready:${o.timestamp}`))
    )
    orders.forEach((o, i) => { o.ready = !!readyResults[i] })

    return res.status(200).json({ orders })
  } catch (err) {
    console.error('admin/orders error:', err)
    return res.status(500).json({ error: err.message, orders: [] })
  }
}
