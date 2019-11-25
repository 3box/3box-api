const { RedisCache, NullCache } = require('./cache')
const APIService = require('./APIService')
const analytics = require('./analytics')
const { createIPFSRead, createS3Repo, createRepo } = require('./ipfs')
const OrbitDBRedisCache = require('./orbitdbCache')

const ADDRESS_SERVER_URL = process.env.ADDRESS_SERVER_URL
const IPFS_PATH =  process.env.IPFS_PATH
const CACHE_REDIS_PATH = process.env.REDIS_PATH
const SEGMENT_WRITE_KEY = process.env.SEGMENT_WRITE_KEY
const ANALYTICS_ACTIVE = process.env.ANALYTICS_ACTIVE === 'true'
const ORBIT_REDIS_PATH = process.env.ORBIT_REDIS_PATH
const DAYS15 = 60 * 60 * 24 * 15 // 15 day ttl

const analyticsClient = analytics(SEGMENT_WRITE_KEY, ANALYTICS_ACTIVE)
const orbitCacheRedisOpts = ORBIT_REDIS_PATH ? { host: ORBIT_REDIS_PATH } : null

const  s3Config  = {
  bucket: process.env.AWS_BUCKET_NAME,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
}

const isS3Repo = Boolean(process.env.AWS_BUCKET_NAME)

async function API () {
  const repo = isS3Repo ? await createS3Repo(IPFS_PATH, s3Config) : await createRepo(IPFS_PATH)
  const ipfs = await createIPFSRead(repo)
  const cache = CACHE_REDIS_PATH && ORBIT_REDIS_PATH ? new RedisCache({ host: CACHE_REDIS_PATH }, { host: ORBIT_REDIS_PATH }, DAYS15) : null
  const orbitCache = new OrbitDBRedisCache(ORBIT_REDIS_PATH)
  return new APIService(ipfs, orbitCache, cache, analyticsClient, ADDRESS_SERVER_URL)
}

module.exports = API
