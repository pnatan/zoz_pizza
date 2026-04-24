import Mailjet from 'node-mailjet'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { customer_name, customer_phone, pickup_time, order_details, total_price } = req.body

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
      },
    ],
  })

  return res.status(200).json({ ok: true })
}
