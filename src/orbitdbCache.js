const OrbitDBAddress = require('orbit-db/src/orbit-db-address')
const orbitDBCache = require('orbit-db-cache-redis')
const path = require('path')

const manifestKey = dbAddress => path.join(dbAddress.toString(), '_manifest')

class OrbitDBRedisCache {
  constructor (redisHost) {
    this.orbitdbCache = orbitDBCache({ host: redisHost })
  }

  async load (dbAddress) {
    const cache = await this.orbitdbCache.load(null, OrbitDBAddress.parse(dbAddress))
    return {
      getManifest: this._getManifest(cache, dbAddress),
      getHeads: this._getHeads(cache)
    }
  }

  _getManifest (cache, dbAddress) {
    return () => cache.get(manifestKey(dbAddress))
  }

  _getHeads (cache) {
    return async () => {
      const localHeads = await cache.get('_localHeads') || []
      const remoteHeads = await cache.get('_remoteHeads') || []
      return localHeads.concat(remoteHeads)
    }
  }
}

module.exports = OrbitDBRedisCache
