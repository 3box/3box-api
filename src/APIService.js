const express = require('express')
const axios = require('axios')
const Util = require('./util')
const { InvalidInputError, ProfileNotFound } = require('./errors')
const orbitDBCache = require('orbit-db-cache-redis')
const OrbitDBRead = require('./orbitdb.js')
const namesTothreadName = (spaceName, threadName) => `3box.thread.${spaceName}.${threadName}`
const io = require('orbit-db-io')
const expressLogger = require('./middleware/expressLogger')
const CID = require('cids')

const rootEntryTypes = {
  SPACE: 'space',
  ADDRESS_LINK: 'address-link'
}

class APIService {
  constructor (ipfs, orbitCache, apiCache, analytics, addressServer) {
    this.cache = apiCache
    this.orbitCache = orbitCache
    this.analytics = analytics
    this.addressServer = addressServer
    this.ipfs = ipfs

    this.app = express()
    this.app.use(express.json())

    this.app.use((req, res, next) => {
      if (req.path == '/healthcheck') {
        return next()
      }
      return expressLogger(req, res, next)
    })

    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*')
      next()
    })

    this.app.get('/healthcheck', this.healthCheck.bind(this))
    this.app.get('/profile', this.getProfile.bind(this))
    this.app.post('/profileList', this.getProfiles.bind(this))
    this.app.get('/space', this.getSpace.bind(this))
    this.app.get('/list-spaces', this.listSpaces.bind(this))
    this.app.get('/config', this.getConfig.bind(this))
    this.app.get('/thread', this.getThread.bind(this))
    this.app.get('/did-doc', this.getDidDoc.bind(this))

    // After response
    this.app.use((req, res, next) => {
      this.analytics.dispatch(res, req)
    })

    this.orbitdb = new OrbitDBRead(orbitCache, ipfs)
  }

  start () {
    const server = this.app.listen(8081, () => {
      console.log('API service running on port 8081')
    })
    server.keepAliveTimeout = 60 * 1000
  }

  async _readDB (address, threadMetaData) {
    if (!this.cache) return this.orbitdb.readDB(address, threadMetaData)
    const cacheHit = await this.cache.read(address.split('/orbitdb/')[1])
    if (cacheHit) return cacheHit
    const db = await this.orbitdb.readDB(address, threadMetaData)
    this.cache.write(address.split('/orbitdb/')[1], db)
    return db
  }

  async _rootToPublicDB (rootStoreAddress) {
    const rootDB = await this._readDB(rootStoreAddress)
    const publicDBEntry = rootDB.find(e => e.odbAddress ? e.odbAddress.includes('public') : false)
    return publicDBEntry.odbAddress
  }

  async healthCheck (req, res, next) {
    res.json({})
  }

  async getProfile (req, res, next) {
    const { address, did, metadata } = req.query
    let profile
    try {
      const rootStoreAddress = await this.queryToRootStoreAddress({ address, did })
      const publicDBAddress = await this._rootToPublicDB(rootStoreAddress)
      profile = await this._readDB(publicDBAddress)
      res.json(this._mungeProfile(profile, metadata))
    } catch (e) {
      errorToResponse(res, e, 'Error: Failed to load profile')
    }

    const profile_existed = Boolean(profile && Object.entries(profile).length !== 0)
    res.analytics = { address: address || 'did', profile_existed }
    next()
  }

  async listSpaces (req, res, next) {
    const { address, did } = req.query
    try {
      const rootStoreAddress = await this.queryToRootStoreAddress({ address, did })
      const rootDB = await this._readDB(rootStoreAddress)
      const spaces = rootDB.reduce((list, entry) => {
        if (!entry.odbAddress) return list
        const name = entry.odbAddress.split('.')[2]
        if (name) list.push(name)
        return list
      }, [])
      res.json(spaces)
    } catch (e) {
      errorToResponse(res, e, 'Error: Failed to load spaces')
    }

    res.analytics = { address: address || 'did' }
    next()
  }

  _mungeSpace (space, metadata) {
    return this._mungeProfile(space, metadata)
  }

  async getSpace (req, res, next) {
    const { address, did, metadata } = req.query
    const spaceName = req.query.name
    let space
    try {
       const rootStoreAddress = await this.queryToRootStoreAddress({ address, did })
       const rootDB = await this._readDB(rootStoreAddress)
       const spaceEntry = rootDB.find(entry => {
         if (!entry.odbAddress) return false
         return entry.odbAddress.split('.')[2] === spaceName
       })
       if (!spaceEntry) {
         res.json({})
         // errorToResponse(res, {statusCode: 404, message: 'Error: Space not found'})
       } else {
         const spaceAddress = spaceEntry.odbAddress
         space = await this._readDB(spaceAddress)

         const parsedSpace = Object.keys(space).reduce((obj, key) => {
           if (key.startsWith('pub_')) {
             const x = space[key]
             const timestamp = Math.floor(x.timeStamp / 1000)
             obj[key.slice(4)] = { value: x.value, timestamp }
           }
           return obj
         }, {})
         res.json(this._mungeSpace(parsedSpace, metadata))
       }
     } catch (e) {
       errorToResponse(res, e, 'Error: Failed to load space')
     }

     const spaceExisted = Boolean(space && Object.entries(space).length !== 0)
     // TODO change existed key?
     res.analytics = { address: address || 'did', name: spaceName, profile_existed: spaceExisted }
     next()
  }

  // TODO error handilng/missing params
  async getThread (req, res, next) {
    let { address, space, name, mod, members } = req.query
    let memberExist = typeof members !== "undefined"
    members = members === 'true'
    const usingConfig = !!(space && name && mod && memberExist)

    if (!usingConfig && !address) {
      errorToResponse(res, { statusCode: 404, message: 'Must pass address parameter, or all of space, name, mod, and members parameters' })
      next()
      return
    }

    try {
      if (usingConfig) {
        const fullName = namesTothreadName(space, name)
        address = await this.orbitdb.getThreadAddress(fullName, mod, members)
      }

      const entries = await this._readDB(address, true)

      //NOTE could return error if not manifest file from readDB instead of empty, to indicate wrong args
      if (!entries) {
        res.json([])
      } else {
        const thread = entries.map(entry => Object.assign({ postId: entry.hash, author: entry.identity.id }, entry.payload.value))
        res.json(thread)
      }
    } catch (e) {
      errorToResponse(res, e, 'Error: Failed to load thread')
    }

    res.analytics = { address }
    next()
  }

  async getConfig (req, res, next) {
    const { address, did } = req.query

    try {
      const rootStoreAddress = await this.queryToRootStoreAddress({ address, did })
      const entries = await this._readDB(rootStoreAddress)
      let conf = {}

      for (let i = 0; i < entries.length; i++) {
        const value = entries[i]
        if (value.type === rootEntryTypes.SPACE) {
          if (!conf.spaces) conf.spaces = {}
          const name = value.odbAddress.split('.')[2]
          conf.spaces[name] = {
            DID: value.DID
          }
        } else if (value.type === rootEntryTypes.ADDRESS_LINK) {
          if (!conf.links) conf.links = []
          const obj = await io.read(this.ipfs, value.data)
          conf.links.push(obj)
        }
      }
      res.json(conf)
    } catch (e) {
      errorToResponse(res, e, 'Error: Failed to load config')
    }

    res.analytics = { address: address || 'did' }
    next()
  }

  async getProfiles (req, res, next) {
    const { body } = req
    const { metadata, addressList, didList } = body
    const origin = req.headers.origin

    if (!addressList && !didList) {
      res.status(400).send('Error: AddressList not given')
      next()
      return
    }

    // map addresses -> root stores
    const addrFromEth = await this.ethereumToRootStoreAddresses(addressList || [])
    const addrFromDID = await this.didToRootStoreAddresses(didList || [])
    const rootStoreAddresses = { ...addrFromEth, ...addrFromDID }

    // Load the data
    const profilePromiseArray = Object.keys(rootStoreAddresses)
      .filter((key) => !!rootStoreAddresses[key])
      .map(async (key) => {
        try {
          const rootStoreAddress = rootStoreAddresses[key]
          const publicDBAddress = await this._rootToPublicDB(rootStoreAddress)
          const profile = await this._readDB(publicDBAddress)
          return { address: key, profile: this._mungeProfile(profile, metadata) }
        } catch (err) {
          console.error('Error: Failed to load profile', { address: key, err })
          return {}
        }
      })

    const profiles = await Promise.all(profilePromiseArray)
    const parsed = profiles.reduce((acc, val) => {
      if (val.address && val.profile) {
        acc[val.address] = val.profile
      }
      return acc
    }, {})

    res.json(parsed)
    next()
  }

  async getDidDoc (req, res, next) {
    let { cid } = req.query
    let doc

    try {
      cid = new CID(cid)
      if (cid.version === 1) {
        doc = await this.ipfs.dag.get(cid)
      } else {
        const obj = await this.ipfs.cat(cid)
        doc = { value: JSON.parse(obj) }
      }
      res.json(doc)
    } catch (e) {
      errorToResponse(res, e, 'Error: Failed to resolve DID document')
    }

    next()
  }

  async ethereumToRootStoreAddress (address) {
    const normalized = address.toLowerCase()
    const url = `${this.addressServer}/odbAddress/${normalized}`
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

    try {
      const r = await axios.post(url, { identities: normalized })
      return r.data.data.rootStoreAddresses
    } catch (e) {
      throw ProfileNotFound('Addresses links not found, addressList is likely malformed')
    }
  }

  // TODO need to resolve these without pinning
  async didToRootStoreAddress (did) {
    // TODO just change these args
    return Util.didToRootStoreAddress(did, {ipfs: this.ipfs, orbitdb: {determineAddress: (name, type, opts) => {
      return this.orbitdb.dbAddress(opts.accessController, name, type, opts.format)
    }}})
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
      const parsedProfile = {}
      Object.entries(profile)
          .forEach(([k, v]) => {
            const timestamp = Math.floor(v.timeStamp / 1000)
            parsedProfile[k] = { value: v.value, timestamp }
          })
      return parsedProfile
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
