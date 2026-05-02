import Redis from 'ioredis'

let client = null

export function getRedis() {
  if (!client) {
    client = new Redis(process.env.REDIS_CLOUD_URL, { lazyConnect: false, enableOfflineQueue: true })
    client.on('error', () => {})
  }
  return client
}
