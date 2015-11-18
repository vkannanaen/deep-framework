'use strict';

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import {Resource} from '../lib.compiled/Resource';
import {Instance as ResourceInstance} from '../lib.compiled/Resource/Instance';
import {Action} from '../lib.compiled/Resource/Action';
import {MissingResourceException} from '../lib.compiled/Exception/MissingResourceException';
import {MissingActionException} from '../lib.compiled/Resource/Exception/MissingActionException';
import {InvalidDeepIdentifierException} from '../node_modules/deep-kernel/lib.compiled/Exception/InvalidDeepIdentifierException';
import {Instance} from '../node_modules/deep-kernel/lib.compiled/Microservice/Instance';
import Kernel from 'deep-kernel';
import Cache from 'deep-cache';
import Security from 'deep-security';
import KernelFactory from './common/KernelFactory';

chai.use(sinonChai);

suite('Resource', function() {
  let microserviceIdentifier = 'hello.world.example';
  let microserviceInstance = null;
  let resource = null;
  let resourceName = 'sample';
  let actionName = 'say-hello';
  let backendKernelInstance = null;

  test('Class Resource exists in Resource', function() {
    chai.expect(typeof Resource).to.equal('function');
  });

  test('Load Kernel by using Kernel.load()', function(done) {
    let callback = (backendKernel) => {
      chai.assert.instanceOf(
        backendKernel, Kernel, 'backendKernel is an instance of Kernel');

      backendKernelInstance = backendKernel;
      resource = backendKernel.get('resource');

      chai.assert.instanceOf(
        resource, Resource, 'resource is an instance of Resource'
      );

      // complete the async
      done();
    };

    KernelFactory.create({
      Cache: Cache,
      Security: Security,
      Resource: Resource,
    }, callback);
  });

  test('Check constructor sets _resources', function() {
    chai.expect(Object.keys(resource._resources)).to.be.eql(
      ['hello.world.example', 'deep.ng.root']
    );
  });

  test('Check has() method returns false for invalid microservice identifier', function() {
    microserviceInstance = backendKernelInstance.microservice(microserviceIdentifier);
    resource.bind(microserviceInstance);

    chai.expect(resource.has('invalid_res_identifier')).to.be.equal(false);
  });

  test('Check has() method returns true', function() {
    chai.expect(resource.has(resourceName)).to.be.equal(true);
  });

  test(
    'Check get() method returns valid object for valid microservice identifier + resource',
    function() {
      let actualResult = resource.get(
        `@${microserviceIdentifier}:${resourceName}`
      );

      chai.assert.instanceOf(
        actualResult, ResourceInstance, 'result is an instance of ResourceInstance');
      chai.expect(actualResult.name).to.be.equal(resourceName);
      chai.expect(Object.keys(actualResult._rawActions)).to.be.eql(
        ['say-hello', 'say-bye', 'say-test']
      );
    }
  );

  test(
    'Check get() method returns valid object for valid microservice identifier + resource + action',
    function() {
      let actualResult = resource.get(
        `@${microserviceIdentifier}:${resourceName}:${actionName}`
      );

      chai.assert.instanceOf(
        actualResult, Action, 'result is an instance of Action');
      chai.expect(actualResult.name).to.be.equal(actionName);
    }
  );

  test(
    'Check get() method throws "InvalidDeepIdentifierException" for invalid microservice identifier',
    function() {
      let error = null;

      try {
        resource.get(`@invalid_microservice_identifier`);
      } catch (e) {
        error = e;
      }

      chai.assert.instanceOf(
        error, InvalidDeepIdentifierException, 'error is an instance of InvalidDeepIdentifierException'
      );
    }
  );

  test('Check get() method throws "MissingResourceException" exception for invalid resource',
    function() {
      let error = null;

      try {
        resource.get(`@${microserviceIdentifier}:invalid_resource_name`);
      } catch (e) {
        error = e;
      }

      chai.assert.instanceOf(
        error, MissingResourceException, 'error is an instance of MissingResourceException'
      );
    }
  );

  test('Check get() method throws "MissingResourceException" exception for invalid action',
    function() {
      let error = null;

      try {
        resource.get(`@${microserviceIdentifier}:${resourceName}:invalidAction`);
      } catch (e) {
        error = e;
      }

      chai.assert.instanceOf(
        error, MissingActionException, 'error is an instance of MissingActionException'
      );
    }
  );

  test('Check list() getter returns', function() {
    let actualResult = resource.list;
    let expectedResult = {
      'deep.ng.root': [],
      'hello.world.example': [
        'sample',
      ],
    };
    chai.expect(actualResult).to.be.eql(expectedResult);
  });

  test('Check boot() method', function() {
    let spyCallback = sinon.spy();

    resource.boot(backendKernelInstance, spyCallback);

    chai.expect(spyCallback).to.have.been.calledWithExactly();
    chai.assert.instanceOf(
      resource._resources[microserviceIdentifier].sample,
      ResourceInstance,
      'item is an instance of ResourceInstance'
    );
  });
});
