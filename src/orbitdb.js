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


 async function readDB (orbitCache, ipfs, address, threadMetaData = false) {
  const cache = await orbitCache.load(address)
  const manifestHash = await cache.getManifest()
  if (!manifestHash) return null
  const manifest = await io.read(ipfs, manifestHash)
  const dbType = manifest.type
  const acAddress = manifest.accessController
  let acOpts

  // TODO in refactor, this getDB code is pulled out, just do this in the thread AC implementation for this
  if (address.includes('thread') && !address.includes('_access') ) {
    const acManifest = await io.read(ipfs, acAddress.split('/')[2])
    const acDBAddress = acManifest.params.address
    const logIndex = await readDB(orbitCache, ipfs, acDBAddress)
    acOpts = {logIndex}
  } else {
    acOpts =  {skipManifest: true, type: 'legacy-ipfs-3box', write:[]}
  }

  const accessController = await AccessControllers.resolve({'_ipfs': ipfs}, acAddress, acOpts)
  const identity = await IdentityProvider.createIdentity({ id: 'peerid' })
  const heads = await cache.getHeads()
  const amount = -1

  // If not heads, then empy db
  if (heads.length == 0) {
    return dbType === 'feed' ? [] : {}
  }
  // TODO build log from multiple heads and joins or TODO from none
  const log = await Log.fromEntryHash(ipfs, identity, heads[0].hash, { logId: address, access: accessController, sortFn: undefined, length: amount})

  // get type build index
  if (!dbTypeIndex[dbType]) throw new Error('Type not supported')
  const index = new dbTypeIndex[dbType]()
  index.updateIndex(log)

  if (dbType === 'feed') {
    const i = e => index._index[e]
    const mapFunc = threadMetaData ? e => i(e) : e => i(e).payload.value
    return Object.keys(index._index).map(mapFunc)
  }
  return index._index
}

async function getThreadAddress (ipfs, name, firstModerator, members) {
  const dbModAc =  {
    type: 'moderator-access',
    firstModerator,
    members
  }
  const dbModName = name + '/_access'
  const dbModAcAddress = await AccessControllers.create({'_ipfs': ipfs}, dbModAc.type, dbModAc)
  const dbModAcManifestHash = await createDBManifest(ipfs, dbModName, 'feed', dbModAcAddress, {})
  const dbModAddress =  path.join('/orbitdb', dbModAcManifestHash, dbModName)

  const accessController = {
     type: 'thread-access',
     threadName: name,
     members,
     firstModerator,
     logIndex: [],
     dbAddress: dbModAddress
   }
   const accessControllerAddress = await AccessControllers.create({'_ipfs': ipfs}, accessController.type, accessController, {logIndex: []})
   const manifestHash = await createDBManifest(ipfs, name, 'feed', accessControllerAddress, {})
   return path.join('/orbitdb', manifestHash, name)
}

module.exports = { readDB, getThreadAddress }
