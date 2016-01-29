/**
 * Created by Stefan Hariton on 6/26/15.
 */

'use strict';

import UndefinedMethodException from './Exceptions/UndefinedMethodException';
import util from 'util';

/**
 * Extends standard Vogels models
 */
export class ExtendModel {
  /**
   * @param {Object} model
   */
  constructor(model) {
    this._model = model;

    this._logService = null;
  }

  /**
   * @returns {Object}
   */
  get logService() {
    return this._logService;
  }

  /**
   * @param {Object} logService
   */
  set logService(logService) {
    this._logService = logService;
  }

  /**
   * @returns {Object}
   */
  get model() {
    return this._model;
  }

  /**
   * @returns {Number}
   */
  static get DEFAULT_LIMIT() {
    return 10;
  }

  /**
   * @returns {number}
   */
  static get DEFAULT_SEGMENTS_NUMBER() {
    return 4;
  }

  /**
   * Makes filterExpression, filtersExpressionValues and filterExpressionNames from an object, that are used to make
   * a DynamoDb scan
   *
   * @param {Object} params
   * @returns {Object}
   */
  static buildScanParameters(params) {
    let filterExpression = '';
    let filterExpressionValues = {};
    let filterExpressionNames = {};
    let first = true;

    for (let key in params) {
      if (!params.hasOwnProperty(key)) {
        continue;
      }

      let fieldValue = params[key];

      let fieldName = `#${key}`;
      let fieldValueName = `:${key}`;

      if (!first) {
        filterExpression += ' AND ';
      }

      filterExpression += `${fieldName} = ${fieldValueName}`;
      filterExpressionValues[fieldValueName] = fieldValue;
      filterExpressionNames[fieldName] = key;
      first = false;
    }

    return {
      filterExpression: filterExpression,
      filterExpressionValues: filterExpressionValues,
      filterExpressionNames: filterExpressionNames,
    };
  }

  /**
   * @returns {Object}
   */
  get methods() {
    let _this = this;

    return {
      findAll: function(cb) {
        _this._logRumEvent({ eventName: 'findAll' });

        return _this.model.scan().loadAll().exec((error, model) => {
          _this._extendedCallback('findAll', error, model, cb);
        });
      },

      findAllPaginated: function(startKey, limit, cb) {
        _this._logRumEvent({
          eventName: 'findAllPaginated',
          payload: {startKey, limit},
        });

        return _this.model
          .scan()
          .startKey(startKey)
          .limit(limit)
          .exec((error, model) => {
            _this._extendedCallback('findAllPaginated', error, model, cb);
          });
      },

      findOneById: function(id, cb) {
        _this._logRumEvent({
          eventName: 'findOneById',
          payload: {id},
        });

        return _this.model.get(id, (error, model) => {
          _this._extendedCallback('findOneById', error, model, cb);
        });
      },

      findOneBy: function(fieldName, value, cb) {
        return _this.model
          .scan()
          .where(fieldName).equals(value)
          .limit(1)
          .exec(cb);
      },

      findBy: function(fieldName, value, cb, limit = ExtendModel.DEFAULT_LIMIT) {
        return _this.model
          .scan()
          .where(fieldName).equals(value)
          .limit(limit)
          .exec(cb);
      },

      findAllBy: function(fieldName, value, cb) {
        return _this.model
          .scan()
          .where(fieldName).equals(value)
          .loadAll()
          .exec(cb);
      },

      findAllByPaginated: function(fieldName, value, startKey, limit, cb) {
        return _this.model
          .scan()
          .where(fieldName).equals(value)
          .startKey(startKey)
          .limit(limit)
          .exec(cb);
      },

      findMatching: function(params, cb, limit = ExtendModel.DEFAULT_LIMIT) {
        let scanParams = ExtendModel.buildScanParameters(params);

        return _this.model
          .scan()
          .filterExpression(scanParams.filterExpression)
          .expressionAttributeValues(scanParams.filterExpressionValues)
          .expressionAttributeNames(scanParams.filterExpressionNames)
          .limit(limit)
          .exec(cb);
      },

      findOneMatching: function(params, cb) {
        let scanParams = ExtendModel.buildScanParameters(params);

        return _this.model
          .scan()
          .filterExpression(scanParams.filterExpression)
          .expressionAttributeValues(scanParams.filterExpressionValues)
          .expressionAttributeNames(scanParams.filterExpressionNames)
          .limit(1)
          .exec(cb);
      },

      findAllMatching: function(params, cb) {
        let scanParams = ExtendModel.buildScanParameters(params);

        return _this.model
          .scan()
          .filterExpression(scanParams.filterExpression)
          .expressionAttributeValues(scanParams.filterExpressionValues)
          .expressionAttributeNames(scanParams.filterExpressionNames)
          .loadAll()
          .exec(cb);
      },

      findAllMatchingPaginated: function(params, startKey, limit, cb) {
        let scanParams = ExtendModel.buildScanParameters(params);

        return _this.model
          .scan()
          .filterExpression(scanParams.filterExpression)
          .expressionAttributeValues(scanParams.filterExpressionValues)
          .expressionAttributeNames(scanParams.filterExpressionNames)
          .startKey(startKey)
          .limit(limit)
          .exec(cb);
      },

      deleteById: function(id, cb) {
        return _this.model.destroy(id, cb);
      },

      deleteByIdConditional: function(id, condition, cb) {
        return _this.model.destroy(id, condition, cb);
      },

      createItem: function(data, cb) {
        _this._logRumEvent({
          eventName: 'createItem',
          payload: data,
        });

        return _this.model.create(data, (error, model) => {
          _this._extendedCallback('createItem', error, model, cb);
        });
      },

      createUniqueOnFields: function(fields, data, cb) {
        let scanCb = function(err, data) {
          if (err) {
            return cb(err, data);
          }

          if (data.Count) {
            return cb(`Item like ${data} already exists`);
          }

          return _this.model.create(data, cb);
        };

        let scanParams = {};
        for (let fieldKey in fields) {
          if (!fields.hasOwnProperty(fieldKey)) {
            continue;
          }

          let field = fields[fieldKey];

          scanParams[field] = data[field];
        }

        scanParams = ExtendModel.buildScanParameters(scanParams);

        return _this.model
          .scan()
          .filterExpression(scanParams.filterExpression)
          .expressionAttributeValues(scanParams.filterExpressionValues)
          .expressionAttributeNames(scanParams.filterExpressionNames)
          .limit(1)
          .exec(scanCb);
      },

      updateItem: function(id, data, cb) {
        data.Id = id;

        return _this.model.update(data, cb);
      },

      updateItemConditional: function(id, data, condition, cb) {
        data.Id = id;

        return _this.model.update(data, condition, cb);
      },
    };
  }

  /**
   * Injects the specified methods or all
   *
   * @param {Array} methods
   */
  inject(methods = null) {
    let predefinedMethods = this.methods;
    let predefinedMethodsNames = Object.keys(predefinedMethods);

    methods = methods || predefinedMethodsNames;

    for (let methodKey in methods) {
      if (!methods.hasOwnProperty(methodKey)) {
        continue;
      }

      let methodName = methods[methodKey];

      if (!predefinedMethods.hasOwnProperty(methodName)) {
        throw new UndefinedMethodException(methodName, predefinedMethodsNames);
      }

      this._model[methodName] = predefinedMethods[methodName];
    }

    return this._model;
  }

  /**
   * @param {Object} customData
   * @returns {Boolean}
   * @private
   */
  _logRumEvent(customData) {
    if (!this.logService) {
      return false;
    }

    let event = util._extend(customData, {
      "service": "deep-db",
      "resourceType": "DynamoDB",
      "resourceId": this.model.tableName,
    });

    this.logService.rumLog(event);

    return true;
  }

  /**
   * @param {String} methodName
   * @param {Object} error
   * @param {Object} model
   * @param {Function} cb
   * @private
   */
  _extendedCallback(methodName, error, model, cb) {
    let data = null;
    if (model) {
      data = model.Items ? model.Items : model.get();
    }

    this._logRumEvent({
      eventName: methodName,
      payload: {
        error: error,
        data: data,
      }
    });

    cb(error, model);
  }
}
