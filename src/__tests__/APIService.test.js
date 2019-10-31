const request = require('supertest')
const APIService = require('../APIService')
const API = require('../node.js')

jest.setTimeout(30000);

// TODO create data for three users
// MOCK HTTP TO ADDRESS SERVER
jest.mock('axios', () => {
  return {
    get: jest.fn(() => {
      // https://beta.3box.io/address-server/odbAddress/0x1ee6ae029c6d99ff3a810cf8eaa31d193c89ec9c
      return { data: {"status":"success",
                "data":{"rootStoreAddress":"/orbitdb/QmUGS97iEKTdYKk9eRAeEDcYddjf4cPvEBN3VYWAt4UQzq/122005848b73823cd14509c582c552ca7a4e4e668a7228dd8118cfddf2f7cf8cc21c.root",
                                     "did":"did:muport:QmQAnachTJXMVHKa5Nu3mZNn5jGrJ9TvHJde3NSp8J4qzL"}}}
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

    // it('respond json to DID with profile', async function(done) {
    //   request(app)
    //     .get('/profile?did=did%3Amuport%3AQmQAnachTJXMVHKa5Nu3mZNn5jGrJ9TvHJde3NSp8J4qzL')
    //     .set('Accept', 'application/json')
    //     .expect('Content-Type', /json/)
    //     .expect(200)
    //     .then(response => {
    //       expect(response.body).toMatchSnapshot()
    //       done()
    //     })
    // })

    it('respond json to address with profile and metadata option', async function(done) {
      // TODO snapshot incorrect
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

    // it('respond json to DID with profile and metadata option', async function(done) {
    //   request(app)
    //     .get('/profile?did=did%3Amuport%3AQmQAnachTJXMVHKa5Nu3mZNn5jGrJ9TvHJde3NSp8J4qzL')
    //     .set('Accept', 'application/json')
    //     .expect('Content-Type', /json/)
    //     .expect(200)
    //     .then(response => {
    //       expect(response.body).toMatchSnapshot()
    //       done()
    //     })
    // })

    // it('respond 404 to address with no profile', async function(done) {
    //   request(app)
    //     .get('/profile?did=did%3Amuport%3AQmQAnachTJXMVHKa5Nu3mZNn5jGrJ9TvHJde3NSp8J4qzL')
    //     .set('Accept', 'application/json')
    //     .expect('Content-Type', /json/)
    //     .expect(200)
    //     .then(response => {
    //       expect(response.body).toMatchSnapshot()
    //       done()
    //     })
    // })

    // it('respond 404 to did with no profile', async function(done) {
    //   request(app)
    //     .get('/profile?did=did%3Amuport%3AQmQAnachTJXMVHKa5Nu3mZNn5jGrJ9TvHJde3NSp8J4qzL')
    //     .set('Accept', 'application/json')
    //     .expect('Content-Type', /json/)
    //     .expect(200)
    //     .then(response => {
    //       expect(response.body).toMatchSnapshot()
    //       done()
    //     })
    // })

    // TODO what about subdids
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

    // it('respond json to thread by address that exists', async () => {
    //   request(app)
    //     .get('/thread?address=/orbitdb/zdpuAtmJDmsVPeKdJiLt3nFweLN3u7GEc8kQzNqyBKUkcP9qc/3box.thread.api.thread')
    //     .set('Accept', 'application/json')
    //     .expect('Content-Type', /json/)
    //     .expect(200)
    //     .then(response => {
    //       expect(response.body).toMatchSnapshot()
    //       // done()
    //     })
    // })
    //
    // it('respond json to thread by config that exists', async () => {
    //   request(app)
    //     .get('/thread?space=api&name=thread&mod=did%3A3%3Abafyreigi4zax3eh3xisz7xor72hm47bbhxkod7562elvmkc257xmzo4wvy&members=false')
    //     .set('Accept', 'application/json')
    //     .expect('Content-Type', /json/)
    //     .expect(200)
    //     .then(response => {
    //       expect(response.body).toMatchSnapshot()
    //       // done()
    //     })
    // })

    // it('respond 404 to thread by config that does NOT exist', async () => {
    //   request(app)
    //     .get('thread?space=api&name=thread&mod=did%3A3%3Abafyreigi4zax3eh3xisz7xor72hm47bbhxkod7562elvmkc257xmzo4wvy&members=false')
    //     .set('Accept', 'application/json')
    //     .expect('Content-Type', /json/)
    //     .expect(200)
    //     .then(response => {
    //       expect(response.body).toMatchSnapshot()
    //       done()
    //     })
    // })

    // it('respond 404 to thread by address that does NOT exist', async () => {
    //   request(app)
    //     .get('thread?space=api&name=thread&mod=did%3A3%3Abafyreigi4zax3eh3xisz7xor72hm47bbhxkod7562elvmkc257xmzo4wvy&members=false')
    //     .set('Accept', 'application/json')
    //     .expect('Content-Type', /json/)
    //     .expect(200)
    //     .then(response => {
    //       expect(response.body).toMatchSnapshot()
    //       done()
    //     })
    // })

    // it('respond 505 to thread by config missing args', async () => {
    //   request(app)
    //     .get('thread?space=api&name=thread&mod=did%3A3%3Abafyreigi4zax3eh3xisz7xor72hm47bbhxkod7562elvmkc257xmzo4wvy&members=false')
    //     .set('Accept', 'application/json')
    //     .expect('Content-Type', /json/)
    //     .expect(200)
    //     .then(response => {
    //       expect(response.body).toMatchSnapshot()
    //       done()
    //     })
    // })

    // it('respond 505 to thread address malformed', async () => {
    //   request(app)
    //     .get('thread?space=api&name=thread&mod=did%3A3%3Abafyreigi4zax3eh3xisz7xor72hm47bbhxkod7562elvmkc257xmzo4wvy&members=false')
    //     .set('Accept', 'application/json')
    //     .expect('Content-Type', /json/)
    //     .expect(200)
    //     .then(response => {
    //       expect(response.body).toMatchSnapshot()
    //       done()
    //     })
    // })
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

    // it('respond json to space (by DID) that exists', async (done) => {
    //   request(app)
    //     .get('/space?address=0x1eE6aE029c6D99fF3a810CF8EAA31D193c89ec9c&name=api')
    //     .set('Accept', 'application/json')
    //     .expect('Content-Type', /json/)
    //     .expect(200)
    //     .then(response => {
    //       expect(response.body).toMatchSnapshot()
    //       done()
    //     })
    // })

    // it('respond 401 to missing args', async (done) => {
    //   request(app)
    //     .get('/space?address=0x1eE6aE029c6D99fF3a810CF8EAA31D193c89ec9c&name=notaspace')
    //     .set('Accept', 'application/json')
    //     .expect('Content-Type', /json/)
    //     .expect(404)
    //     .then(response => {
    //       done()
    //     })
    // })
  })

  describe('GET /list-spaces', () => {

    it('should', async () => {

    })
  })

  describe('GET /config', () => {


    it('should ', async () => {

    })
  })

  describe('POST /profileList', () => {


    it('should ', async () => {

    })
  })
})
