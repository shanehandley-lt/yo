'use strict';
const path = require('path');
const assert = require('assert');
const _ = require('lodash');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const helpers = require('./helpers');

const Router = proxyquire('../lib/router', {
  'read-pkg-up': {
    sync(options) {
      // Turn `/phoenix/app` into `phoenix-app`
      const name = options.cwd.split(path.sep).filter(chunk => Boolean(chunk)).join('-');
      return {
        packageJson: {
          name,
          version: '0.1.0'
        }
      };
    }
  }
});

describe('Router', () => {
  beforeEach(function () {
    this.env = helpers.fakeEnv();
    this.env.getGeneratorsMeta = sinon.stub();
    this.router = new Router(this.env);
  });

  describe('#registerRoute()', () => {
    it('is chainable', function () {
      assert.strictEqual(this.router.registerRoute('foo', _.noop), this.router);
    });
  });

  describe('#navigate()', () => {
    beforeEach(function () {
      this.route = sinon.stub().returns(Promise.resolve());
      this.router.registerRoute('foo', this.route);
    });

    it('call a route passing router as first argument', async function () {
      await this.router.navigate('foo');
      sinon.assert.calledWith(this.route, this.router);
      sinon.assert.calledOnce(this.route);
    });

    it('call a route passing arguments', function () {
      this.router.navigate('foo', 'dummy');
      sinon.assert.calledWith(this.route, this.router, 'dummy');
      sinon.assert.calledOnce(this.route);
    });

    it('throws on invalid route name', function () {
      assert.throws(this.router.navigate.bind(this.route, 'invalid route name'));
    });
  });
});
