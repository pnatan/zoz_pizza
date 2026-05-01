import { Redis } from '@upstash/redis'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { password, slot, capacity } = req.body
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

  const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  })

  if (capacity == null) {
    await redis.del(`slot:capacity:${slot}`)
  } else {
    await redis.set(`slot:capacity:${slot}`, String(parseInt(capacity)))
  }

  return res.status(200).json({ ok: true })
}
