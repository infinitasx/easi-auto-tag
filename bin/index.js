#!/usr/bin/env node
const argv = require('yargs-parser')(process.argv)
const runDefault = require('../lib/index')
const runSimplified = require('../lib/simplified')

if (argv.length === 0) {
  runDefault()
} else {
  runSimplified(...argv._.slice(2))
}
