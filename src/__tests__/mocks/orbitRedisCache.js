const Redis = require('ioredis-mock');
const orbitCacheMockData = require('../test-data/orbit-cache')

const redis = new Redis({
  data: orbitCacheMockData
})

module.exports = {
  createClient: () => redis
}
