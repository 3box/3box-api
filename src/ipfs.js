const multicodec = require('multicodec')
const { ipfsRepo } = require('./s3')
const Ipld = require('ipld')
const ipfsRead = require('./ipfs')
const IpfsBlockService = require('ipfs-block-service')
const Repo = require('ipfs-repo')

// A mock lock for fs ipfs repo, s3 includes mock lock already
const notALock = {
  getLockfilePath: () => {},
  lock: (_) => notALock.getCloser(),
  getCloser: (_) => ({
    close: () => {}
  }),
  locked: (_) => false
}

async function createRepo(path) {
  const repo = new Repo(path, {lock: notALock})
  return openRepo(repo)
}

async function createS3Repo(path, bucketConfig) {
  if (!path|| !bucketConfig.bucket) {
    throw new Error('Invalid IPFS + S3 configuration')
  }

  const repo = ipfsRepo({
    path: path,
    bucket: bucketConfig.bucket,
    accessKeyId: bucketConfig.accessKeyId,
    secretAccessKey: bucketConfig.secretAccessKey
  })

  return openRepo(repo)
}

async function openRepo(repo) {
  await repo.init({})
  await repo.open()
  return repo
}

async function createIPFSRead (repo) {
  const blockService = new IpfsBlockService(repo)
  const ipld = new Ipld({blockService: blockService})
  return ipfs(ipld)
}

const ipfs = (ipld) => ({
  dag: {
    get: async (cid) => {
      const obj = await ipld.get(cid)
      return { value: obj }
    },
    // only hash, not write, TODO, could improve format handling
    put: async (node, options) => {
      let cid
      if (options.format === 'dag-pb') {
        cid = await ipld.put(node, multicodec.DAG_PB, {
          hashAlg: multicodec.SHA2_256,
          cidVersion: 0,
          onlyHash: true
        })
      } else {
        cid = await ipld.put(node, multicodec.DAG_CBOR, {
          hashAlg: multicodec.SHA2_256,
          cidVersion: 1,
          onlyHash: true
        })
      }

      return cid
    }
  }
})

module.exports = { ipfs, createIPFSRead, createS3Repo, createRepo }
