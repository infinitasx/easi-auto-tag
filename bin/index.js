#!/usr/bin/env node
let argv = require('yargs-parser')(process.argv)
const runDefault = require('../lib/index')
const runSimplified = require('../lib/simplified')

argv = argv._.slice(2)

if (argv.length === 0) {
  runDefault()
} else {
  runSimplified(...argv)
}
