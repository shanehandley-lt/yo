'use strict';
const {namespaceToName} = require('yeoman-environment');

module.exports = async (app, name) => {
  const baseName = namespaceToName(name);
  app.insight.track('yoyo', 'run', baseName);

  console.log(
    '\nMake sure you are in the directory you want to scaffold into.' +
    '\nThis generator can also be run with: ' +
    `yo ${baseName}\n`
  );

  // Save the generator run count
  const generatorRunCount = app.conf.get('generatorRunCount');
  generatorRunCount[baseName] = generatorRunCount[baseName] + 1 || 1;
  app.conf.set('generatorRunCount', generatorRunCount);
  return app.env.run(name);
};
