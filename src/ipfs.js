const multicodec = require('multicodec')

const ipfs = (ipld) => ({
  dag: {
    get: async (cid) => {
      const obj = await ipld.get(cid)
      return { value: obj }
    },
    // only hash, not write, TODO, could improve format handling
    put: async (node, options) => {
      const cid = await ipld.put(node, multicodec.DAG_CBOR, {
        hashAlg: multicodec.SHA2_256,
        cidVersion: 1,
        onlyHash: true
      })
      return cid
    }
  }
})

module.exports = ipfs
