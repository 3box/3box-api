const elliptic = require('elliptic')
const Multihash = require('multihashes')
const sha256 = require('js-sha256').sha256
const { Resolver } = require('did-resolver')
const get3IdResolver = require('3id-resolver').getResolver
const getMuportResolver = require('muport-did-resolver').getResolver
const EC = elliptic.ec
const ec = new EC('secp256k1')
const dagPB = require('ipld-dag-pb')
const ipfsUnixFS = require('ipfs-unixfs')

class Util {
  /**
   * Compute a multi-hash that is used in the did to root store process (fingerprinting)
   */
  static sha256Multihash (str) {
    const digest = Buffer.from(sha256.digest(str))
    return Multihash.encode(digest, 'sha2-256').toString('hex')
  }

  static uncompressSECP256K1Key (key) {
    const ec = new elliptic.ec('secp256k1') // eslint-disable-line new-cap
    return ec.keyFromPublic(key, 'hex').getPublic(false, 'hex')
  }

  static async didExtractSigningKey (did, { doc, resolver } = {}) {
    doc = doc || await resolver.resolve(did)
    const signingKey = doc.publicKey.find(key => key.id.includes('#signingKey')).publicKeyHex
    return signingKey
  }

  static createMuportDocument (signingKey, managementKey, asymEncryptionKey) {
    return {
      version: 1,
      signingKey,
      managementKey,
      asymEncryptionKey
    }
  }

  static async threeIDToMuport (did, { ipfs, doc }) {
    const resolver = new Resolver({
      ...get3IdResolver(ipfs),
      ...getMuportResolver(ipfs)
    })
    doc = doc || await resolver.resolve(did)
    let signingKey = doc.publicKey.find(key => key.id.includes('#signingKey')).publicKeyHex
    signingKey = ec.keyFromPublic(Buffer.from(signingKey, 'hex')).getPublic(true, 'hex')
    const managementKey = doc.publicKey.find(key => key.id.includes('#managementKey')).ethereumAddress
    const encryptionKey = doc.publicKey.find(key => key.id.includes('#encryptionKey')).publicKeyBase64
    const muportdoc = Util.createMuportDocument(signingKey, managementKey, encryptionKey)
    const unixfs = new ipfsUnixFS('file', Buffer.from(JSON.stringify(muportdoc)))
    const node = new dagPB.DAGNode(unixfs.marshal())
    const cid = await ipfs.dag.put(node, { onlyHash:true, format: 'dag-pb', hashAlg: 'sha2-256' }) //not all args needed here, but in ipfs yes
    const docHash = cid.toBaseEncodedString()
    return 'did:muport:' + docHash
  }

  static async didToRootStoreAddress (did, { orbitdb, ipfs }) {
    ipfs = ipfs || orbitdb._ipfs
    const is3ID = did.includes(':3:')
    const resolver = new Resolver({
      ...get3IdResolver(ipfs),
      ...getMuportResolver(ipfs)
    })
    const doc = await resolver.resolve(did)
    let signingKey = await Util.didExtractSigningKey(did, { doc })
    // 3id signingKey already uncompressed in doc
    signingKey = is3ID ? signingKey : Util.uncompressSECP256K1Key(signingKey)
    // muport did require for address derivation
    did = is3ID ? await Util.threeIDToMuport(did, { ipfs, doc }) : did
    const fingerprint = Util.sha256Multihash(did)
    const rootStore = `${fingerprint}.root`

    const opts = {
      format: 'dag-pb',
      accessController: {
        write: [signingKey],
        type: 'legacy-ipfs-3box',
        skipManifest: true
      }
    }
    const addr = await orbitdb.determineAddress(rootStore, 'feed', opts)

    return addr.toString()
  }
}

module.exports = Util
