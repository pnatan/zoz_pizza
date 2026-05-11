import { getRedis } from '../_redis.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { password, timestamp, ready } = req.body
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

  const redis = getRedis()
  const key = `order:ready:${timestamp}`
  if (ready) {
    await redis.set(key, '1', 'EX', 86400)
  } else {
    await redis.del(key)
  }
  return res.status(200).json({ ok: true })
}
