const fs = require('fs')
const path = require('path')

const cwd = process.cwd()
if (cwd.indexOf('node_modules') >= 0) {
  const appRoot = path.normalize(cwd.slice(0, cwd.lastIndexOf('node_modules')))
  const pkgPath = path.join(appRoot, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath).toString('utf-8'))

  // delete script
  if (pkg.hasOwnProperty('scripts')) {
    if (pkg.scripts.hasOwnProperty('easi-auto-tag')) {
      delete pkg.scripts['easi-auto-tag']

      // save package.json
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
    }
  }
}
