const url = 'https://daring-longhorn-72272.upstash.io';
const token = 'gQAAAAAAARpQAAIgcDEwZmFjZmMwZTE4ZGU0YzVmOWI2YTU1NzUxZWMxZTYwYg';
const slots = Array.from({ length: 19 }, (_, i) => {
  const t = 18 * 60 + i * 10;
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
}).filter(t => t <= '21:00');

const results = await Promise.all(
  slots.map(s =>
    fetch(`${url}/get/orders:${s}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => ({ slot: s, count: d.result || 0 }))
  )
);

const used = results.filter(x => x.count > 0);
if (used.length === 0) {
  console.log('No slots have orders.');
} else {
  used.forEach(x => console.log(`${x.slot} → ${x.count} pizzas`));
}
