const request = require('supertest')
const APIService = require('../APIService')
const API = require('../node.js')

jest.setTimeout(30000);

// TODO create data for three users
// MOCK HTTP TO ADDRESS SERVER
jest.mock('axios', () => {
  return {
    get: jest.fn((url) => {
      if (url.includes('0x1ee6ae029c6d99ff3a810cf8eaa31d193c89ec9c')) {
      // https://beta.3box.io/address-server/odbAddress/0x1ee6ae029c6d99ff3a810cf8eaa31d193c89ec9c
        return { data: {"status":"success",
                  "data":{"rootStoreAddress":"/orbitdb/QmUGS97iEKTdYKk9eRAeEDcYddjf4cPvEBN3VYWAt4UQzq/122005848b73823cd14509c582c552ca7a4e4e668a7228dd8118cfddf2f7cf8cc21c.root",
                                       "did":"did:muport:QmQAnachTJXMVHKa5Nu3mZNn5jGrJ9TvHJde3NSp8J4qzL"}}}
      }
      return {"status":"error","message":"address not linked"}
    }),
    post: jest.fn()
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

const analyticsMock = {
  trackListSpaces: jest.fn(),
  trackGetConfig: jest.fn(),
  trackGetThread: jest.fn(),
  trackGetSpace: jest.fn(),
  trackGetProfile: jest.fn(),
  trackGetProfiles: jest.fn()
}

describe('APIService', async () => {
  let app

  beforeAll(async () => {
    // TODO move this arg to env
    const api = await API('./src/__tests__/test-data/ipfs')
    app = api.app
  })

  describe('GET /profile', () => {

    it('respond json to address with profile', async function(done) {
      request(app)
        .get('/profile?address=0x1eE6aE029c6D99fF3a810CF8EAA31D193c89ec9c')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          done()
        })
    })

    it('respond json to DID with profile', async function(done) {
      request(app)
        .get('/profile?did=did%3Amuport%3AQmQAnachTJXMVHKa5Nu3mZNn5jGrJ9TvHJde3NSp8J4qzL')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          done()
        })
    })

    it('respond json to address with profile and metadata option', async function(done) {
      // TODO snapshot incorrect, need to pass back through metadata
      request(app)
        .get('/profile?address=0x1eE6aE029c6D99fF3a810CF8EAA31D193c89ec9c&metadata=true')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          done()
        })
    })

    it('respond json to DID with profile and metadata option', async function(done) {
        // TODO snapshot incorrect, need to pass back through metadata
      request(app)
        .get('/profile?did=did%3Amuport%3AQmQAnachTJXMVHKa5Nu3mZNn5jGrJ9TvHJde3NSp8J4qzL')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          done()
        })
    })

    it('respond 404 to address with no profile', async function(done) {
      request(app)
        .get('/profile?address=0xD72e013d96f97412d524CaCB9AEfA885598E28d6')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          done()
        })
    })

    //TODO too slow without local resolution
    // it('respond 404 to did with no profile', async function(done) {
    //   request(app)
    //     .get('/profile?did=did%3Amuport%3AQmQAnachTJXMVHKa5Nu3mZNn5jGrJZZZZZZZZZZZZZZZZZ')
    //     .set('Accept', 'application/json')
    //     .expect('Content-Type', /json/)
    //     .expect(200)
    //     .then(response => {
    //       expect(response.body).toMatchSnapshot()
    //       done()
    //     })
    // })

    //NOTE: Could have more specific error, invalid address instead of 404
    it('respond 404 to did passed as address', async function(done) {
      request(app)
        .get('/profile?address=did%3Amuport%3AQmQAnachTJXMVHKa5Nu3mZNn5jGrJ9TvHJde3NSp8J4qzL')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          done()
        })
    })

    //NOTE: could return specific error + json, instead of generic 500
    it('respond 500 to address passed as did', async function(done) {
      request(app)
        .get('/profile?did=0xD72e013d96f97412d524CaCB9AEfA885598E28d6')
        .set('Accept', 'application/json')
        // .expect('Content-Type', /json/)
        .expect(500)
        .then(response => {
          // expect(response.body).toMatchSnapshot()
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
          done()
        })
    })
  })

  describe('GET /thread', () => {

    it('respond json to thread by address that exists', async (done) => {
      request(app)
        .get('/thread?address=/orbitdb/zdpuAtmJDmsVPeKdJiLt3nFweLN3u7GEc8kQzNqyBKUkcP9qc/3box.thread.api.thread')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          done()
        })
    })

    it('respond json to thread by config that exists', async (done) => {
      request(app)
        .get('/thread?space=api&name=thread&mod=did%3A3%3Abafyreigi4zax3eh3xisz7xor72hm47bbhxkod7562elvmkc257xmzo4wvy&members=false')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          done()
        })
    })

    //NOTE could return error (404) if not manifest file from readDB instead of empty, to indicate wrong args
    it('respond 404 to thread by config that does NOT exist', async (done) => {
      request(app)
        .get('/thread?space=api&name=noexist&mod=did%3A3%3Abafyreigi4zax3eh3xisz7xor72hm47bbhxkod7562elvmkc257xmzo4wvy&members=false')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
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
          done()
        })
    })

    // NOTE return specific error, intead empty 200
    it('respond 500 to thread by config missing args', async (done) => {
      // missing members
      request(app)
        .get('/thread?space=api&name=thread&mod=did%3A3%3Abafyreigi4zax3eh3xisz7xor72hm47bbhxkod7562elvmkc257xmzo4wvy')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          done()
        })
    })

    // NOTE return specific error, instead empty 200
    it('respond 500 to thread address malformed', async (done) => {
      request(app)
        .get('/thread?address=zdpuAtmJDmsVPeKdJiLt3nFweLN3u7GEc8kQzNqyBKUkcP9qc/3box.thread.api.thread')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          done()
        })
    })
  })

  describe('GET /space', () => {

    it('respond json to space (by address) that exists', async (done) => {
      request(app)
        .get('/space?address=0x1eE6aE029c6D99fF3a810CF8EAA31D193c89ec9c&name=api')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          done()
        })
    })

    it('respond 404 to space that does not exists', async (done) => {
      request(app)
        .get('/space?address=0x1eE6aE029c6D99fF3a810CF8EAA31D193c89ec9c&name=notaspace')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404)
        .then(response => {
          done()
        })
    })

    it('respond json to space (by DID) that exists', async (done) => {
      request(app)
        .get('/space?address=did%3Amuport%3AQmQAnachTJXMVHKa5Nu3mZNn5jGrJ9TvHJde3NSp8J4qzL&name=api')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404)
        .then(response => {
          done()
        })
    })

    // NOTE, instead of returning empty space, return specific error
    it('respond 401 to missing args', async (done) => {
      request(app)
        .get('/space?address=0x1eE6aE029c6D99fF3a810CF8EAA31D193c89ec9c')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          done()
        })
    })
  })

  describe('GET /list-spaces', () => {

    it('respond json to address with profile', async function(done) {
      request(app)
        .get('/list-spaces?address=0x1eE6aE029c6D99fF3a810CF8EAA31D193c89ec9c')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          done()
        })
    })

    it('respond json to DID with profile', async function(done) {
      request(app)
        .get('/list-spaces?did=did%3Amuport%3AQmQAnachTJXMVHKa5Nu3mZNn5jGrJ9TvHJde3NSp8J4qzL')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          done()
        })
    })

    it('respond 404 to address with no 3box', async function(done) {
      request(app)
        .get('/list-spaces?address=0xD72e013d96f97412d524CaCB9AEfA885598E28d6')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          done()
        })
    })

    //TODO too slow without local resolution
    // it('respond 404 to did with no profile', async function(done) {
    //   request(app)
    //     .get('/list-spaces?did=did%3Amuport%3AQmQAnachTJXMVHKa5Nu3mZNn5jGrJZZZZZZZZZZZZZZZZZ')
    //     .set('Accept', 'application/json')
    //     .expect('Content-Type', /json/)
    //     .expect(200)
    //     .then(response => {
    //       expect(response.body).toMatchSnapshot()
    //       done()
    //     })
    // })
  })

  describe('GET /config', () => {
    it('respond json to address with 3box', async function(done) {
      request(app)
        .get('/config?address=0x1eE6aE029c6D99fF3a810CF8EAA31D193c89ec9c')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          done()
        })
    })

    it('respond json to DID with 3box', async function(done) {
      request(app)
        .get('/config?did=did%3Amuport%3AQmQAnachTJXMVHKa5Nu3mZNn5jGrJ9TvHJde3NSp8J4qzL')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          done()
        })
    })

    it('respond 404 to address with no 3box', async function(done) {
      request(app)
        .get('/config?address=0xD72e013d96f97412d524CaCB9AEfA885598E28d6')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          done()
        })
    })

    //TODO too slow without local resolution
    // it('respond 404 to did with no 3box', async function(done) {
    //   request(app)
    //     .get('/config?did=did%3Amuport%3AQmQAnachTJXMVHKa5Nu3mZNn5jGrJZZZZZZZZZZZZZZZZZ')
    //     .set('Accept', 'application/json')
    //     .expect('Content-Type', /json/)
    //     .expect(200)
    //     .then(response => {
    //       expect(response.body).toMatchSnapshot()
    //       done()
    //     })
    // })
  })

  describe('POST /profileList', () => {


    it('should ', async () => {

    })
  })
})
