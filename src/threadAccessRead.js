const ensureAddress = require('orbit-db-access-controllers/src/utils/ensure-ac-address')
const EventEmitter = require('events').EventEmitter
const entryIPFS = require('ipfs-log/src/entry')
const isIPFS = require('is-ipfs')

const type = 'thread-access'
const MODERATOR = 'MODERATOR'
const MEMBER = 'MEMBER'

const isValid3ID = did => {
  const parts = did.split(':')
  if (!parts[0] === 'did' || !parts[1] === '3') return false
  return isIPFS.cid(parts[2])
}
// TODO should this extend our thread AC, less code? easier to mantain
class ThreadAccessController extends EventEmitter{
  constructor (orbitdb, ipfs, identity, firstModerator, logIndex, dbAddress, options) {
    super()
    this._orbitdb = orbitdb
    this._db = {}
    this._db.address = dbAddress
    this._options = options || {}
    this._ipfs = ipfs
    this._members = Boolean(options.members)
    this._firstModerator = firstModerator
    this._threadName = options.threadName
    this._identity = identity
    this._logIndex = logIndex
  }

  static get type () { return type }

  get address () { }

  async canAppend (entry, identityProvider) {
    const trueIfValidSig = async () => await identityProvider.verifyIdentity(entry.identity)

    const op = entry.payload.op
    const mods = this.capabilities['moderators']
    const members = this.capabilities['members']
    const isMod = mods.includes(entry.identity.id)
    const isMember = members.includes(entry.identity.id)

    if (op === 'ADD') {
      // Anyone can add entry if open thread
      if (!this._members) return await trueIfValidSig()
      // Not open thread, any member or mod can add to thread
      if (isMember || isMod) return await trueIfValidSig()
    }

    if (op === 'DEL') {
      const hash = entry.payload.value
      const delEntry = await entryIPFS.fromMultihash(this._ipfs, hash)

      // An id can delete their own entries
      if (delEntry.identity.id === entry.identity.id) return await trueIfValidSig()

      // Mods can delete any entry
      if (isMod) return await trueIfValidSig()
    }

    return false
  }

  get capabilities () {
    if (!this._capabilities) this._updateCapabilites()
    return this._capabilities
  }

  _updateCapabilites () {
    let moderators = [], members = []
    moderators.push(this._firstModerator)
    Object.entries(this._logIndex).forEach(entry => {
      const capability = entry[1].payload.value.capability
      const id = entry[1].payload.value.id
      if (capability === MODERATOR) moderators.push(id)
      if (capability === MEMBER) members.push(id)
    })
    this._capabilities = {moderators, members}
    return this._capabilities
  }

  get (capability) {
    return this.capabilities[capability] || []
  }

  async close () { }

  async load (address) {}

  async save () {
    return {
      address: this._db.address.toString(),
      firstModerator: this._firstModerator,
      members: this._members
    }
  }

  /* Factory */
  static async create (orbitdb, options = {}) {
    if (!options.firstModerator) throw new Error('Thread AC: firstModerator required')
    const ac = new ThreadAccessController(orbitdb, orbitdb._ipfs, options.identity, options.firstModerator, options.logIndex, options.dbAddress, options)
    // await ac.load(options.address || options.threadName)
    ac._updateCapabilites()
    return ac
  }
}

module.exports = ThreadAccessController
