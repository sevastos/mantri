/**
 * Bootstrap file for grunt
 *
 */

var gruntDeps    = require('./grunt_deps'),
    gruntBuild   = require('./grunt_build'),
    cTools       = require('grunt-closure-tools');

module.exports = function(grunt) {

  // if grunt is not provided, then expose internal API
  if ('object' !== typeof(grunt)) {
    return {
      helpers: cTools.helpers,
      deps: require('../lib/mantri_deps'),
      build: require('../lib/mantri_build'),
      gruntDeps: gruntDeps,
      gruntBuild: gruntBuild
    };
  }

  gruntDeps(grunt);
  gruntBuild(grunt);

};
