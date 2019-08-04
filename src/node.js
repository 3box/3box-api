#!/usr/bin/env node

const argv = require('yargs').argv
const path = require('path')
const { ipfsRepo } = require('./s3')
const { RedisCache, NullCache } = require('./cache')
const CacheService = require('./cacheService')
const analytics = require('./analytics')
const Ipld = require('ipld')
// const IpfsRepo = require('ipfs-repo')
const IpfsBlockService = require('ipfs-block-service')
const orbitDBCache = require('orbit-db-cache-redis')

const env = process.env.NODE_ENV || 'development'
require('dotenv').config({ path: path.resolve(process.cwd(), `.env.${env}`) })

const ADDRESS_SERVER_URL = process.env.ADDRESS_SERVER_URL
const ORBITDB_PATH = process.env.ORBITDB_PATH
const IPFS_PATH = process.env.IPFS_PATH
const REDIS_PATH = process.env.REDIS_PATH
const SEGMENT_WRITE_KEY = process.env.SEGMENT_WRITE_KEY
const ANALYTICS_ACTIVE = process.env.ANALYTICS_ACTIVE === 'true'
const ORBIT_REDIS_PATH = process.env.ORBIT_REDIS_PATH

const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY

const analyticsClient = analytics(SEGMENT_WRITE_KEY, ANALYTICS_ACTIVE)
const orbitCacheRedisOpts = ORBIT_REDIS_PATH ? { host: ORBIT_REDIS_PATH } : null

function createIPFSRepo () {
  if (!IPFS_PATH || !AWS_BUCKET_NAME) {
    throw new Error('Invalid IPFS + s3 configuration')
  }

  const repo = ipfsRepo({
    path: IPFS_PATH,
    bucket: AWS_BUCKET_NAME,
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  })
  return repo
}

async function start () {
  const cache = REDIS_PATH ? new RedisCache({ host: REDIS_PATH }, DAYS15) : new NullCache()
  const repo = createIPFSRepo()
  repo.init({}, (err) => {
    if (err) {
      console.log(err)
    }
    repo.open((err) => {
      if (err) {
        console.log(err)
      }
      const blockService = new IpfsBlockService(repo)
      const ipld = new Ipld({blockService: blockService})
      const orbitCache = orbitDBCache({ host: ORBIT_REDIS_PATH })

      const cacheService = new CacheService(ipld, orbitCache, ADDRESS_SERVER_URL)
      cacheService.start()
    })
  })
}

start()
