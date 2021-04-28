const path = require('path')
const fs = require('fs')
const yargsParser = require('yargs-parser')
const execa = require('execa')
const semver  = require('semver')
const chalk = require('chalk')
const inquirer = require('inquirer')
const ora = require('ora')

module.exports = async () => {
  const argv = yargsParser(process.argv)
  const cwd = process.cwd()

  const pkgPath = path.resolve(cwd, './package.json')
  const pkg = require(pkgPath)
  console.log(`${chalk.green('i')} 当前项目版本(${chalk.blueBright(pkg.version)})`)

  let tagNames = []
  let lastTagName
  let lastTagSemver
  const tagsResult = await execa('git', ['tag', '--list', 'v*', '--sort=creatordate'])
  const tagsResultStdout = tagsResult.stdout.trim()
  if (tagsResultStdout) {
    tagNames = tagsResultStdout.split('\n')
    lastTagName = tagNames[tagNames.length - 1]
    lastTagSemver = semver.parse(lastTagName)
  } else {
    lastTagSemver = semver.parse(pkg.version)
  }

  const { lastTagConfirmed } = await inquirer.prompt([
    {
      name: 'lastTagConfirmed',
      message: `上一个Tag名称(${chalk.blueBright(lastTagName ?? '无')}): `,
      type: 'confirm',
    }
  ])
  if (!lastTagConfirmed) {
    console.log(chalk.blueBright(`Bye!`))
    process.exit()
  }

  // 选择 tag 类型
  const { tagType } = await inquirer.prompt([
    {
      name: 'tagType',
      message: '选择新的Tag类型: ',
      type: 'list',
      choices: [
        { name: 'Major', value: 'major' },
        { name: 'PreMajor', value: 'premajor' },
        { name: 'Minor', value: 'minor' },
        { name: 'PreMinor', value: 'preminor' },
        { name: 'Patch', value: 'patch' },
        { name: 'PrePatch', value: 'prepatch' },
        { name: 'Prerelease', value: 'prerelease' }
      ]
    }
  ])

  // 判断类型，如果是Pre类型则需要选择Identifier
  let preReleaseIdentifier
  let isPre = ['premajor', 'preminor', 'prepatch'].indexOf(tagType) >= 0
  if (isPre || lastTagSemver.prerelease.length < 2) {
    let answer = await inquirer.prompt([
      {
        name: 'preReleaseIdentifier',
        message: '选择Prerelease Identifier: ',
        type: 'list',
        choices: [
          { name: 'Alpha', value: 'alpha' },
          { name: 'Beta', value: 'beta' },
          { name: 'Release Candidate', value: 'rc' }
        ]
      }
    ])
    preReleaseIdentifier = answer.preReleaseIdentifier
  }

  // 递增版本
  let newSemver = new semver.SemVer(lastTagSemver)
  if (isPre) {
    semver.inc(newSemver, tagType, preReleaseIdentifier)
  } else  {
    semver.inc(newSemver, tagType)
  }
  newSemver.build = [...lastTagSemver.build]

  if (preReleaseIdentifier && newSemver.prerelease.length === 1) {
    newSemver.prerelease = [preReleaseIdentifier, ...newSemver.prerelease]
  }
  let { build: newBuild } = await inquirer.prompt([
    {
      name: 'build',
      message: `输入新的Build内容(${chalk.blueBright(newSemver.build?.[0] ?? '无')}): `,
      type: 'string'
    }
  ])
  newBuild = newBuild.trim()
  newSemver.build = newBuild ? [newBuild] : lastTagSemver.build.slice() ?? []
  const newTagName = `v${newSemver.format()}${!!newSemver.build?.length ? '+' + newSemver.build?.[0] : ''}`

  const { newTagConfirmed } = await inquirer.prompt([
    {
      name: 'newTagConfirmed',
      message: `确定要创建(${chalk.blueBright(newTagName ?? '无')})这个Tag吗: `,
      type: 'confirm',
      default: false
    }
  ])
  if (newTagConfirmed) {
    const spinner = ora('Tag创建中...').start()
    await execa.command(`git tag ${newTagName}`)
    const { stdout, stderr } = await execa.command(`git push origin ${newTagName}`)
    spinner.succeed('Tag创建成功')
    console.log(stdout)
    console.log(stderr)
  } else {
    console.log(chalk.blueBright(`Bye!`))
    process.exit()
  }

  // 是否保存版本
  const { saveVersion } = await inquirer.prompt([
    {
      name: 'saveVersion',
      message: `是否保存版本号${newSemver.version}到package.json: `,
      type: 'confirm',
      default: false
    }
  ])
  if (saveVersion) {
    pkg.version = newSemver.version
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
    console.log(`${chalk.green('i')} ${chalk.green('package.json文件已保存')}`)
  }

  const sparkles = String.fromCodePoint(10024)
  console.log(chalk.green(`${sparkles} Tag(${newTagName})创建成功，并已推送到Github `))
}
