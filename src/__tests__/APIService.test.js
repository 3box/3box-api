const request = require('supertest')
const APIService = require('../APIService')
const API = require('../node.js')
const { user1, user2, user3, notUser } = require('./test-data/users')

jest.mock('axios', () => require('./mocks/addressServer'))
jest.mock('redis', () => require('./mocks/orbitRedisCache'))

// posts by 3 users, first two entry deleted
const openThreadAddress = '/orbitdb/zdpuB18U3dEMq4G4hgShc9Nd1rJM1ZB1JWhsAG8CkmpFHxA6u/3box.thread.spaceone.open'
// closed to user 1 and user 2, first entry deleted
const closedThreadAddress = '/orbitdb/zdpuAnq4FhPsq8iMzy4HX7LKUV8MbNjb8oRmk9ghjdhGdRtQJ/3box.thread.spaceone.closedu1u2'

describe('APIService', async () => {
  let app
  let api

  beforeAll(async () => {
    api = await API()
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
        .get(`/profile?did=${user1.didURI}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    it('respond json to 3ID (space) DID with profile', async function(done) {
      request(app)
        .get(`/profile?did=${encodeURIComponent(user1.spaceoneDid)}`)
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
        .get(`/profile?did=${user1.didURI}&metadata=true`)
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
    it('respond 500 (TODO change 404) to did with no profile', async function(done) {
      request(app)
        .get(`/profile?did=${notUser.didURI}`)
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
        .get(`/profile?address=${user1.didURI}`)
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
        .get(`/thread?space=spaceone&name=open&mod=${user1.spaceoneDidURI}&members=false`)
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
        .get(`/thread?space=spaceone&name=closedu1u2&mod=${user1.spaceoneDidURI}&members=true`)
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
    it('respond 200 (empty array, TODO 404) to thread by config that does NOT exist', async (done) => {
      request(app)
        .get(`/thread?space=spaceone&name=noexist&mod=${user1.spaceoneDidURI}&members=false`)
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
    it('respond 200 (empty array, TODO 404) to thread by address that does NOT exist', async (done) => {
      request(app)
        .get('/thread?address=/orbitdb/zdpuAtmJDmsVPeKdJiLt3nFweLN3u7GEc8kQzNqyBKUkcP9qc/3box.thread.api.notexist')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    // TODO better error code
    it('respond 404 to thread by config missing args', async (done) => {
      // missing members
      request(app)
        .get(`/thread?space=api&name=thread&mod=${user1.spaceoneDidURI}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    // NOTE return specific error, instead empty 200
    it('respond 200 to thread address malformed', async (done) => {
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

    // TODO can easily return 404, but current service returns empty 200
    it('respond 200 (TODO 404) to space that does not exists in existing user', async (done) => {
      request(app)
        .get(`/space?address=${user1.address}&name=notaspace`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
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
        .get(`/space?did=${user1.didURI}&name=spaceone`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          expect(api.analytics._track.mock.calls[0][0]).toMatchSnapshot()
          done()
        })
    })

    // NOTE, instead of returning empty space, return specific error
    it('respond 200 (TODO 401) to missing args', async (done) => {
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
        .get(`/list-spaces?did=${user1.didURI}`)
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
    it('respond 500 (TODO 404) to did with no profile', async function(done) {
      request(app)
        .get(`/list-spaces?did=${notUser.didURI}`)
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
        .get(`/config?did=${user1.didURI}`)
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
        .get(`/config?did=${notUser.didURI}`)
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
        .send({didList: [user1.did]})
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

  describe('GET /did-doc', () => {
    it('respond json did-doc to CID (V1) that exists ', async function(done) {
      request(app)
        .get(`/did-doc?cid=${user1.spaceoneDid.split(':').pop()}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          done()
        })
    })

    it('respond json did-doc to CID (V0) that exists ', async function(done) {
      request(app)
        .get(`/did-doc?cid=${user1.did.split(':').pop()}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toMatchSnapshot()
          done()
        })
    })

    it('respond 404 to CID that does not exist', async function(done) {
      request(app)
        .get(`/did-doc?cid=${notUser.did.split(':').pop()}`)
        .set('Accept', 'application/json')
        .expect(500)
        .then(response => {
          done()
        })
    })
  })
})
