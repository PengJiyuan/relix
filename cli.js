#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { green, red, cyan } = require('chalk');
const program = require('commander');
const semver = require('semver');
const pkg = require('./package.json');
const getNewVersion = require('./semver');

program
  .version(pkg.version, '-v, --version')
  .usage('[options]\n\n  Version format: MAJOR.MINOR.PATCH (see: https://semver.org/)')
  .option('--patch', 'version when you make backwards-compatible bug fixes.')
  .option('--minor', 'version when you add functionality in a backwards-compatible manner')
  .option('--major', 'version when you make incompatible API changes')
  .option('--prepatch [identifier]', 'increments the patch version, then makes a prerelease (default: beta)')
  .option('--preminor [identifier]', 'increments the minor version, then makes a prerelease (default: beta)')
  .option('--premajor [identifier]', 'increments the major version, then makes a prerelease (default: beta)')
  .option('--prerelease [identifier]', 'increments version, then makes a prerelease (default: beta)')
  .option('--accessPublic', 'npm publish --access=public')
  .option('-m, --remote [remote]', 'remote and branch. format: `upstream/branch`', /^[a-zA-Z0-9_~.-]+\/[a-zA-Z0-9_~.-]+$/)
  .on('--help', () => {
    console.log('\n  Tip:\n');
    console.log('    You should run this script in the root directory of you project or run by npm scripts.');
    console.log('\n  Examples:\n');
    console.log(`    ${green('$')} relix --patch`);
    console.log(`    ${green('$')} relix --prepatch`);
    console.log(`    ${green('$')} relix --prepatch alpha`);
    console.log(`    ${green('$')} relix --major --accessPublic`);
    console.log(`    ${green('$')} relix --patch --remote upstream/branch`);
    console.log('');
  })
  .parse(process.argv);

const packageFile = path.resolve(process.cwd(), 'package.json');
let packageFileData;
let version;

try {
  packageFileData = fs.readFileSync(packageFile, 'utf8');
  version = JSON.parse(packageFileData).version;
} catch (err) {
  console.error(`${red('Can not find package.json in current work directory!')}`);
  process.exit(1);
}

const metadata = getNewVersion(program, version);

function overwitePackageJson() {
  return new Promise((resolve, reject) => {
    fs.writeFile(packageFile, packageFileData.replace(version, metadata.version), 'utf8', (err) => {
      if (err) reject(err);
      resolve(green('\nUpdate package.json success!'));
    });
  });
}

function execShell(upstream, branch) {
  const shellList = [
    `echo "\n${green('[ 1 / 3 ]')} ${cyan(`Commit and push to ${upstream}/${branch}`)}\n"`,
    'git add .',
    `git commit -m "${metadata.prefix}${metadata.version}"`,
    `git push ${upstream} ${branch}`,
    `echo "\n${green('[ 2 / 3 ]')} ${cyan(`Tag and push tag to ${upstream}`)}\n"`,
    `git tag ${metadata.version}`,
    `git push ${upstream} ${metadata.version}`,
    `echo "\n${green('[ 3 / 3 ]')} ${cyan('Publish to NPM')}\n"`,
    `npm publish ${program.accessPublic ? '--access=public' : ''}`
  ].join(' && ');

  const childExec = exec(shellList, { maxBuffer: 10000 * 1024 }, (err, stdout) => {
    if (err) throw err;
    console.log(`\n${green('[ Relix ]')} Release Success!\n`);
  });
  childExec.stdout.pipe(process.stdout);
  childExec.stderr.pipe(process.stderr);
}

if (metadata.version && semver.valid(metadata.version)) {
  let remote;

  if (program.remote === true) {
    console.log(red('Please enter correct format like that:\n\n'), cyan('`relix --remote upstream/branch`'));
    process.exit(1);
  } else if (program.remote === undefined) {
    remote = 'origin/master';
  } else {
    remote = program.remote;
  }

  const upstream = remote.split('/')[0];
  const branch = remote.split('/')[1];
  overwitePackageJson()
    .then((msg) => {
      console.log(msg);
      console.log(green(`\nVersion: ${cyan(`${version} -> ${metadata.version}`)}`));
      console.log(green(`\nCommit message: ${cyan(`${metadata.prefix}${metadata.version}`)}`));
      execShell(upstream, branch);
    });
} else {
  program.outputHelp();
}
