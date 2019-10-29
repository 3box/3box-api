const io = require('orbit-db-io')
const Log = require('ipfs-log')
const IdentityProvider = require('orbit-db-identity-provider')
// Store index
const kvStoreIndex = require('orbit-db-kvstore/src/KeyValueIndex.js')
const feedStoreIndex = require('orbit-db-feedstore/src/FeedIndex.js')
const path = require('path')
const createDBManifest = require('orbit-db/src/db-manifest')

const dbTypeIndex = {
  keyvalue: kvStoreIndex,
  feed: feedStoreIndex
}

const AccessControllers = require('orbit-db-access-controllers')
const ThreadAccessController = require('./threadAccessRead.js')
const {
  LegacyIPFS3BoxAccessController,
  ModeratorAccessController
} = require('3box-orbitdb-plugins')
AccessControllers.addAccessController({ AccessController: LegacyIPFS3BoxAccessController })
AccessControllers.addAccessController({ AccessController: ThreadAccessController })
AccessControllers.addAccessController({ AccessController: ModeratorAccessController })

const amount = -1
const nullIdentity = {}

class OrbitDBRead {
  constructor (orbitCache, ipfs) {
    this._orbitCache = orbitCache
    this._ipfs = ipfs
  }

  async readDB (address, threadMetaData = false) {
   const cache = await this._orbitCache.load(address)
   const heads = await cache.getHeads()

   const manifestHash = await cache.getManifest()
   if (!manifestHash) return null
   const manifest = await io.read(this._ipfs, manifestHash)
   const dbType = manifest.type
   const acAddress = manifest.accessController

   // if no heads, quickly return with empty db
   if (heads.length == 0) return dbType === 'feed' ? [] : {}

   let acOpts
   if (address.includes('thread') && !address.includes('_access') ) {
     acOpts = { acAddress, readDB: this.readDB.bind(this)}
   } else {
     acOpts =  {skipManifest: true, type: 'legacy-ipfs-3box', write:[]}
   }

   const accessController = await AccessControllers.resolve({'_ipfs': this._ipfs}, acAddress, acOpts)

   // TODO build log from multiple heads and joins or TODO from none
   const log = await Log.fromEntryHash(this._ipfs, nullIdentity, heads[0].hash, { logId: address, access: accessController, sortFn: undefined, length: amount})

   // Get overlay db type to build db index
   if (!dbTypeIndex[dbType]) throw new Error('Type not supported')
   const index = new dbTypeIndex[dbType]()
   index.updateIndex(log)

   // Map db index to typical return all form
   if (dbType === 'feed') {
     const entry = k => index._index[k]
     const mapFunc = threadMetaData ? k => entry(k) : k => entry(k).payload.value
     return Object.keys(index._index).map(mapFunc)
   }

   return index._index
 }

 async getThreadAddress (name, moderator, members) {
   const modAC = moderatorAC(moderator, members)
   const dbModName = `${name}/_access`
   const acDBAddress = await this.dbAddress (modAC, dbModName, 'feed')

   const ac = threadAC (name, moderator, members, acDBAddress)
   return this.dbAddress(ac, name, 'feed')
 }

 async dbAddress (accessController, dbName, dbType) {
   const accessControllerAddress = await AccessControllers.create({'_ipfs': this._ipfs}, accessController.type, accessController)
   const manifestHash = await createDBManifest(this._ipfs, dbName, dbType, accessControllerAddress, {})
   return path.join('/orbitdb', manifestHash, dbName)
 }

}

function moderatorAC (moderator, members) {
  return {
      type: 'moderator-access',
      firstModerator: moderator,
      members
    }
}

function threadAC (name, moderator, members, acDBAddress) {
  return {
     type: 'thread-access',
     threadName: name,
     members,
     firstModerator: moderator,
     manifestOnly: true,
     dbAddress: acDBAddress
   }
}

module.exports = OrbitDBRead
