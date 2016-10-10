#!/usr/bin/env node

var fs = require('fs');
var ini = require('ini');

var CONFIG_FILE_NAME = '.gerrit.ini';
var CONFIG_FILE_PATH = process.env['HOME'] + '/' + CONFIG_FILE_NAME;

var DEFAULT_TEMPLATE = ';[profile_name]\n'
                     + ';server = server_url_or_ip\n'
                     + ';port = 29418\n'
                     + ';user = user_id';

function parseConfig() {
  try {
    fs.accessSync(CONFIG_FILE_PATH, fs.R_OK);
    var config = ini.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf-8'));
    return config;
  } catch (e) {
    console.log(CONFIG_FILE_PATH + ' is not found.');
    fs.writeFileSync(CONFIG_FILE_PATH, DEFAULT_TEMPLATE);
    console.log('Please edit ' + CONFIG_FILE_PATH);
    process.exit(1);
  }
}

function printUsage() {
  console.log(
      'Usage: gerrit -P {profile} <command> ...\n\n' +
      'where <command> is one of :\n' +
      '    ls, search, src, clone, push\n\n' +
      'gerrit ls                - list of all available projects on gerrit host\n' +
      'gerrit search {keyword}  - search project with keyword\n' +
      'gerrit src|clone {path}  - clone a project within the available projects\n' +
      'gerrit push {branch}     - push current patch to the branch in review'
    );
}

function exec(cmd, args) {
  var exec_cmd = cmd + ' ' + args.join(' ');
  var out = require('child_process').execSync(exec_cmd, {encoding: 'utf-8'});
  return out;
}

function gerrit_list(config) {
  var out = exec('ssh', ['-p', config[profile].port,
                         config[profile].user + '@' + config[profile].host,
                        '\'gerrit ls-projects\'']);
  return out;
}

// Parsing config file
//  1. if no the config file, create a empty config file with pre-defined templated contents.
//     And, print guide message to edit the config file.
//  2. if no valid item in the config file, print error message.

// Parsing arguments
// gerrit [-P {profile}] ls|search|src|clone|push [...]


var argv = require('minimist')(process.argv.slice(2));
var config = parseConfig();

// Check profile
var profileList = Object.keys(config);
if (profileList.length === 0) {
  console.log('No available profile in ' + CONFIG_FILE_PATH);
  process.exit(1);
}

var profile = argv['P'];
if (typeof profile !== 'string') {
  profile = profileList[0];
  console.log('Profile is not set. Default profile [' + profile + '] is used.');
}

if (profileList.indexOf(profile) < 0) {
  console.log('Profile [' + profile + '] is not found in ' + CONFIG_FILE_PATH);
  process.exit(1);
}

// Command
var command = argv['_'][0];
if (command === 'ls') {
  console.log(gerrit_list(config));
} else if (command === 'search') {
  var keyword = argv['_'][1];
  if (!keyword) {
    console.error('Err: keyword is not set.');
    printUsage();
    process.exit(1);
  }
  var out = gerrit_list(config);
  out.split('\n').forEach(function(item) {
    if (item.indexOf(keyword) > -1) {
      console.log(item);
    }
  });
} else if (command === 'src' || command === 'clone') {

  exec('git', ['clone', 'ssh://' + config[profile].user_id + '@' + config[profile].host + ':' + config[profile].port + '/' + project]);

  console.log('!! src');
} else {
  printUsage();
  process.exit(1);
}
