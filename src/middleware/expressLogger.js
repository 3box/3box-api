const bunyan = require('bunyan')
const Logger = require('express-bunyan-logger')

const expressLogger = Logger({
  name: 'expressLogger',
  parseUA: false,
  includesFn: (req, res) => {
    return {
      origin: req.get('origin'),
      path: req.path,
    }
  },
  format: () => "",
  excludes: [
    "body",
    "http-version",
    "incoming",
    "ip",
    "referer",
    "remote-address",
    "req",
    "req-headers",
    "res",
    "res-headers",
    "response-hrtime",
    "response-time",
    "short-body",
    "user-agent",
  ],
  streams: [{
    level: 'info',
    stream: process.stdout
  }]
})

module.exports = expressLogger
