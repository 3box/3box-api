#!/usr/bin/env node

const argv = require('yargs').argv
const path = require('path')
const { ipfsRepo } = require('./s3')
const { RedisCache, NullCache } = require('./cache')
const APIService = require('./APIService')
const analytics = require('./analytics')
const Ipld = require('ipld')
const ipfsRead = require('./ipfs')
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

async function createIPFSRepo () {
  if (!IPFS_PATH || !AWS_BUCKET_NAME) {
    throw new Error('Invalid IPFS + s3 configuration')
  }
  const repo = ipfsRepo({
    path: IPFS_PATH,
    bucket: AWS_BUCKET_NAME,
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  })
  await repo.init({})
  await repo.open()

  return repo
}

async function createIPFSRead () {
  const repo = await createIPFSRepo()
  const blockService = new IpfsBlockService(repo)
  const ipld = new Ipld({blockService: blockService})
  return ipfsRead(ipld)
}

async function start () {
  const cache = REDIS_PATH ? new RedisCache({ host: REDIS_PATH }, DAYS15) : new NullCache()
  const ipfs = await createIPFSRead()
  const orbitCache = orbitDBCache({ host: ORBIT_REDIS_PATH })
  const api = new APIService(ipfs, orbitCache, ADDRESS_SERVER_URL)
  api.start()
}

start()
