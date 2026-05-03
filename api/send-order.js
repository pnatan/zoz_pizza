import Mailjet from 'node-mailjet'
import { getRedis } from './_redis.js'
import { generateSlots, getSlotsConfig } from './_slots.js'

const MAX_PIZZAS_PER_HOUR = 3

function computeRemaining(slots, counts, capacities) {
  const remaining = {}
  const rolloverProvided = {}
  let rollover = 0
  for (const slot of slots) {
    const max = capacities[slot] ?? MAX_PIZZAS_PER_HOUR
    const count = counts[slot] || 0
    remaining[slot] = Math.max(0, max + rollover - count)
    rollover = Math.max(0, max - count)
    rolloverProvided[slot] = rollover
  }
  for (let i = 0; i < slots.length - 1; i++) {
    const slot = slots[i]
    const next = slots[i + 1]
    const max = capacities[slot] ?? MAX_PIZZAS_PER_HOUR
    const provided = rolloverProvided[slot]
    if (provided > 0) {
      const consumed = Math.min(provided, Math.max(0, (counts[next] || 0) - max))
      if (consumed > 0) {
        remaining[slot] = Math.max(0, max - (counts[slot] || 0) - consumed)
      }
    }
  }
  for (let i = 0; i < slots.length - 1; i++) {
    const slot = slots[i]
    const next = slots[i + 1]
    const max = capacities[slot] ?? MAX_PIZZAS_PER_HOUR
    const nextMax = capacities[next] ?? MAX_PIZZAS_PER_HOUR
    const jointCap = max + nextMax - (counts[slot] || 0) - (counts[next] || 0)
    const prevRemaining = i > 0 ? remaining[slots[i - 1]] : 0
    const prevCoversSlot = prevRemaining > 0 && (counts[slot] || 0) + prevRemaining <= max + nextMax
    if (!prevCoversSlot) {
      remaining[slot] = Math.min(remaining[slot], Math.max(0, jointCap))
    }
  }
  return remaining
}

const TOPPING_LABELS = {
  onion: 'בצל', corn: 'תירס', mushrooms: 'פטריות', olives: 'זיתים', hot_pepper: 'פלפל חריף',
  pepperoni: 'פפרוני', corned_beef: 'קורנביף', tuna: 'טונה', anchovy: 'אנשובי',
}
const SAUCE_LABELS = { margarita: 'מרגריטה', meat: 'אוהבי בשר', pesto: 'פסטו', white: 'לבנה' }

function portionVisual(portion, sections) {
  const sel = n => sections.includes(n)
  const on = '#d44010', off = '#faf7f4', dv = '2px solid #555'

  let rows
  if (portion === 'half') {
    // sec1=right, sec2=left  →  LTR: left=sec2, right=sec1
    rows = `<tr>
      <td style="width:50%;background:${sel(2) ? on : off};border-right:${dv}"></td>
      <td style="width:50%;background:${sel(1) ? on : off}"></td>
    </tr>`
  } else if (portion === 'third') {
    // sec1=upper-right, sec2=bottom, sec3=upper-left
    // approximate as: top row (sec3 | sec1), bottom row full-width (sec2)
    rows = `<tr style="height:60%">
      <td style="background:${sel(3) ? on : off};border-right:${dv};border-bottom:${dv}"></td>
      <td style="background:${sel(1) ? on : off};border-bottom:${dv}"></td>
    </tr>
    <tr style="height:40%">
      <td colspan="2" style="background:${sel(2) ? on : off}"></td>
    </tr>`
  } else {
    // sec1=upper-right, sec2=lower-right, sec3=lower-left, sec4=upper-left
    rows = `<tr>
      <td style="width:50%;background:${sel(4) ? on : off};border-right:${dv};border-bottom:${dv}"></td>
      <td style="width:50%;background:${sel(1) ? on : off};border-bottom:${dv}"></td>
    </tr>
    <tr>
      <td style="background:${sel(3) ? on : off};border-right:${dv}"></td>
      <td style="background:${sel(2) ? on : off}"></td>
    </tr>`
  }

  return `<span style="display:inline-block;width:26px;height:26px;border-radius:50%;border:2px solid #555;overflow:hidden;vertical-align:middle;margin-right:4px"><table style="width:100%;height:100%;border-collapse:collapse;table-layout:fixed;direction:ltr">${rows}</table></span>`
}

function buildOrderHtml(pizzas) {
  return pizzas.map((p, i) => {
    const sauce = Object.entries(p.sauces).find(([, v]) => v)
    const sauceLabel = sauce ? SAUCE_LABELS[sauce[0]] : 'ללא סוג'
    const toppingLines = Object.entries(p.toppings)
      .filter(([, v]) => v)
      .map(([k, v]) => {
        const label = TOPPING_LABELS[k]
        if (v === 'full') {
          const fullCircle = `<span style="display:inline-block;width:26px;height:26px;border-radius:50%;background:#d44010;border:2px solid #555;vertical-align:middle;margin-right:4px"></span>`
          return `<span style="display:inline-flex;align-items:center">${label} ${fullCircle}</span>`
        }
        const img = portionVisual(v.portion, v.sections)
        return `<span style="display:inline-flex;align-items:center">${label} ${img}</span>`
      })
    const toppingsHtml = toppingLines.length
      ? toppingLines.join('<span style="color:#78716c"> &nbsp;·&nbsp; </span>')
      : sauce?.[0] === 'margarita' ? '<span style="color:#78716c">ללא תוספות</span>' : ''
    const removalsHtml = p.removals && p.removals.length
      ? `<div style="margin-top:4px;font-size:12px;color:#78716c">ללא: ${p.removals.join(', ')}</div>`
      : ''
    return `<div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #e7e2dc">
      <div style="font-weight:bold;margin-bottom:6px">פיצה ${i + 1} — ${sauceLabel}</div>
      <div style="font-size:13px">${toppingsHtml}</div>
      ${removalsHtml}
    </div>`
  }).join('')
}


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const redis = getRedis()
    const slotsConfig = await getSlotsConfig(redis)
    const SLOTS = generateSlots(slotsConfig.start, slotsConfig.end, slotsConfig.interval)

    const { customer_name, customer_phone, pickup_time, order_details, total_price, pizza_count, payment_method, pizzas } = req.body

    // Bucket pickup time down to the nearest slot interval
    const [h, m] = pickup_time.split(':')
    const slot = `${h}:${String(Math.floor(parseInt(m) / slotsConfig.interval) * slotsConfig.interval).padStart(2, '0')}`
    const key = `orders:${slot}`

    // Seconds remaining until 3AM Israel time (1AM UTC)
    const now = new Date()
    const next3am = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(),
      now.getUTCDate() + (now.getUTCHours() >= 1 ? 1 : 0),
      1, 0, 0
    ))
    const ttl = Math.floor((next3am - now) / 1000)

    const [allCounts, capacityResults] = await Promise.all([
      Promise.all(SLOTS.map(s => redis.get(`orders:${s}`).then(v => parseInt(v) || 0))),
      Promise.all(SLOTS.map(s => redis.get(`slot:capacity:${s}`))),
    ])
    const allSlotCounts = Object.fromEntries(SLOTS.map((s, i) => [s, allCounts[i]]))
    const slotCapacities = Object.fromEntries(
      SLOTS.map((s, i) => [s, capacityResults[i] ? parseInt(capacityResults[i]) : null]).filter(([, v]) => v !== null)
    )
    const remaining = computeRemaining(SLOTS, allSlotCounts, slotCapacities)[slot]
    const incoming = parseInt(pizza_count) || 1

    if (incoming > remaining) {
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
      `אמצעי תשלום: ${payment_method}`,
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
    <tr><td style="padding:6px 0;color:#78716c">אמצעי תשלום</td><td style="padding:6px 0">${payment_method}</td></tr>
  </table>
  <div style="background:#f8f5f1;border-radius:8px;padding:16px;margin:16px 0">
    <p style="margin:0 0 12px;font-weight:bold;color:#78716c;font-size:13px">פרטי ההזמנה</p>
    ${buildOrderHtml(pizzas || [])}
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
          To: [{ Email: process.env.MAILJET_TO_EMAIL }, { Email: process.env.MAILJET_TO_EMAIL_2 }],
          Subject: `🍕 הזמנה חדשה — ${pizza_count} פיצות — ${pickup_time} — ${customer_name}`,
          TextPart: text,
          HTMLPart: html,
        },
      ],
    })

    // Increment count only after successful email send
    await redis.incrby(key, incoming)
    await redis.expire(key, ttl)

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('send-order error:', err)
    return res.status(500).json({ error: 'שגיאה בשליחת ההזמנה, נסה שוב' })
  }
}
