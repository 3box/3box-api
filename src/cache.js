const redis = require('redis')

const DAYS30 = 2592000

/**
  *  RedisCache Representation. Wrapped redis client. Read, write, and invalidate objects.
  */

// TODO normalize write, del, read keys for address
class RedisCache {
  constructor (redisOpts = {}, orbitRedisCacheOpts = {}, ttl) {
    this.redis = redis.createClient(redisOpts)
    this.redis.on('error', function (err) {
      console.log('Error ' + err)
    })
    this.ttl = ttl || DAYS30
    this.orbitRedis = redis.createClient(orbitRedisCacheOpts)
    this.startInvalidationService()
  }

  read (key) {
    return new Promise((resolve, reject) => {
      this.redis.get(key, (err, val) => {
        if (err) console.log(err)
        resolve(err ? null : JSON.parse(val))
      })
    })
  }

  write (key, obj) {
    this.redis.set(key, JSON.stringify(obj), 'EX', this.ttl)
  }

  async invalidate (key) {
    this.redis.del(key)
  }

  startInvalidationService() {
    this.orbitRedis.on('pmessage', this.messageHandler.bind(this))
    this.orbitRedis.psubscribe("__keyevent@*:set")
  }

  messageHandler (pattern, event, message) {
    if (message.includes('localHeads') || message.includes('remoteHeads')) {
      const address = message.split('__')[0]
      this.invalidate(address)
    }
  }
}

/**
  *  NullCache implements an abstract cache interface without caching any
  *  data. Primarly used for testing and development.
  */
// TODO maybe remove null cache now
class NullCache {
  read (key) {
    return Promise.resolve(null)
  }

  write (key, obj) { }

  invalidate (key) { }
}

module.exports = { RedisCache, NullCache }
