const assert = require('assert');
const semver = require('../semver');

const oldVersion = '1.1.1';

const semverList = [
  ['patch', true, '1.1.2'],
  ['minor', true, '1.2.0'],
  ['major', true, '2.0.0'],
  ['prepatch', true, '1.1.2-beta.0'],
  ['preminor', 'alpha', '1.2.0-alpha.0'],
  ['premajor', 'rc', '2.0.0-rc.0'],
  ['prerelease', true, '1.1.2-beta.0']
];

describe('Semver version check (old version: 1.1.1)', () => {
  semverList.forEach((sem) => {
    const newVersion = semver({ [sem[0]]: sem[1] }, oldVersion).version;
    it(`relix --${sem[0]}${typeof sem[1] === 'string' ? ` ${sem[1]}` : ''} (${oldVersion} -> ${newVersion})`, () => {
      assert.equal(newVersion, sem[2]);
    });
  });
});
