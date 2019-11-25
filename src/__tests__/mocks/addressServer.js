const { user1, user2, user3, notUser } = require('../test-data/users')

const response = (user) => {
  return { data: {"status":"success","data":{"rootStoreAddress": user.rootStore,"did": user.did}}}
}

// build address -> rootStore mapping
const db = [user1, user2, user3 ].reduce((acc, user) => {
  acc[user.address] = user.rootStore
  return acc
}, {})

// Mocks axios, to mock responses from the address server
module.exports = {
  get: (url) => {
    if (url.includes(user1.address)) return response(user1)
    if (url.includes(user2.address)) return response(user2)
    if (url.includes(user3.address)) return response(user3)
    // return {"status":"error","message":"address not linked"}
    throw new Error({"status":"error","message":"address not linked"})
  },
  post: (url, payload) => {
    const res = {}
    payload.identities.forEach(val => {
      if (db[val]) res[val] = db[val]
    })
    return { data: {"status":"success", "data":{"rootStoreAddresses": res }}}
  }
}
