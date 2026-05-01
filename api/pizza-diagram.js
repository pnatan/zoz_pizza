const SECTOR_PATHS = {
  'half-1': 'M 26 26 L 26 4 A 22 22 0 0 1 26 48 Z',
  'half-2': 'M 26 26 L 26 4 A 22 22 0 0 0 26 48 Z',
  'third-1': 'M 26 26 L 26 4 A 22 22 0 0 1 45.05 37 Z',
  'third-2': 'M 26 26 L 45.05 37 A 22 22 0 0 1 6.95 37 Z',
  'third-3': 'M 26 26 L 6.95 37 A 22 22 0 0 1 26 4 Z',
  'quarter-1': 'M 26 26 L 26 4 A 22 22 0 0 1 48 26 Z',
  'quarter-2': 'M 26 26 L 48 26 A 22 22 0 0 1 26 48 Z',
  'quarter-3': 'M 26 26 L 26 48 A 22 22 0 0 1 4 26 Z',
  'quarter-4': 'M 26 26 L 4 26 A 22 22 0 0 1 26 4 Z',
}

export default function handler(req, res) {
  const { portion, sections: sectionsParam } = req.query
  const sections = sectionsParam ? sectionsParam.split(',').map(Number) : []

  const keys = portion === 'half'
    ? ['half-1', 'half-2']
    : portion === 'third'
      ? ['third-1', 'third-2', 'third-3']
      : ['quarter-1', 'quarter-2', 'quarter-3', 'quarter-4']

  const paths = keys.map((k, i) =>
    `<path d="${SECTOR_PATHS[k]}" fill="${sections.includes(i + 1) ? '#d44010' : '#faf7f4'}" stroke="#e7e2dc" stroke-width="1.5"/>`
  ).join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52"><circle cx="26" cy="26" r="22" fill="#faf7f4" stroke="#e7e2dc" stroke-width="1.5"/>${paths}<circle cx="26" cy="26" r="3" fill="#e7e2dc"/></svg>`

  res.setHeader('Content-Type', 'image/svg+xml')
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.status(200).send(svg)
}
