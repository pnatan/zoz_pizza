import nodemailer from 'nodemailer'
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
  const on = '#d44010', off = '#fde8df', sep = '1.5px solid #555'

  let rows
  if (portion === 'half') {
    rows = `<tr>
      <td style="width:50%;background:${sel(2) ? on : off};border-right:${sep}"></td>
      <td style="width:50%;background:${sel(1) ? on : off}"></td>
    </tr>`
  } else if (portion === 'third') {
    rows = `<tr style="height:60%">
      <td style="background:${sel(3) ? on : off};border-right:${sep};border-bottom:${sep}"></td>
      <td style="background:${sel(1) ? on : off};border-bottom:${sep}"></td>
    </tr>
    <tr style="height:40%">
      <td colspan="2" style="background:${sel(2) ? on : off}"></td>
    </tr>`
  } else {
    rows = `<tr>
      <td style="width:50%;background:${sel(4) ? on : off};border-right:${sep};border-bottom:${sep}"></td>
      <td style="width:50%;background:${sel(1) ? on : off};border-bottom:${sep}"></td>
    </tr>
    <tr>
      <td style="background:${sel(3) ? on : off};border-right:${sep}"></td>
      <td style="background:${sel(2) ? on : off}"></td>
    </tr>`
  }

  return `<span style="display:inline-block;width:24px;height:24px;border-radius:50%;border:2px solid #d44010;overflow:hidden;vertical-align:middle"><table style="width:100%;height:100%;border-collapse:collapse;table-layout:fixed;direction:ltr">${rows}</table></span>`
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
          const fullCircle = `<span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#d44010;border:2px solid #d44010;vertical-align:middle"></span>`
          return `<span style="display:inline-block;background:#fff0ed;border:1px solid #ffd8c8;border-radius:20px;padding:4px 12px;font-size:12px;color:#1c1917;white-space:nowrap">${label}&nbsp;&nbsp;${fullCircle}</span>`
        }
        const img = portionVisual(v.portion, v.sections)
        return `<span style="display:inline-block;background:#fff0ed;border:1px solid #ffd8c8;border-radius:20px;padding:4px 12px;font-size:12px;color:#1c1917;white-space:nowrap">${label}&nbsp;&nbsp;${img}</span>`
      })
    const toppingsHtml = toppingLines.length
      ? `<div style="direction:rtl;line-height:2.2">${toppingLines.join(' ')}</div>`
      : sauce?.[0] === 'margarita' ? '<span style="font-size:12px;color:#a8a29e">ללא תוספות</span>' : ''
    const removalsHtml = p.removals && p.removals.length
      ? `<div style="margin-top:8px;font-size:12px;color:#1c1917">ללא: ${p.removals.join(', ')}</div>`
      : ''
    const isLast = i === pizzas.length - 1
    return `<div style="padding:14px 16px;background:#faf7f4;border-radius:10px;margin-bottom:${isLast ? '0' : '8px'}">
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px">
        <tr>
          <td style="text-align:right;font-size:13px;font-weight:700;color:#1c1917">פיצה ${i + 1}</td>
          <td style="text-align:left">
            <span style="display:inline-block;font-size:12px;font-weight:600;color:#ffffff;background:#d44010;border-radius:20px;padding:2px 12px">${sauceLabel}</span>
          </td>
        </tr>
      </table>
      ${toppingsHtml}
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

    const { customer_name, customer_phone, customer_email, pickup_time, order_details, total_price, pizza_count, payment_method, pizzas } = req.body

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

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
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
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f0ebe4;font-family:Arial,Helvetica,sans-serif;direction:rtl">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ebe4;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:#d44010;padding:24px 28px;text-align:right">
            <div style="font-size:13px;color:#ffd8c8;font-weight:600;letter-spacing:1px;margin-bottom:4px">הזמנה חדשה</div>
            <div style="font-size:22px;font-weight:700;color:#ffffff">🍕 פיצריה מהלב</div>
          </td>
        </tr>

        <!-- Customer info -->
        <tr>
          <td style="padding:24px 28px 0">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom:16px">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f4;border-radius:10px;overflow:hidden">
                    <tr>
                      <td style="padding:10px 16px;border-bottom:1px solid #ede8e2">
                        <span style="font-size:11px;color:#a8a29e;font-weight:700;letter-spacing:0.5px;display:block;margin-bottom:2px">לקוח</span>
                        <span style="font-size:16px;font-weight:700;color:#1c1917">${customer_name}</span>
                      </td>
                      <td style="padding:10px 16px;border-bottom:1px solid #ede8e2;border-right:1px solid #ede8e2;direction:ltr;text-align:left">
                        <span style="font-size:11px;color:#a8a29e;font-weight:700;letter-spacing:0.5px;display:block;margin-bottom:2px;text-align:right;direction:rtl">טלפון</span>
                        <span style="font-size:15px;color:#1c1917;direction:ltr;display:block">${customer_phone}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:10px 16px">
                        <span style="font-size:11px;color:#a8a29e;font-weight:700;letter-spacing:0.5px;display:block;margin-bottom:2px">שעת איסוף</span>
                        <span style="font-size:16px;font-weight:700;color:#d44010;direction:ltr;display:inline-block">${pickup_time}</span>
                      </td>
                      <td style="padding:10px 16px;border-right:1px solid #ede8e2">
                        <span style="font-size:11px;color:#a8a29e;font-weight:700;letter-spacing:0.5px;display:block;margin-bottom:2px">תשלום</span>
                        <span style="font-size:15px;color:#1c1917">${payment_method}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Order details -->
        <tr>
          <td style="padding:4px 28px 0">
            <div style="font-size:11px;font-weight:700;color:#a8a29e;letter-spacing:1px;margin-bottom:10px">פרטי ההזמנה</div>
            ${buildOrderHtml(pizzas || [])}
          </td>
        </tr>

        <!-- Total -->
        <tr>
          <td style="padding:20px 28px 28px">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#d44010;border-radius:10px">
              <tr>
                <td style="padding:14px 20px">
                  <span style="font-size:12px;color:#ffd8c8;display:block;margin-bottom:2px">סה"כ לתשלום</span>
                  <span style="font-size:22px;font-weight:700;color:#ffffff">${total_price}</span>
                </td>
                <td style="padding:14px 20px;text-align:left">
                  <span style="font-size:28px">🍕</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

    await transporter.sendMail({
      from: `"פיצריה מהלב" <${process.env.SMTP_USER}>`,
      to: [process.env.SMTP_TO_EMAIL, process.env.SMTP_TO_EMAIL_2].filter(Boolean).join(', '),
      subject: `🍕 הזמנה חדשה — ${pizza_count} פיצות — ${pickup_time} — ${customer_name}`,
      text,
      html,
    })

    if (customer_email) {
      const confirmHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f0ebe4;font-family:Arial,Helvetica,sans-serif;direction:rtl">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ebe4;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">

        <tr>
          <td style="background:#d44010;padding:24px 28px;text-align:right">
            <div style="font-size:13px;color:#ffd8c8;font-weight:600;letter-spacing:1px;margin-bottom:4px">אישור הזמנה</div>
            <div style="font-size:22px;font-weight:700;color:#ffffff">🍕 פיצריה מהלב</div>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 28px 8px;font-size:15px;color:#1c1917">
            שלום ${customer_name},<br><br>
            ההזמנה שלך התקבלה בהצלחה! נתראה בשעה <strong style="color:#d44010">${pickup_time}</strong> 🍕
          </td>
        </tr>

        <tr>
          <td style="padding:12px 28px 0">
            <div style="font-size:11px;font-weight:700;color:#a8a29e;letter-spacing:1px;margin-bottom:10px">פרטי ההזמנה</div>
            ${buildOrderHtml(pizzas || [])}
          </td>
        </tr>

        <tr>
          <td style="padding:20px 28px 28px">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#d44010;border-radius:10px">
              <tr>
                <td style="padding:14px 20px">
                  <span style="font-size:12px;color:#ffd8c8;display:block;margin-bottom:2px">סה"כ לתשלום</span>
                  <span style="font-size:22px;font-weight:700;color:#ffffff">${total_price}</span>
                </td>
                <td style="padding:14px 20px;text-align:left">
                  <span style="font-size:28px">🍕</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

      await transporter.sendMail({
        from: `"פיצריה מהלב" <${process.env.SMTP_USER}>`,
        to: customer_email,
        subject: `🍕 אישור הזמנה — פיצריה מהלב — ${pickup_time}`,
        text: `שלום ${customer_name},\n\nההזמנה שלך התקבלה בהצלחה!\n\nשעת איסוף: ${pickup_time}\n\n${order_details}\n\nסה"כ לתשלום: ${total_price}\n\nנתראה! — פיצריה מהלב`,
        html: confirmHtml,
      })
    }

    // Increment count only after successful email send
    await redis.incrby(key, incoming)
    await redis.expire(key, ttl)

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('send-order error:', err)
    return res.status(500).json({ error: 'שגיאה בשליחת ההזמנה, נסה שוב' })
  }
}
