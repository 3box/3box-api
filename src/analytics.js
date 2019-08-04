const SegmentAnalytics = require('analytics-node')

class Analytics {
  constructor (client) {
    this.client = client
  }

  _track (data = {}) {
    if (this.client) {
      data.anonymousId = '3box'
      data.properties.time = Date.now()
      return this.client.track(data)
    } else {
      return false
    }
  }
}

class AnalyticsAPI extends Analytics {
  trackListSpaces (address, status) {
    let data = {}
    data.event = 'api_list_spaces'
    data.properties = { address: address, status }
    this._track(data)
  }

  trackGetConfig (address, status) {
    let data = {}
    data.event = 'api_get_config'
    data.properties = { address: address, status }
    this._track(data)
  }

  trackGetThread (address, status) {
    let data = {}
    data.event = 'api_get_thread'
    data.properties = { address: address, status }
    this._track(data)
  }

  trackGetSpace (address, name, spaceExisted, status) {
    let data = {}
    data.event = 'api_get_space'
    data.properties = { address: address, name: name, profile_existed: spaceExisted, status }
    this._track(data)
  }

  trackGetProfile (address, profileExisted, status) {
    let data = {}
    data.event = 'api_get_profile'
    data.properties = { address: address, profile_existed: profileExisted, status }
    this._track(data)
  }

  trackGetProfiles (status) {
    let data = {}
    data.event = 'api_get_profiles'
    data.properties = { status }
    this._track(data)
  }
}

module.exports = (writeKey, active = true) => {
  const client = writeKey && active ? new SegmentAnalytics(writeKey) : null
  return {
    api: new AnalyticsAPI(client)
  }
}
