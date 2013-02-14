/*jshint camelcase:false */
/**
 * Build the source code
 *
 */

var cTools = require('grunt-closure-tools')(),
    grunt  = require('grunt'),
    __     = require('underscore'),
    path   = require('path'),
    Tempdir = require('temporary/lib/dir'),
    fs     = require('fs');

// define the namespace we'll work on
var build = {
  _tmpDir: null,
  GOOG_BASE_FILE: 'base.js'

};

// Define the path to the closure compiler jar file.
var CLOSURE_COMPILER = 'build/closure_compiler/sscompiler.jar',
    CLOSURE_BUILDER  = 'closure-bin/build/closurebuilder.py';

/**
 * Run the build task.
 *
 * We require the mantri configuration file that bootstraps the web.
 *
 * We expect to find there information about how to perform the build.
 *
 * After we are satisfied with what we collect we start the build process.
 */
build.build = function( cb, target, confFile, optDest, optOptions ) {
  // cast to string
  confFile = confFile + '';
  // reset internals

  //
  //
  // Read and validate the web config file
  //
  //
  // require the config file. Flow continues at start() function.
  var webConfig = grunt.file.readJSON(confFile);

  // bundle all option files
  var options = {
    target: target,
    webConfig: webConfig,
    dest: optDest,
    buildOpts: optOptions
  };

  if (! build.validate( options )) {
    // error messages sent by validate
    cb( false );
    return;
  }

  options._tmpDir      = new Tempdir();
  options.googMock     = options._tmpDir.path + '/' + build.GOOG_BASE_FILE;
  options.jsDirFrag    = path.dirname( webConfig.build.input );
  options.documentRoot = path.dirname( confFile );
  // resolve what the source and dest will be for the builder
  options.jsRoot       = path.join( options.documentRoot, options.jsDirFrag );


  //
  //
  // Create the temp google closure mock dir and file
  //
  //
  if ( !build._createGoogleMock( options ) ) {
    options._tmpDir.rmdir();
    cb( false );
    return;
  }

  //
  //
  // Resolve and append all third party dependencies
  // to google closure mock file.
  //
  //
  if ( !build._appendVendorLibs( options ) ) {
    options._tmpDir.rmdir();
    cb ( false );
    return;
  }


  //
  //
  // Prepare the options for the closureBuilder task.
  //
  //
  var src = [ options.jsRoot ];
  src.push( options._tmpDir.path );
  var cToolsOptions = {
    builder: CLOSURE_BUILDER,
    inputs: path.dirname( confFile ) + '/' + webConfig.build.input,
    compile: true,
    compilerFile: CLOSURE_COMPILER,
    compilerOpts: {
      compilation_level: 'SIMPLE_OPTIMIZATIONS',
      warning_level: 'QUIET',
      // go wild here, name every exception in the book to be ignored
      // WE BE NO SCARE HAXORShh
      jscomp_off: cTools.closureOpts.compiler.jscomp_off
    }
  };
  var cToolsFileObj = {
    src: src,
    dest: optDest || webConfig.build.dest
  };

  var command = cTools.builder.createCommand( cToolsOptions, cToolsFileObj );
  if ( !command ) {
    cTools.helpers.log.error('Create shell command failed for builder');
    options._tmpDir.rmdir();
    cb( false );
    return;
  }

  //
  //
  // Run the command.
  //
  //
  var commands = [ {cmd: command, dest: target} ];

  cTools.helpers.runCommands( commands, function( status ) {
    options._tmpDir.rmdir();
    cb( status );
  } , true);

};

/**
 * Create the temp google closure mock dir and file.
 *
 * @param  {Object} options The options object.
 * @return {boolean} success or fail.
 */
build._createGoogleMock = function( options ) {

  // write the mock goog base file in the temp dir.
  var contents = 'var goog = goog || {}; // Identifies this file as the Closure base.\n';
  grunt.file.write( options.googMock , contents) ;

  return true;
};

/**
 * Will resolve all third party dependencies and concatenate them at the end
 * of the goog base file mock.
 *
 * @param  {Object} options The options object
 * @return {boolean} operation success or fail.
 */
build._appendVendorLibs = function( options ) {
  var webConfig = options.webConfig;

  if ( !__.isObject( webConfig.paths ) ) {
    return true;
  }

  var vendorRoot = options.documentRoot;

  // check if baseUrl is there
  if ( __.isString( webConfig.baseUrl ) ) {
    vendorRoot = path.join( vendorRoot, webConfig.baseUrl );
  }

  //
  // Go through all the vendor dependencies and create an
  // array of proper paths.
  //
  var exclude = webConfig.build.exclude || [],
      vendorFile, // string, the current vendor file.
      fileSrc = '';
  for ( var lib in webConfig.paths ) {
    if ( 0 <= exclude.indexOf( lib ) ) {
      continue;
    }

    vendorFile = vendorRoot + webConfig.paths[lib] + '.js';

    if ( !grunt.file.isFile( vendorFile ) ) {
      cTools.helpers.log.error('Could not find third party library: ' + vendorFile.red);
      return false;
    }

    fileSrc = grunt.file.read( vendorFile );
    fs.appendFileSync( options.googMock, fileSrc );
  }

  return true;
};

/**
 * Validate the options passed to us from all sources.
 *
 * @param  {Object} options [description]
 * @return {boolean}        [description]
 */
build.validate = function( options ) {
  if ( !__.isObject( options.webConfig.build ) ) {
    cTools.helpers.log.error('There is no \'build\' key in your mantriConf file.');
    return false;
  }

  if ( !__.isString( options.webConfig.build.input ) ) {
    cTools.helpers.log.error('There is no \'build.input\' key in your mantriConf file.');
    return false;
  }

  return true;
};


module.exports = build;