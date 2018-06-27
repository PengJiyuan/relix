#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const program = require('commander');
const semver = require('semver');
const pkg = require('./package.json');

program
  .version(pkg.version, '-v, --version')
  .usage('[options]\n\n  Version format: MAJOR.MINOR.PATCH (see: https://semver.org/)')
  .option('--patch', 'version when you make backwards-compatible bug fixes.')
  .option('--minor', 'version when you add functionality in a backwards-compatible manner')
  .option('--major', 'version when you make incompatible API changes')
  .option('--prepatch [identifier]', 'increments the patch version, then makes a prerelease')
  .option('--preminor [identifier]', 'increments the minor version, then makes a prerelease')
  .option('--premajor [identifier]', 'increments the major version, then makes a prerelease')
  .option('--prerelease [identifier]', 'increments version, then makes a prerelease')
  .option('--accessPublic', 'npm publish --access=public')
  .parse(process.argv);

const semverList = [
  ['patch', 'Bump version '],
  ['minor', 'Release version '],
  ['major', 'Release major version ']
];
const preSemverList = [
  'prepatch',
  'preminor',
  'premajor',
  'prerelease'
];
const packageFile = path.resolve(process.cwd(), 'package.json');
let packageFileData;
let version;
let metadata = {};

try {
  packageFileData = fs.readFileSync(packageFile, 'utf8');
  version = JSON.parse(packageFileData).version;
} catch (err) {
  console.error(`${red('Can not find package.json in current work directory!')}`);
  process.exit(1);
}

/**
 * 
 * @param {String} v old version
 * @param {String} release patch | minor | major | prepatch | premajor | preminor | prerelease
 */
function getNewVersion(v, release, identifier) {
  return semver.inc(v, release, identifier);
}

semverList.forEach(sem => {
  if (program[sem[0]]) {
    if (metadata.version) {
      console.error(`${red('You specified more than one semver type, please specify only one!')}`);
      process.exit(1);
    }
    metadata.version = getNewVersion(version, sem[0]);
    metadata.prefix = sem[1];
  }
});

preSemverList.forEach(sem => {
  if (program[sem]) {
    if (metadata.version) {
      console.error(`${red('You specified more than one semver type, please specify only one!')}`);
      process.exit(1);
    }
    const identifier = typeof program[sem] === 'boolean' ? 'beta' : program[sem];
    metadata.version = getNewVersion(version, sem, identifier);
    metadata.prefix = `Prerelease ${identifier} version `;
  }
});

function overwitePackageJson() {
  return new Promise((resolve) => {
    fs.writeFile(packageFile, packageFileData.replace(version, metadata.version), 'utf8', (err) => {
      if (err) reject(err);
      resolve(green('\nUpdate package.json success!'));
    });
  });
}

// stdout with color
function green(str) {
  return '\033[32m' + str + '\033[0m';
}

function red(str) {
  return '\033[31m' + str + '\033[0m';
}

function cyan(str) {
  return '\033[36m' + str + '\033[0m';
}

function execShell() {
  const shellList = [
    `echo "\n${green('[ 1 / 3 ]')} ${cyan('Commit and push to origin master')}\n"`,
    'git add .',
    `git commit -m "${metadata.prefix}${metadata.version}"`,
    'git push origin master',
    `echo "\n${green('[ 2 / 3 ]')} ${cyan('Tag and push tag to origin')}\n"`,
    `git tag ${metadata.version}`,
    `git push origin ${metadata.version}`,
    `echo "\n${green('[ 3 / 3 ]')} ${cyan('Publish to NPM')}\n"`,
    `npm publish ${program.accessPublic ? '--access=public' : ''}`
  ].join(' && ');

  const childExec = exec(shellList, (err, stdout) => {
    if (err) throw err;
    console.log(`\n${green('[ Relix ]')} Release Success!\n`);
  });
  childExec.stdout.pipe(process.stdout);
  childExec.stderr.pipe(process.stderr);
}

if (metadata.version) {
  overwitePackageJson()
    .then(msg => {
      console.log(msg);
      console.log(green(`\nVersion: ${cyan(`${version} -> ${metadata.version}`)}`));
      console.log(green(`\nCommit message: ${cyan(`${metadata.prefix}${metadata.version}`)}`));
      execShell();
    });
} else {
  program.outputHelp();
}
