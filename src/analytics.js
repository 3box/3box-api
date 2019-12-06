const SegmentAnalytics = require('analytics-node')
const Url = require('url-parse')
const sha256 = require('js-sha256').sha256

const hash = str => str === null ? null : Buffer.from(sha256.digest(str)).toString('hex')
const domainParse = str => new Url(str).hostname

const reqEventMap = {
  '/profile': 'api_get_profile',
  '/profileList': 'api_get_profiles',
  '/space': 'api_get_space',
  '/list-spaces': 'api_list_spaces',
  '/config': 'api_get_config',
  '/thread': 'api_get_thread'
}

class AnalyticsAPI {
  constructor (client) {
    this.client = client
  }

  _track (data = {}, id) {
    if (this.client) {
      data.anonymousId = id || '3box'
      data.properties.time = Date.now()
      return this.client.track(data)
    } else {
      return false
    }
  }

  dispatch (res) {
    const path = new Url(res.req.url).pathname
    const event = reqEventMap[path]
    if (!event) return
    const domain = domainParse(res.req.headers.origin)
    let origin = domain || 'none'
    // ie '35553f0a-cbf5-4cbd-8364-497f2109e016' temp fix for random origin ids, probably from extension (mm?)
    if (domain.split('-').length === 5) origin = 'randomid'
    const status = res.statusCode
    const properties = Object.assign({ origin, status }, res.analytics || {})
    const track = {
      event,
      properties
    }
    this._track(track, origin)
  }
}

module.exports = (writeKey, active = true) => {
  const client = writeKey && active ? new SegmentAnalytics(writeKey) : null
  return new AnalyticsAPI(client)
}
