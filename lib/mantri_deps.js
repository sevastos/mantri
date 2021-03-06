/*jshint camelcase:false */
/**
 * Build the dependencies file deps.js for the given options
 *
 */

var gcTools  = require('grunt-closure-tools')(),
    helpers  = require('./helpers'),
    grunt    = require('grunt'),
    path     = require('path'),
    cTools   = require('closure-tools');

var mantri = {};

var DEPSWRITER = cTools.getPath('build/depswriter.py');

var knownErrors = /(Base files should not provide or require namespaces)/gm;

var knownErrorsMessage = 'Please make sure there are no files in your path\nthat don\'t' +
     ' belong to your application.\n\n' +
     'Most usual suspect is the "node_modules" directory.\nIf that\'s the case' +
     ' you will need to define a more\nspecific path that your project\'s ' +
     'root.\n\n' +
     'Read more about this:\n' +
     'https://github.com/thanpolas/mantri/wiki/Grunt-Task-mantriDeps' ;

/**
 * Run the dependency task.
 *
 * @param  {Function} cb      [description]
 * @param  {Object}   fileObj An object containing the keys 'src' and 'dest'
 *   with string values.
 * @param  {Object}   options A map with options as defined in the grunt task.
 * @param  {string}   target  The target we are working on.
 */
mantri.deps = function( cb, fileObj, options, target ) {

  // try to figure out the document root. It's a path relative to where
  // the Grunfile is.
  var documentRoot = options.root || fileObj.src[0] || './';

  // get the source, where we'll scan for the js files
  var src = fileObj.src[0] || './';

  // now compare documentRoot and source, if they are different
  // we need to get the relative path of the source compared
  // to the document root.
  //
  var relSrc;
  if ( documentRoot !== src ) {
    relSrc = path.relative( documentRoot, src );
  } else {
    relSrc = './';
  }

  // get the destination
  var dest = fileObj.dest || path.join( documentRoot, 'deps.js' );

  var depsOptions = {
    depswriter: helpers.getPath( DEPSWRITER ),
    root_with_prefix: ['"' + src + ' ' + relSrc + '"']
  };
  var depsFileObj = {
    dest: dest
  };

  var command = gcTools.depsWriter.createCommand( depsOptions, depsFileObj );

  if ( !command ) {
    helpers.log.error('Create command failed for depsWriter');
    cb( false );
    return;
  }

  var commands = [ {cmd: command, dest: target} ];

  helpers.runCommands( commands, function( state, stderr, stdout ) {

    if ( !state && knownErrors.test(stderr) ) {
      helpers.log.warn( helpers.getWarn( knownErrorsMessage ) );
    }
    cb(state);
  } );

};

module.exports = mantri;
