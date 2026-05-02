import { getRedis } from '../_redis.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { password, slot, count: rawCount } = req.body
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

  const redis = getRedis()
  const count = parseInt(rawCount) || 0

  if (count === 0) {
    await redis.del(`orders:${slot}`)
  } else {
    await redis.set(`orders:${slot}`, String(count))
  }

  return res.status(200).json({ ok: true })
}
