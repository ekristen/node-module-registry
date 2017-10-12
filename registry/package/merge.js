const _ = require('lodash');
const uuid = require('uuid/v1');

const pickFields = [
  '_id',
  'name',
  'description',
  'dist-tags',
  'readme',
  'homepage',
  'keywords',
  'repository',
  'contributors',
  'bugs',
  'author'
];

module.exports = function mergePackageManifests (existingpkg, newpkg, user) {
  let pkg = _.clone(existingpkg);

  if (typeof pkg._id === 'undefined') {
    // assume new package
    pkg = _.merge(pkg, _.pick(newpkg, pickFields));

    var date = new Date().toISOString();
    pkg.time = {
      created: date,
      modified: date
    };

    pkg.versions = {};
    pkg.maintainers = [];
  }

  const created = pkg.time.created;
  const modified = new Date().toISOString();

  delete pkg.time.created;
  delete pkg.time.modified;

  pkg._attachments = {};
  pkg['dist-tags'] = _.merge(pkg['dist-tags'] || {}, newpkg['dist-tags']);

  Object.keys(newpkg.versions).forEach((version) => {
    pkg.time[version] = new Date().toISOString();

    pkg.versions[version] = newpkg.versions[version];

    pkg.description = newpkg.versions[version].description || 'no description provided';
    pkg.contributors = newpkg.versions[version].contributors || [];
    pkg.homepage = newpkg.versions[version].homepage || '';
    pkg.keywords = newpkg.versions[version].keywords || [];
    pkg.repository = newpkg.versions[version].repository || {};
  });

  pkg.time.created = created;
  pkg.time.modified = modified;

  pkg._rev = uuid();

  if (typeof pkg.maintainers === 'undefined') {
    pkg.maintainers = [];
  }

  let maintainerFound = false;
  pkg.maintainers.forEach((m) => {
    if (m.email === user.email) {
      maintainerFound = true;
    }
  });

  if (maintainerFound === false) {
    pkg.maintainers.push({name: user.name, email: user.email});
  }

  return pkg;
};
