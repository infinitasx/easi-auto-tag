const path = require('path')
const fs = require('fs')
const execa = require('execa')
const semver  = require('semver')
const chalk = require('chalk')
const inquirer = require('inquirer')
const ora = require('ora')

const VALID_TAG_IDENTIFIER = ['alpha', 'beta', 'rc', 'release']
const IDENTIFIER_VALUES = {
  'alpha': 0,
  'beta': 1,
  'rc': 2,
  'release': 3
}
const promptIdentifier = async () => {
  let { identifier } = await inquirer.prompt([
    {
      name: 'identifier',
      message: '选择Identifier: ',
      type: 'list',
      choices: [
        { name: 'Major', value: 'major' },
        { name: 'Minor', value: 'minor' },
        { name: 'Patch', value: 'patch' },
      ]
    }
  ])

  return identifier
}
const promptPreIdentifier = async () => {
  let { preIdentifier } = await inquirer.prompt([
    {
      name: 'preIdentifier',
      message: '选择PreIdentifier: ',
      type: 'list',
      choices: [
        { name: 'PreMajor', value: 'major' },
        { name: 'PreMinor', value: 'minor' },
        { name: 'PrePatch', value: 'patch' },
      ]
    }
  ])

  return `pre${preIdentifier}`
}

module.exports = async (tagIdentifier = 'alpha') => {
  if (VALID_TAG_IDENTIFIER.indexOf(tagIdentifier) === -1) {
    console.log(chalk.redBright(`\n✘ 标识符︎"${tagIdentifier}"不存在，请使用${VALID_TAG_IDENTIFIER.join('/')}\n`))
    process.exit()
  }

  const cwd = process.cwd()
  const pkgPath = path.resolve(cwd, './package.json')
  const pkg = require(pkgPath)
  const projectVersion = pkg.version
  console.log(chalk.green(`\n当前版本: ${projectVersion}\n`))

  const lastSemver = semver.parse(projectVersion)
  let newSemver

  // last semver is prerelease
  if (lastSemver.prerelease.length === 2) {
    if (tagIdentifier === 'release') {
      newSemver = new semver.SemVer(lastSemver)
      semver.inc(newSemver, 'patch')
    } else {
      const lastIdentifierValue = IDENTIFIER_VALUES[lastSemver.prerelease[0]]
      const newIdentifierValue = IDENTIFIER_VALUES[tagIdentifier]

      newSemver = new semver.SemVer(lastSemver)

      if (newIdentifierValue < lastIdentifierValue) {
        let preIdentifier = await promptPreIdentifier()
        semver.inc(newSemver, preIdentifier, tagIdentifier)
      } else {
        semver.inc(newSemver, 'prerelease', tagIdentifier)
      }
    }
  } else {
    newSemver = new semver.SemVer(lastSemver)

    if (tagIdentifier === 'release') {
      let identifier = await promptIdentifier()
      semver.inc(newSemver, identifier)
    } else {
      let preIdentifier = await promptPreIdentifier()
      semver.inc(newSemver, preIdentifier, tagIdentifier)
    }
  }

  pkg.version = newSemver.version
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))

  try {
    const newTagName = `v${pkg.version}`

    // 提交代码
    await execa('git', ['add', '.'])
    await execa('git', ['commit', '-m', `chore: tag ${newTagName}`])

    // 创建tag
    const spinner = ora('Tag创建中...').start()
    await execa('git', ['tag', '-f', `${newTagName}`])
    await execa('git', ['push', '-f', 'origin', `${newTagName}`])
    spinner.succeed('Tag创建成功')

    const sparkles = String.fromCodePoint(10024)
    console.log(chalk.green(`\n${sparkles} Tag(${newTagName})创建成功，并已推送到Github\n`))
  } catch (e) {
    console.log(e)
    process.exit()
  }
}
