'use strict';
const inquirer = require('inquirer');
const spawn = require('cross-spawn');

const successMessage = 'I\'ve just updated your generators. Remember, you can update\na specific generator with npm by running:\n' +
  '\n    npm install -g generator-_______';

function updateSuccess(app) {
  console.log(`\n${successMessage}\n`);
  app.env.lookup();
  app.updateAvailableGenerators();
  app.navigate('home');
}

function updateGenerators(app, pkgs) {
  spawn('npm', ['install', '--global', ...pkgs], {stdio: 'inherit'})
    .on('close', updateSuccess.bind(null, app));
}

module.exports = app => {
  return inquirer.prompt([{
    name: 'generators',
    message: 'Generators to update',
    type: 'checkbox',
    validate(input) {
      return input.length > 0 ? true : 'Please select at least one generator to update.';
    },
    choices: Object.keys(app.generators || {}).map(key => {
      return {
        name: app.generators[key].name,
        checked: true
      };
    })
  }]).then(answer => {
    updateGenerators(app, answer.generators);
  });
};
