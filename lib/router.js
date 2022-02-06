'use strict';
const Configstore = require('configstore');

/**
 * The router is in charge of handling `yo` different screens.
 * @constructor
 * @param  {Environment} env A yeoman environment instance
 * @param  {Configstore} [conf] An optional config store instance
 */
class Router {
  constructor(env, conf) {
    const pkg = require('../package.json');
    this.routes = {};
    this.env = env;
    this.conf = conf || new Configstore(pkg.name, {
      generatorRunCount: {}
    });
  }

  /**
   * Navigate to a route
   * @param  {String} name Route name
   * @param  {*}      arg  A single argument to pass to the route handler
   * @return  {Promise} Promise this.
   */
  navigate(name, arg) {
    if (typeof this.routes[name] === 'function') {
      return this.routes[name].call(null, this, arg).then(() => this);
    }

    throw new Error(`No routes called: ${name}`);
  }

  /**
   * Register a route handler
   * @param {String}   name    Name of the route
   * @param {Function} handler Route handler
   */
  registerRoute(name, handler) {
    this.routes[name] = handler;
    return this;
  }
}

module.exports = Router;
