#!/usr/bin/env node
const API = require('./node')

async function run () {
  const api = await API()
  api.start()
}

run()
