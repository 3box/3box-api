const express = require('express')
const axios = require('axios')
const Util = require('./util')
const { InvalidInputError, ProfileNotFound } = require('./errors')
const OrbitDBAddress = require('orbit-db/src/orbit-db-address')
const CID = require('cids')
const orbitDBCache = require('orbit-db-cache-redis')
const path = require('path')
const AccessControllers = require('orbit-db-access-controllers')
const {
  LegacyIPFS3BoxAccessController,
  ThreadAccessController,
  ModeratorAccessController
} = require('3box-orbitdb-plugins')
AccessControllers.addAccessController({ AccessController: LegacyIPFS3BoxAccessController })
AccessControllers.addAccessController({ AccessController: ThreadAccessController })
AccessControllers.addAccessController({ AccessController: ModeratorAccessController })
const ipfsMock = require('./ipfs')
const io = require('orbit-db-io')
const Log = require('ipfs-log')
const IdentityProvider = require('orbit-db-identity-provider')
// Store index
const kvStoreIndex = require('orbit-db-kvstore/src/KeyValueIndex.js')
const feedStoreIndex = require('orbit-db-feedstore/src/FeedIndex.js')


const dbTypeIndex = {
  keyvalue: kvStoreIndex,
  feed: feedStoreIndex
}


const namesTothreadName = (spaceName, threadName) => `3box.thread.${spaceName}.${threadName}`

class CacheService {
  constructor (ipld, orbitCache, addressServer) {
    this.ipld = ipld
    // this.cache = cache
    this.orbitCache = orbitCache
    this.addressServer = addressServer
    this.ipfs = ipfsMock(this.ipld)
    // this.analytics = analytics
    this.app = express()
    this.app.use(express.json())
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*')
      next()
    })
    this.app.get('/profile', this.getProfile.bind(this))
    // this.app.post('/profileList', this.getProfiles.bind(this))
    this.app.get('/space', this.getSpace.bind(this))
    this.app.get('/list-spaces', this.listSpaces.bind(this))
    // this.app.get('/config', this.getConfig.bind(this))
    this.app.get('/thread', this.getThread.bind(this))
  }

  start () {
    const server = this.app.listen(8081, () => {
      console.log('Cache service running on port 8081')
    })
    server.keepAliveTimeout = 60 * 1000
  }

  async getDB (address) {
    const dbAddress = OrbitDBAddress.parse(address)
    const cache = await this.orbitCache.load(null, dbAddress)
    const manifestHash = await cache.get(path.join(dbAddress.toString(), '_manifest'))
    if (!manifestHash) return null
    const manifest = await io.read(this.ipfs, manifestHash)
    const dbType = manifest.type
    const acAddress = manifest.accessController
    // If not thread then below, else resolve without opts
    // Thread more difficult, AC requires orbit, need to load AC store same way as here, then pass mocked obj
    const acOpts = address.includes('thread') ? {} :  {skipManifest: true, type: 'legacy-ipfs-3box', write:[]}
    const accessController = await AccessControllers.resolve({'_ipfs': this.ipfs}, acAddress, acOpts)
    const identity = await IdentityProvider.createIdentity({ id: 'peerid' })
    const localHeads = await cache.get('_localHeads')
    const remoteHeads = await cache.get('_remoteHeads')
    const amount = -1
    // TODO build log from multiple heads and joins
    const log = await Log.fromEntryHash(this.ipfs, identity, remoteHeads[0].hash, { logId: address, access: accessController, sortFn: undefined, length: amount})

    // get type build index
    if (!dbTypeIndex[dbType]) throw new Error('Type not supported')
    const index = new dbTypeIndex[dbType]()
    index.updateIndex(log)

    return dbType === 'feed'
        ? Object.keys(index._index).map(e => index._index[e].payload.value)
        : index._index
  }

  async getProfile (req, res, next) {
    const { address, did, metadata } = req.query
    // let profileExisted
    const rootStoreAddress = await this.queryToRootStoreAddress({ address, did })
    const rootDB = await this.getDB(rootStoreAddress)
    const publicDBEntry = rootDB.find(e => e.odbAddress ? e.odbAddress.includes('public') : false)
    if (!publicDBEntry) throw new Error('Profile db not found')
    const publicDBAddress = publicDBEntry.odbAddress
    const publicDB = await this.getDB(publicDBAddress)
    res.json(this._mungeProfile(publicDB))
  }

  async listSpaces (req, res, next) {
    const { address, did } = req.query
    const rootStoreAddress = await this.queryToRootStoreAddress({ address, did })
    const rootDB = await this.getDB(rootStoreAddress)
    const spaces = rootDB.reduce((list, entry) => {
      if (!entry.odbAddress) return list
      const name = entry.odbAddress.split('.')[2]
      if (name) list.push(name)
      return list
    }, [])
    res.json(spaces)
  }

  _mungeSpace (space, metadata) {
    return this._mungeProfile(space, metadata)
  }

  async getSpace (req, res, next) {
    const { address, did, metadata } = req.query
    const spaceName = req.query.name
    // let spaceExisted
   const rootStoreAddress = await this.queryToRootStoreAddress({ address, did })
   // await this.pinning.getSpace(rootStoreAddress, spaceName)

   const rootDB = await this.getDB(rootStoreAddress)
   const spaceEntry = rootDB.find(entry => {
     if (!entry.odbAddress) return false
     return entry.odbAddress.split('.')[2] === spaceName
   })
   if (!spaceEntry) throw new Error('Space does not exist')
   const spaceAddress = spaceEntry.odbAddress
   const spaceDB = await this.getDB(spaceAddress)

   const parsedSpace = Object.keys(spaceDB).reduce((obj, key) => {
     if (key.startsWith('pub_')) {
       const x = spaceDB[key]
       const timestamp = Math.floor(x.timeStamp / 1000)
       obj[key.slice(4)] = { value: x.value, timestamp }
     }
     return obj
   }, {})
   res.json(this._mungeSpace(parsedSpace, metadata))
  }

  // TODO
  async getThread (req, res, next) {
    // let { address, space, name, mod, members } = req.query
    // address = '/orbitdb/zdpuArmcgrEguqBanZRZmnso14oEbFEEBFAr4MSfBZjLtATmR/3box.thread.myspace.mythread'
    // const thread = await this.getDB(address)
    // console.log(thread)
    // res.json(thread)
    // const usingConfig = (space && name && mod && members)
  }

  async ethereumToRootStoreAddress (address) {
    const normalized = address.toLowerCase()
    const url = `${this.addressServer}/odbAddress/${normalized}`
    // console.log(url)
    try {
      const r = await axios.get(url)
      return r.data.data.rootStoreAddress
    } catch (e) {
      throw ProfileNotFound('Address link not found, address does not have a 3Box or is malformed')
    }
  }

  async ethereumToRootStoreAddresses (addresses) {
    if (!addresses || addresses.length === 0) {
      return {}
    }

    const normalized = addresses.map(x => x.toLowerCase())
    const url = `${this.addressServer}/odbAddresses/`
    // console.log(url)

    try {
      const r = await axios.post(url, { identities: normalized })
      return r.data.data.rootStoreAddresses
    } catch (e) {
      throw ProfileNotFound('Addresses links not found, addressList is likely malformed')
    }
  }

  async didToRootStoreAddress (did) {
    return Util.didToRootStoreAddress(did, this.pinning)
  }

  async didToRootStoreAddresses (dids) {
    if (!dids || dids.length === 0) {
      return {}
    }

    // Load the dids
    const promises = dids.map((did) => this.didToRootStoreAddress(did))
    const xs = await Promise.all(promises)

    // Turn the results into a map did -> rootStoreAddress
    const r = {}
    dids.forEach((did, i) => {
      r[did] = xs[i]
    })
    return r
  }

  async queryToRootStoreAddress ({ address, did }) {
    // Check input
    if (!address && !did) {
      throw InvalidInputError('Either pass an `address` or `did` parameter')
    } else if (address && did) {
      throw InvalidInputError('Both `address` and `did` parameters where passed')
    }

    // Figure out the address
    if (address) {
      return this.ethereumToRootStoreAddress(decodeURIComponent(address))
    } else {
      return this.didToRootStoreAddress(decodeURIComponent(did))
    }
  }

  /**
   * Process back the profile into a form that depends whether the user queried
   * for metadata or not.
   *
   * Returns either the profile
   * - WITH metadata: `{name: {timestamp: 123123123123, value: "Dvorak"}, ...}`
   * - WITHOUT metadata: `{name: "Dvorak", ...}`
   */
  _mungeProfile (profile, metadata) {
    if (metadata) {
      // For now we return everything,
      // later we might filter the metadata (metadata="value,timestamp" for example)
      return profile
    } else {
      // process back the profile into a for without metadata
      const r = {}
      Object.entries(profile)
        .forEach(([k, v]) => {
          r[k] = v.value
        })
      return r
    }
  }
}

/**
 * On error, return a response with the corresponding http status code, defaults to a 500.
 */
function errorToResponse (response, error, defaultMesssage) {
  if (error.statusCode) {
    return response.status(error.statusCode).send({ status: 'error', message: error.message })
  } else {
    return response.status(500).send(defaultMesssage)
  }
}

module.exports = CacheService
