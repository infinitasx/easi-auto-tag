const fs = require('fs')
const path = require('path')

function exposeScript (pkgObj) {
  if (!pkgObj.hasOwnProperty('scripts')) {
    pkgObj.scripts = {}
  }

  if (!pkgObj.scripts.hasOwnProperty('easi-auto-tag')) {
    pkgObj.scripts['easi-auto-tag'] = 'easi-auto-tag'
  }
}

const cwd = process.cwd()
if (cwd.indexOf('node_modules') >= 0) {
  const appRoot = path.normalize(cwd.slice(0, cwd.lastIndexOf('node_modules')))
  // save package.json
  const pkgPath = path.join(appRoot, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath).toString('utf-8'))
  exposeScript(pkg)
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
}
