'use strict';

const fs = require('fs');
const path = require('path');
const {exec} = require('child_process');
const {green, red, cyan} = require('chalk');
const semver = require('semver');
const getNewVersion = require('./semver');

/**
 * @param options
 * @property {boolean} patch
 * @property {boolean} minor
 * @property {boolean} major
 * @property {boolean|string} prepatch
 * @property {boolean|string} preminor
 * @property {boolean|string} premajor
 * @property {boolean|string} prerelease
 * @property {boolean} accessPublic
 * @property {boolean|string} remote
 */
module.exports = async function (options) {
  const packageFile = path.resolve(process.cwd(), 'package.json');

  let packageFileData;
  let version;

  try {
    packageFileData = fs.readFileSync(packageFile, 'utf8');
    version = JSON.parse(packageFileData).version;
  } catch (err) {
    throw new Error('Can not find package.json in current work directory!');
  }

  const metadata = getNewVersion(options, version);

  function overwritePackageJson() {
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
      `npm publish ${options.accessPublic ? '--access=public' : ''}`
    ].join(' && ');

    return new Promise((resolve) => {
      const childExec = exec(shellList, {maxBuffer: 10000 * 10240}, (err, stdout) => {
        if (err) {
          throw err;
        } else {
          resolve();
        }
      });
      childExec.stdout.pipe(process.stdout);
      childExec.stderr.pipe(process.stderr);
    });
  }

  if (metadata.version && semver.valid(metadata.version)) {
    let remote;

    if (options.remote === true) {
      console.log(red('Please enter correct format like that:\n\n'), cyan('`relix --remote upstream/branch`'));
      process.exit(1);
    } else if (options.remote === undefined) {
      remote = 'origin/master';
    } else {
      remote = options.remote;
    }

    const upstream = remote.split('/')[0];
    const branch = remote.split('/')[1];

    try {
      const msg = await overwritePackageJson();
      console.log(msg);
      console.log(green(`\nVersion: ${cyan(`${version} -> ${metadata.version}`)}`));
      console.log(green(`\nCommit message: ${cyan(`${metadata.prefix}${metadata.version}`)}`));
      await execShell(upstream, branch);
      console.log(`\n${green('[ Relix ]')} Release Success!\n`);
    } catch (err) {
      throw err;
    }
  } else {
    throw new Error('This version is invalid!');
  }
};
