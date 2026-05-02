import { getRedis } from '../_redis.js'

function secondsUntil3AM() {
  const now = new Date()
  const next3am = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(),
    now.getUTCDate() + (now.getUTCHours() >= 1 ? 1 : 0),
    1, 0, 0 // 1AM UTC = 3AM Israel Standard Time
  ))
  return Math.floor((next3am - now) / 1000)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { password, key, disabled } = req.body
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

  const redis = getRedis()

  if (disabled) {
    await redis.set(`topping:disabled:${key}`, '1', 'EX', secondsUntil3AM())
  } else {
    await redis.del(`topping:disabled:${key}`)
  }

  return res.status(200).json({ ok: true })
}
