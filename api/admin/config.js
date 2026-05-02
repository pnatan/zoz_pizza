import { getRedis } from '../_redis.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { password, slotsStart, slotsEnd } = req.body
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

  const redis = getRedis()
  const ops = []
  if (slotsStart !== undefined) ops.push(redis.set('config:slots:start', slotsStart))
  if (slotsEnd !== undefined) ops.push(redis.set('config:slots:end', slotsEnd))
  await Promise.all(ops)

  return res.status(200).json({ ok: true })
}
