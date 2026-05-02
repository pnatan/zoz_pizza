export function generateSlots(start = '18:00', end = '21:00') {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em
  const slots = []
  for (let t = startMin; t <= endMin; t += 15) {
    slots.push(String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'))
  }
  return slots
}

export async function getSlotsConfig(redis) {
  const [start, end] = await Promise.all([
    redis.get('config:slots:start'),
    redis.get('config:slots:end'),
  ])
  return { start: start || '18:00', end: end || '21:00' }
}
