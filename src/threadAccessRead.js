const { ThreadAccessController } = require('3box-orbitdb-plugins')
const io = require('orbit-db-io')

const MODERATOR = 'MODERATOR'
const MEMBER = 'MEMBER'

class ThreadAccessReadController extends ThreadAccessController{
  constructor (orbitdb, ipfs, identity, firstModerator, options = {}) {
    super(orbitdb, ipfs, identity, firstModerator, options)
    this._readDB = options.readDB
    this._db = { address: options.dbAddress }
    this._acAddress = options.acAddress
    this._acList = []
  }

  _updateCapabilites () {
    let moderators = [], members = []
    moderators.push(this._firstModerator)
    Object.entries(this._acList).forEach(entry => {
      const capability = entry[1].capability
      const id = entry[1].id
      if (capability === MODERATOR) moderators.push(id)
      if (capability === MEMBER) members.push(id)
    })
    this._capabilities = {moderators, members}
    return this._capabilities
  }

  async _loadACdb () {
    const acManifest = await io.read(this._ipfs, this._acAddress.split('/')[2])
    const acDBAddress = acManifest.params.address
    this._acList = await this._readDB(acDBAddress)
  }

  async close () { }

  async load (address) { }

  static async create (orbitdb, options = {}) {
    const ac = new ThreadAccessReadController(orbitdb, orbitdb._ipfs, options.identity, options.firstModerator, options)
    if (!options.manifestOnly) {
      await ac._loadACdb()
      ac._updateCapabilites()
    }
    return ac
  }
}

module.exports = ThreadAccessReadController
