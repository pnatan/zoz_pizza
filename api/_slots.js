export function generateSlots(start = '18:00', end = '21:00', interval = 15) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em
  const slots = []
  for (let t = startMin; t <= endMin; t += interval) {
    slots.push(String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'))
  }
  return slots
}

export async function getSlotsConfig(redis) {
  const [start, end, interval] = await Promise.all([
    redis.get('config:slots:start'),
    redis.get('config:slots:end'),
    redis.get('config:slots:interval'),
  ])
  return {
    start: start || '18:00',
    end: end || '21:00',
    interval: interval ? parseInt(interval) : 15,
  }
}
