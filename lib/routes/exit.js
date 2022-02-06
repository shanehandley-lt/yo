'use strict';

module.exports = () => {
  const PADDING = 5;
  const url = 'http://yeoman.io';
  const maxLength = url.length + PADDING;
  const newLine = ' '.repeat(maxLength);

  console.log(
    'Bye from us!' +
    newLine +
    'Chat soon.' +
    newLine +
    'Yeoman team ' + url,
    {maxLength}
  );
};
