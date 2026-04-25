import Mailjet from 'node-mailjet'
import { Redis } from '@upstash/redis'

const MAX_PIZZAS_PER_HOUR = 3

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  })

  const { customer_name, customer_phone, pickup_time, order_details, total_price, pizza_count } = req.body

  // Bucket by 10-minute slot: round down minutes to nearest 10
  const [h, m] = pickup_time.split(':')
  const slot = `${h}:${String(Math.floor(parseInt(m) / 10) * 10).padStart(2, '0')}`
  const key = `orders:${slot}`

  // Seconds remaining until midnight UTC (restaurant is closed by then)
  const now = new Date()
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  const ttl = Math.floor((midnight - now) / 1000)

  const currentCount = (await redis.get(key)) || 0
  const incoming = parseInt(pizza_count) || 1

  if (currentCount + incoming > MAX_PIZZAS_PER_HOUR) {
    const remaining = MAX_PIZZAS_PER_HOUR - currentCount
    const msg = remaining <= 0
      ? `השעה ${pickup_time} מלאה, אנא בחר שעה אחרת`
      : remaining === 1
        ? `נשארה רק 1 פיצה פנויה בשעה ${pickup_time}`
        : `נשארו רק ${remaining} פיצות פנויות בשעה ${pickup_time}`
    return res.status(429).json({ error: msg })
  }

  const mailjet = new Mailjet({
    apiKey: process.env.MAILJET_API_KEY,
    apiSecret: process.env.MAILJET_SECRET_KEY,
  })

  const text = [
    `הזמנה חדשה מפיצריה מהלב`,
    ``,
    `לקוח: ${customer_name}`,
    `טלפון: ${customer_phone}`,
    `שעת איסוף: ${pickup_time}`,
    ``,
    `פרטי ההזמנה:`,
    order_details,
    ``,
    `סה"כ לתשלום: ${total_price}`,
  ].join('\n')

  const orderDetailsHtml = order_details
    .split('\n')
    .map(line => `<p style="margin:2px 0">${line}</p>`)
    .join('')

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;direction:rtl;text-align:right;color:#1c1917;max-width:500px;margin:0 auto;padding:24px">
  <h2 style="color:#d44010;border-bottom:2px solid #d44010;padding-bottom:8px">🍕 הזמנה חדשה — פיצריה מהלב</h2>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px 0;color:#78716c;width:120px">לקוח</td><td style="padding:6px 0;font-weight:bold">${customer_name}</td></tr>
    <tr><td style="padding:6px 0;color:#78716c">טלפון</td><td style="padding:6px 0">${customer_phone}</td></tr>
    <tr><td style="padding:6px 0;color:#78716c">שעת איסוף</td><td style="padding:6px 0;font-weight:bold">${pickup_time}</td></tr>
  </table>
  <div style="background:#f8f5f1;border-radius:8px;padding:16px;margin:16px 0">
    <p style="margin:0 0 8px;font-weight:bold;color:#78716c;font-size:13px">פרטי ההזמנה</p>
    ${orderDetailsHtml}
  </div>
  <div style="background:#d44010;color:#fff;border-radius:8px;padding:12px 16px;display:inline-block;margin-top:8px">
    <span style="font-size:18px;font-weight:bold">סה"כ לתשלום: ${total_price}</span>
  </div>
</body>
</html>`

  await mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: process.env.MAILJET_FROM_EMAIL,
          Name: 'פיצריה מהלב',
        },
        To: [{ Email: process.env.MAILJET_TO_EMAIL }],
        Subject: `🍕 הזמנה חדשה — ${customer_name} — ${pickup_time}`,
        TextPart: text,
        HTMLPart: html,
      },
    ],
  })

  // Increment count only after successful email send
  await redis.incrby(key, incoming)
  await redis.expire(key, ttl)

  return res.status(200).json({ ok: true })
}
