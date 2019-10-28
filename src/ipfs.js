const ipfs = (ipld) => ({
  dag: {
    get: async (cid) => {
      const obj = await ipld.get(cid)
      return { value: obj }
    }
  }
})

module.exports = ipfs
