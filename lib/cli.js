#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const meow = require('meow');
const list = require('cli-list');
const pkg = require('../package.json');
const Router = require('./router');

const gens = list(process.argv.slice(2));

// Override http networking to go through a proxy ifone is configured
const MAJOR_NODEJS_VERSION = Number.parseInt(process.version.slice(1).split('.')[0], 10);

if (MAJOR_NODEJS_VERSION >= 10) {
  // `global-agent` works with Node.js v10 and above.
  require('global-agent').bootstrap();
} else {
  // `global-tunnel-ng` works only with Node.js v10 and below.
  require('global-tunnel-ng').initialize();
}

const cli = gens.map(gen => {
  const minicli = meow({autoHelp: false, autoVersion: true, pkg, argv: gen});
  const options = minicli.flags;
  const args = minicli.input;

  // Add un-camelized options too, for legacy
  // TODO: Remove some time in the future when generators have upgraded
  for (const key of Object.keys(options)) {
    const legacyKey = key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
    options[legacyKey] = options[key];
  }

  return {opts: options, args};
});

const firstCmd = cli[0] || {opts: {}, args: {}};
const cmd = firstCmd.args[0];

function createGeneratorList(env) {
  const generators = Object.keys(env.getGeneratorsMeta()).reduce((namesByGenerator, generator) => {
    const parts = generator.split(':');
    const generatorName = parts.shift();

    // If first time we found this generator, prepare to save all its sub-generators
    if (!namesByGenerator[generatorName]) {
      namesByGenerator[generatorName] = [];
    }

    // If sub-generator (!== app), save it
    if (parts[0] !== 'app') {
      namesByGenerator[generatorName].push(parts.join(':'));
    }

    return namesByGenerator;
  }, {});

  if (Object.keys(generators).length === 0) {
    return '  Couldn\'t find any generators, did you install any? Troubleshoot issues by running\n\n  $ yo doctor';
  }

  return Object.keys(generators).map(generator => {
    const subGenerators = generators[generator].map(subGenerator => `    ${subGenerator}`).join('\n');
    return `  ${generator}\n${subGenerators}`;
  }).join('\n');
}

const onError = error => {
  console.error('Error', process.argv.slice(2).join(' '), '\n');
  console.error(firstCmd.opts.debug ? error.stack : error.message);
  process.exit(error.code || 1);
};

function init() {
  const env = require('yeoman-environment').createEnv();

  // Lookup for every namespaces, within the environments.paths and lookups
  env.lookup(firstCmd.opts.localOnly || false);
  const generatorList = createGeneratorList(env);

  // List generators
  if (firstCmd.opts.generators) {
    console.log('Available Generators:\n\n' + generatorList);
    env.emit('finished');
    return;
  }

  // Start the interactive UI if no generator is passed
  if (!cmd) {
    if (firstCmd.opts.help) {
      const usageText = fs.readFileSync(path.join(__dirname, 'usage.txt'), 'utf8');
      console.log(`${usageText}\nAvailable Generators:\n\n${generatorList}`);
      env.emit('finished');
      return;
    }

    runYo(env).catch(error => onError(error));
    return;
  }

  // More detailed error message
  // If users type in generator name with prefix 'generator-'
  if (cmd.startsWith('generator-')) {
    const generatorName = cmd.replace('generator-', '');
    const generatorCommand = 'yo ' + generatorName;

    console.log('Installed generators don\'t need the "generator-" prefix.');
    console.log(`In the future, run ${generatorCommand} instead!\n`);

    env.run(generatorName, firstCmd.opts).catch(error => onError(error));

    return;
  }

  // Note: at some point, nopt needs to know about the generator options, the
  // one that will be triggered by the below args. Maybe the nopt parsing
  // should be done internally, from the args.
  for (const gen of cli) {
    env.run(gen.args, gen.opts).catch(error => onError(error));
  }
}

function runYo(env) {
  const router = new Router(env);
  router.registerRoute('help', require('./routes/help'));
  router.registerRoute('run', require('./routes/run'));
  router.registerRoute('install', require('./routes/install'));
  router.registerRoute('exit', require('./routes/exit'));
  router.registerRoute('clearConfig', require('./routes/clear-config'));
  router.registerRoute('home', require('./routes/home'));

  process.once('exit', router.navigate.bind(router, 'exit'));

  return router.navigate('home');
}

init();
