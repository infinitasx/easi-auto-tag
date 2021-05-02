const path = require('path')
const fs = require('fs')
const yargsParser = require('yargs-parser')
const execa = require('execa')
const semver  = require('semver')
const chalk = require('chalk')
const inquirer = require('inquirer')
const ora = require('ora')

module.exports = async () => {
  const cwd = process.cwd()

  const pkgPath = path.resolve(cwd, './package.json')
  const pkg = require(pkgPath)
  console.log(`${chalk.green('i')} 当前项目版本(${chalk.blueBright(pkg.version)})`)

  let tagNames = []
  let lastTagName
  let lastTagSemver
  let { stdout } = await execa.command('git tag --list --sort=creatordate')
  let tagList = stdout.trim()
  if (tagList) {
    tagNames = tagList.split('\n')
    lastTagName = tagNames[tagNames.length - 1]
    lastTagSemver = semver.parse(lastTagName)
  } else {
    lastTagName = '无'
    lastTagSemver = semver.parse(pkg.version)
  }

  const { lastTagConfirmed } = await inquirer.prompt([
    {
      name: 'lastTagConfirmed',
      message: `上一个Tag名称(${chalk.blueBright(lastTagName)}): `,
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
      message: '选择新Tag类型: ',
      type: 'list',
      choices: [
        { name: '测试Tag', value: 'test' },
        { name: '普通Tag', value: 'normal' },
      ]
    }
  ])
  const newTagPrefix = tagType === 'test' ? 'v' : ''

  // 选择 tag 版本类型
  const { tagVersionType } = await inquirer.prompt([
    {
      name: 'tagVersionType',
      message: '选择新Tag版本: ',
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
  let preIdentifier
  let isPrerelease = ['premajor', 'preminor', 'prepatch', 'prerelease'].indexOf(tagVersionType) >= 0
  if (isPrerelease) {
    ({ preIdentifier } = await inquirer.prompt([
      {
        name: 'preIdentifier',
        message: '选择Prerelease Identifier: ',
        type: 'list',
        choices: [
          { name: 'Alpha', value: 'alpha' },
          { name: 'Beta', value: 'beta' },
          { name: 'Release Candidate', value: 'rc' }
        ]
      }
    ]))
  }

  // 递增版本
  let newSemver = new semver.SemVer(lastTagSemver)
  if (preIdentifier) {
    semver.inc(newSemver, tagVersionType, preIdentifier)
  } else  {
    semver.inc(newSemver, tagVersionType)
  }
  newSemver.build = [...lastTagSemver.build]

  if (preIdentifier && newSemver.prerelease.length === 1) {
    newSemver.prerelease = [preIdentifier, ...newSemver.prerelease]
  }
  const { keepBuild } = await inquirer.prompt([
    {
      name: 'keepBuild',
      message: `是否继续使用(${chalk.blueBright(lastTagSemver.build?.[0] ?? '无')})这个Build: `,
      type: 'confirm',
      default: false
    }
  ])
  if (!keepBuild) {
    let { build: newBuild } = await inquirer.prompt([
      {
        name: 'build',
        message: `输入新的Build(was ${chalk.blueBright(newSemver.build?.[0] ?? '无')}): `,
        type: 'string'
      }
    ])
    newBuild = newBuild.trim()
    newSemver.build = newBuild ? [newBuild] : []
  } else {
    newSemver.build = lastTagSemver.build.slice()
  }
  const newTagBuildString = !!newSemver.build?.length ? '+' + newSemver.build?.[0] : ''
  const newTagName = `${newTagPrefix}${newSemver.format()}${newTagBuildString}`

  const { newTagConfirmed } = await inquirer.prompt([
    {
      name: 'newTagConfirmed',
      message: `确定要创建(${chalk.blueBright(newTagName ?? '无')})这个Tag吗: `,
      type: 'confirm',
      default: false
    }
  ])
  if (newTagConfirmed) {
    try {
      const spinner = ora('Tag创建中...').start()
      await execa.command(`git tag ${newTagName}`)
      const { stdout } = await execa.command(`git push origin ${newTagName}`)
      spinner.succeed('Tag创建成功')
      console.log(stdout)
    } catch (e) {
      console.log(e)
      process.exit()
    }
  } else {
    console.log(chalk.blueBright('Bye!'))
    process.exit()
  }

  const sparkles = String.fromCodePoint(10024)
  console.log(chalk.green(`${sparkles} Tag(${newTagName})创建成功，并已推送到Github`))
}
