const express = require('express')
const axios = require('axios')
const Util = require('./util')
const { InvalidInputError, ProfileNotFound } = require('./errors')
const orbitDBCache = require('orbit-db-cache-redis')
const { readDB, getThreadAddress } = require('./orbitdb.js')
const namesTothreadName = (spaceName, threadName) => `3box.thread.${spaceName}.${threadName}`

class APIService {
  constructor (ipfs, orbitCache, addressServer) {
    // this.cache = cache
    this.orbitCache = orbitCache
    this.addressServer = addressServer
    this.ipfs = ipfs
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
      console.log('API service running on port 8081')
    })
    server.keepAliveTimeout = 60 * 1000
  }

  async getProfile (req, res, next) {
    const { address, did, metadata } = req.query
    // let profileExisted
    const rootStoreAddress = await this.queryToRootStoreAddress({ address, did })
    console.log(rootStoreAddress)
    const rootDB = await readDB(this.orbitCache, this.ipfs, rootStoreAddress)
    const publicDBEntry = rootDB.find(e => e.odbAddress ? e.odbAddress.includes('public') : false)
    if (!publicDBEntry) throw new Error('Profile db not found')
    const publicDBAddress = publicDBEntry.odbAddress
    const publicDB = await readDB(this.orbitCache, this.ipfs, publicDBAddress)
    res.json(this._mungeProfile(publicDB))
  }

  async listSpaces (req, res, next) {
    const { address, did } = req.query
    const rootStoreAddress = await this.queryToRootStoreAddress({ address, did })
    const rootDB = await readDB(this.orbitCache, this.ipfs, rootStoreAddress)
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

   const rootDB = await readDB(this.orbitCache, this.ipfs, rootStoreAddress)
   const spaceEntry = rootDB.find(entry => {
     if (!entry.odbAddress) return false
     return entry.odbAddress.split('.')[2] === spaceName
   })
   if (!spaceEntry) throw new Error('Space does not exist')
   const spaceAddress = spaceEntry.odbAddress
   const spaceDB = await readDB(this.orbitCache, this.ipfs, spaceAddress)

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

  // TODO error handilng/missing params
  async getThread (req, res, next) {
    let { address, space, name, mod, members } = req.query
    members = members === 'true'
    const usingConfig = !!(space && name && mod)
    if (usingConfig) {
      const fullName = namesTothreadName(space, name)
      address = await getThreadAddress(this.ipfs, fullName, mod, members)
      console.log(address)
    }

    const entries = await readDB(this.orbitCache, this.ipfs, address, true)
    const thread = entries.map(entry => Object.assign({ postId: entry.hash, author: entry.identity.id }, entry.payload.value))
    res.json(thread)
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

module.exports = APIService
