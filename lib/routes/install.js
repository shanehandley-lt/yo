'use strict';
const _ = require('lodash');
const async = require('async');
const inquirer = require('inquirer');
const spawn = require('cross-spawn');
const sortOn = require('sort-on');
const figures = require('figures');
const npmKeyword = require('npm-keyword');
const packageJson = require('package-json');
const got = require('got');

const OFFICIAL_GENERATORS = new Set([
  'generator-angular',
  'generator-backbone',
  'generator-bootstrap',
  'generator-chrome-extension',
  'generator-chromeapp',
  'generator-commonjs',
  'generator-generator',
  'generator-gruntplugin',
  'generator-gulp-webapp',
  'generator-jasmine',
  'generator-jquery',
  'generator-karma',
  'generator-mobile',
  'generator-mocha',
  'generator-node',
  'generator-polymer',
  'generator-webapp'
]);

module.exports = app => {
  return inquirer.prompt([{
    name: 'searchTerm',
    message: 'Search npm for generators:'
  }]).then(answers => searchNpm(app, answers.searchTerm));
};

const generatorMatchTerm = (generator, term) => `${generator.name} ${generator.description}`.includes(term);
const getAllGenerators = _.memoize(() => npmKeyword('yeoman-generator'));

function searchMatchingGenerators(app, term, cb) {
  function handleDenyList(denyList) {
    const installedGenerators = app.env.getGeneratorNames();

    getAllGenerators().then(allGenerators => {
      cb(null, allGenerators.filter(generator => {
        if (denyList.includes(generator.name)) {
          return false;
        }

        if (installedGenerators.includes(generator.name)) {
          return false;
        }

        return generatorMatchTerm(generator, term);
      }));
    }, cb);
  }

  got('http://yeoman.io/blacklist.json', {json: true})
    .then(response => handleDenyList(response.body))
    .catch(() => handleDenyList([]));
}

function fetchGeneratorInfo(generator, cb) {
  packageJson(generator.name, {fullMetadata: true}).then(pkg => {
    const official = OFFICIAL_GENERATORS.has(pkg.name);
    const mustache = official ? ` ${figures.mustache} ` : '';

    cb(null, {
      name: generator.name.replace(/^generator-/, '') + mustache + ' ' + pkg.description,
      value: generator.name,
      official: -official
    });
  }).catch(cb);
}

function searchNpm(app, term) {
  const promise = new Promise((resolve, reject) => {
    searchMatchingGenerators(app, term, (error, matches) => {
      if (error) {
        reject(error);
        return;
      }

      async.map(matches, fetchGeneratorInfo, (error2, choices) => {
        if (error2) {
          reject(error2);
          return;
        }

        resolve(choices);
      });
    });
  });

  return promise.then(choices => promptInstallOptions(app, sortOn(choices, ['official', 'name'])));
}

function promptInstallOptions(app, choices) {
  let introMessage = 'Sorry, no results matches your search term';

  if (choices.length > 0) {
    introMessage = 'Here\'s what I found. Official generator → ' + figures.mustache + '\n  Install one?';
  }

  const resultsPrompt = [{
    name: 'toInstall',
    type: 'list',
    message: introMessage,
    choices: [...choices, {
      name: 'Search again',
      value: 'install'
    }, {
      name: 'Return home',
      value: 'home'
    }]
  }];

  return inquirer.prompt(resultsPrompt).then(answer => {
    if (answer.toInstall === 'home' || answer.toInstall === 'install') {
      return app.navigate(answer.toInstall);
    }

    installGenerator(app, answer.toInstall);
  });
}

function installGenerator(app, pkgName) {
  return spawn('npm', ['install', '--global', pkgName], {stdio: 'inherit'})
    .on('error', error => {
      throw error;
    })
    .on('close', () => {
      console.log(
        '\nI just installed a generator by running:\n' +
        '\n    npm install -g ' + pkgName + '\n'
      );

      app.env.lookup();
      app.navigate('home');
    });
}
