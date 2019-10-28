const { ThreadAccessController } = require('3box-orbitdb-plugins')

// TODO document, logIndex is the feed of the underlying AC db list
class ThreadAccessReadController extends ThreadAccessController{
  constructor (orbitdb, ipfs, identity, firstModerator, logIndex, dbAddress, options = {}) {
    super(orbitdb, ipfs, identity, firstModerator, options)
    this._db = { address: dbAddress }
    this._logIndex = logIndex
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

  async close () { }

  async load (address) {}

  static async create (orbitdb, options = {}) {
    const ac = new ThreadAccessReadController(orbitdb, orbitdb._ipfs, options.identity, options.firstModerator, options.logIndex, options.dbAddress, options)
    ac._updateCapabilites()
    return ac
  }
}

module.exports = ThreadAccessReadController
