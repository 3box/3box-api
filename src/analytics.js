const SegmentAnalytics = require('analytics-node')
const Url = require('url-parse')
const sha256 = require('js-sha256').sha256

const hash = str => str === null ? null : Buffer.from(sha256.digest(str)).toString('hex')
const domain = str => new Url(str).hostname

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
    const path = res.req.route.path
    const origin = domain(res.req.headers.host)
    const track = {
      status: res.statusCode,
      event: reqEventMap[path],
      origin
    }
    this._track(Object.assign(track, res.analytics || {}), origin)
  }
}

module.exports = (writeKey, active = true) => {
  const client = writeKey && active ? new SegmentAnalytics(writeKey) : null
  return new AnalyticsAPI(client)
}
