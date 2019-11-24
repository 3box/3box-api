const request = require('supertest')
const APIService = require('../APIService')
const API = require('../node.js')

jest.setTimeout(30000);

const user1 = {
  address: '0x08abf5d121998b8bb022156ef972e22f9fb84f3a',
  did: 'did%3Amuport%3AQmXfH6B8yosXTfyWBziBSY5zZpqjVbsJN18yk56EpmYDb5',
  spaceoneDid: 'did%3A3%3Abafyreicplngujln6wnmhsmsxx34axxgg5xootcq4zkicz7x7o2kub7pdje'
}

const user2 = {
  address: '0x26618f5c6ea223cfdf94c033ccdc8eccbf990a34',
  did: 'did%3Amuport%3AQmU3rKK7zAAswGWX7863m5iY78NEPZc5sfAENCkefQLvFX',
  spaceoneDid: 'did%3A3%3Abafyreifihp3yf4igdmi2woiqo2wymz2vdt2pwbnwjlvum4aly3277bbaam'
}

const user3 = {
  address: '0x0acc7a1ffe266b2192c8f717141a0cc03672bfba',
  did: 'did%3Amuport%3AQmUAxywv5B3W9U2GSHHncTak2M4uCiEbc9mN2uE8HhhJGM'
}

const notUser = {
  address: '0x1eE6aE029c6D99fF3a810CF8EAA31D193c89ec9c',
  did: 'did%3Amuport%3AQmQAnachTJXMVHKa5Nu3mZNn5jGrJ9TvHJde3NSp8J4qzL'
}

// posts by 3 users, first two entry deleted
const openThreadAddress = '/orbitdb/zdpuB18U3dEMq4G4hgShc9Nd1rJM1ZB1JWhsAG8CkmpFHxA6u/3box.thread.spaceone.open'
// closed to user 1 and user 2, first entry deleted
const closedThreadAddress = '/orbitdb/zdpuAnq4FhPsq8iMzy4HX7LKUV8MbNjb8oRmk9ghjdhGdRtQJ/3box.thread.spaceone.closedu1u2'

// MOCK HTTP TO ADDRESS SERVER
jest.mock('axios', () => {
  return {
    get: jest.fn((url) => {
      if (url.includes('0x08abf5d121998b8bb022156ef972e22f9fb84f3a')) {
        // https://beta.3box.io/address-server/odbAddress/0x08abf5d121998b8bb022156ef972e22f9fb84f3a
        return { data: {"status":"success","data":{"rootStoreAddress":"/orbitdb/QmdocSxFGo84tod5DRW5LUeSYcQpG3WVYjB5znx1A5QFMs/12203666f93fdc578232887a4cc1b5a60171f979ca9b5e7845f4f49834d217f11b98.root","did":"did:muport:QmXfH6B8yosXTfyWBziBSY5zZpqjVbsJN18yk56EpmYDb5"}}}
      }
      if (url.includes('0x26618f5c6ea223cfdf94c033ccdc8eccbf990a34')) {
        // https://beta.3box.io/address-server/odbAddress/0x26618f5c6ea223cfdf94c033ccdc8eccbf990a34
        return { data: {"status":"success","data":{"rootStoreAddress":"/orbitdb/QmY4CemYGA8vM7o5GxzfpfDkreudDjQJX1fGxkfgDm9pM4/1220abf954f044f07562415931a6986d4fb2dbd0f3c4c2a13ec95d463518a967ac2a.root","did":"did:muport:QmU3rKK7zAAswGWX7863m5iY78NEPZc5sfAENCkefQLvFX"}}}
      }
      if (url.includes('0x0acc7a1ffe266b2192c8f717141a0cc03672bfba')) {
      // https://beta.3box.io/address-server/odbAddress/0x0acc7a1ffe266b2192c8f717141a0cc03672bfba
        return { data: {"status":"success","data":{"rootStoreAddress":"/orbitdb/QmeQxxTTVXFTtM9FvtRE4n3shyzevLYzudV6ZMFnzwX7yy/1220a0aad86899dcf21abd133ea7515601c82ebffc1a3eb206504619d0c14a1b2520.root","did":"did:muport:QmUAxywv5B3W9U2GSHHncTak2M4uCiEbc9mN2uE8HhhJGM"}}}
      }
      return {"status":"error","message":"address not linked"}
    }),
    post: (url, payload) => {
      const addresses = payload.identities
      const db = { '0x08abf5d121998b8bb022156ef972e22f9fb84f3a': "/orbitdb/QmdocSxFGo84tod5DRW5LUeSYcQpG3WVYjB5znx1A5QFMs/12203666f93fdc578232887a4cc1b5a60171f979ca9b5e7845f4f49834d217f11b98.root",
                   '0x26618f5c6ea223cfdf94c033ccdc8eccbf990a34': "/orbitdb/QmY4CemYGA8vM7o5GxzfpfDkreudDjQJX1fGxkfgDm9pM4/1220abf954f044f07562415931a6986d4fb2dbd0f3c4c2a13ec95d463518a967ac2a.root",
                   '0x0acc7a1ffe266b2192c8f717141a0cc03672bfba': "/orbitdb/QmeQxxTTVXFTtM9FvtRE4n3shyzevLYzudV6ZMFnzwX7yy/1220a0aad86899dcf21abd133ea7515601c82ebffc1a3eb206504619d0c14a1b2520.root" }
      const res = {}
      addresses.forEach(val => {
        if (db[val]) res[val] = db[val]
      })
      return { data: {"status":"success", "data":{"rootStoreAddresses": res }}}
    }
  }
})

// MOCK ORBIT DB REDIS CACHE
jest.mock('redis', () => {
  const Redis = require('ioredis-mock');
  const orbitCacheMockData = require('./test-data/orbit-cache')
  const redis = new Redis({
    data: orbitCacheMockData
  })
  return {
    createClient: () => redis
  }
})

describe('APIService', async () => {
  let app
  let api

  beforeAll(async () => {
    // TODO move this arg to env
    api = await API('./src/__tests__/test-data/ipfs')
    api.analytics._track = jest.fn()
    app = api.app
  })

  beforeEach(() => {
    api.analytics._track.mockClear()
  })

  describe('GET /profile', () => {

    it('respond json to address with profile', async function(done) {
      request(app)
        .get(`/profile?address=${user1.address}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond json to address with profile (add and change keys)', async function(done) {
      request(app)
        .get(`/profile?address=${user2.address}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond json to DID with profile', async function(done) {
      request(app)
        .get(`/profile?did=${user1.did}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond json to address with profile and metadata option', async function(done) {
      request(app)
        .get(`/profile?address=${user1.address}&metadata=true`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond json to DID with profile and metadata option', async function(done) {
      request(app)
        .get(`/profile?did=${user1.did}&metadata=true`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond 404 to address with no profile', async function(done) {
      request(app)
        .get(`/profile?address=${notUser.address}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    //TODO return 404 instead of invalid did...
    it('respond 404 to did with no profile', async function(done) {
      request(app)
        .get(`/profile?did=${notUser.did}`)
        .set('Accept', 'application/json')
        // .expect('Content-Type', /json/)
        .expect(500)
        .then(response => {
          // expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    //NOTE: Could have more specific error, invalid address instead of 404
    it('respond 404 to did passed as address', async function(done) {
      request(app)
        .get(`/profile?address=${user1.did}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    //NOTE: could return specific error + json, instead of generic 500
    it('respond 500 to address passed as did', async function(done) {
      request(app)
        .get(`/profile?did=${user1.address}`)
        .set('Accept', 'application/json')
        // .expect('Content-Type', /json/)
        .expect(500)
        .then(response => {
          // expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond 400 to missing required args', async function(done) {
      request(app)
        .get('/profile')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(400)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })
  })

  describe('GET /thread', () => {

    it('respond json to thread by address that exists [open thread]', async (done) => {
      request(app)
        .get(`/thread?address=${openThreadAddress}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond json to thread by address that exists [member thread]', async (done) => {
      request(app)
        .get(`/thread?address=${closedThreadAddress}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond json to thread by config that exists [open thread]', async (done) => {
      request(app)
        .get(`/thread?space=spaceone&name=open&mod=${user1.spaceoneDid}&members=false`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond json to thread by config that exists [member thread]', async (done) => {
      request(app)
        .get(`/thread?space=spaceone&name=closedu1u2&mod=${user1.spaceoneDid}&members=true`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    //NOTE could return error (404) if not manifest file from readDB instead of empty, to indicate wrong args
    it('respond 404 to thread by config that does NOT exist', async (done) => {
      request(app)
        .get(`/thread?space=spaceone&name=noexist&mod=${user1.spaceoneDid}&members=false`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    //NOTE could return error (404) if not manifest file from readDB instead of empty, to indicate wrong args
    it('respond 404 to thread by address that does NOT exist', async (done) => {
      request(app)
        .get(('/thread?address=/orbitdb/zdpuAtmJDmsVPeKdJiLt3nFweLN3u7GEc8kQzNqyBKUkcP9qc/3box.thread.api.notexist'))
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    // NOTE return specific error, intead empty 200
    it('respond 500 to thread by config missing args', async (done) => {
      // missing members
      request(app)
        .get(`/thread?space=api&name=thread&mod=${user1.spaceoneDid}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    // NOTE return specific error, instead empty 200
    it('respond 500 to thread address malformed', async (done) => {
      request(app)
        .get(`/thread?address=zdpuAtmJDmsVPeKdJiLt3nFweLN3u7GEc8kQzNqyBKUkcP9qc/3box.thread.api.thread`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })
  })

  describe('GET /space', () => {

    it('respond json to space (by address) that exists', async (done) => {
      request(app)
        .get(`/space?address=${user1.address}&name=spaceone`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond json to space (by address) that exists (add and change keys)', async (done) => {
      request(app)
        .get(`/space?address=${user2.address}&name=spaceone`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond json to space (by address) that exists (but empty)', async (done) => {
      request(app)
        .get(`/space?address=${user3.address}&name=spacetwo`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond 404 to space that does not exists in existing user', async (done) => {
      request(app)
        .get(`/space?address=${user1.address}&name=notaspace`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404)
        .then(response => {
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond 404 to space that does not exists and for user that does not exist', async (done) => {
      request(app)
        .get(`/space?address=${notUser.address}&name=notaspace`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404)
        .then(response => {
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond json to space (by DID) that exists', async (done) => {
      request(app)
        .get(`/space?address=${user1.did}&name=spaceone`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404)
        .then(response => {
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    // NOTE, instead of returning empty space, return specific error
    it('respond 401 to missing args', async (done) => {
      request(app)
        .get(`/space?address=${user1.address}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })
  })

  describe('GET /list-spaces', () => {

    it('respond json to address with profile', async function(done) {
      request(app)
        .get(`/list-spaces?address=${user1.address}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond json to DID with profile', async function(done) {
      request(app)
        .get(`/list-spaces?did=${user1.did}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond 404 to address with no 3box', async function(done) {
      request(app)
        .get(`/list-spaces?address=${notUser.address}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    //TODO return 404 instead of 500
    it('respond 404 to did with no profile', async function(done) {
      request(app)
        .get(`/list-spaces?did=${notUser.did}`)
        .set('Accept', 'application/json')
        // .expect('Content-Type', /json/)
        .expect(500)
        .then(response => {
          // expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })
  })

  describe('GET /config', () => {
    it('respond json to address with 3box', async function(done) {
      request(app)
        .get(`/config?address=${user1.address}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond json to DID with 3box', async function(done) {
      request(app)
        .get(`/config?did=${user1.did}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond 404 to address with no 3box', async function(done) {
      request(app)
        .get(`/config?address=${notUser.address}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    // TODO return 404 instead of 500
    it('respond 404 to did with no 3box', async function(done) {
      request(app)
        .get(`/config?did=${notUser.did}`)
        .set('Accept', 'application/json')
        // .expect('Content-Type', /json/)
        .expect(500)
        .then(response => {
          // expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })
  })

  describe('POST /profileList', () => {
    // TODO don't base response on address server response, or align those responses for testing

    it('respond JSON to addressList with profile [size 1]', async (done) => {
      request(app)
        .post('/profileList')
        .send({addressList: [user1.address]})
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond JSON to didList with profile [size 1] ', async (done) => {
      request(app)
        .post('/profileList')
        .send({didList: ['did:muport:QmXfH6B8yosXTfyWBziBSY5zZpqjVbsJN18yk56EpmYDb5']})
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond empty JSON to addressList with NO profile [size 1] ', async (done) => {
      request(app)
        .post('/profileList')
        .send({addressList: [notUser.address]})
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond JSON to addressList with profile [size 3]', async (done) => {
      request(app)
        .post('/profileList')
        .send({addressList: [user1.address, user2.address, user3.address]})
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond JSON to addressList with mix profile and not profiles [size 3, response 2]', async (done) => {
      request(app)
        .post('/profileList')
        .send({addressList: [user1.address, notUser.address, user3.address]})
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })
  })
})
