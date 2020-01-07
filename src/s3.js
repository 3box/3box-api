const S3Store = require('datastore-s3')
const S3 = require('aws-sdk/clients/s3')
const IPFSRepo = require('ipfs-repo')
const LevelStore = require('datastore-level')
const memLevel = require('level-mem')

// Redundant with createRepo in datastore-s3, but need to not pass
// s3 for root, keys, datastore otherwise overwites pinning keys

// A mock lock
const notALock = {
  getLockfilePath: () => {},
  lock: (_) => notALock.getCloser(),
  getCloser: (_) => ({
    close: () => {}
  }),
  locked: (_) => false
}

const ipfsRepo = (config) => {
  const {
    path,
    bucket,
    accessKeyId,
    secretAccessKey,
    endpoint,
    s3ForcePathStyle,
    signatureVersion,
  } = config
  const createIfMissing = false

  const storeConfig = {
    s3: new S3({
      params: {
        Bucket: bucket
      },
      accessKeyId,
      secretAccessKey,
      endpoint,
      s3ForcePathStyle,
      signatureVersion,
    }),
    createIfMissing
  }

  const memStoreConfig = {
    db: memLevel,
    createIfMissing
  }

  return new IPFSRepo(path, {
    storageBackends: {
      blocks: S3Store,
      datastore: LevelStore,
      root: LevelStore,
      keys: LevelStore
    },
    storageBackendOptions: {
      blocks: storeConfig,
      datastore: memStoreConfig,
      root: memStoreConfig,
      keys: memStoreConfig
    },
    lock: notALock
  })
}

module.exports = { ipfsRepo }
