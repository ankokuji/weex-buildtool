'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Promise = require('bluebird'),
    inquirer = require('inquirer'),
    devicesList = require('./devices-list'),
    debug = require('debug')('devices');

function simulatorSelect(currentDeviceParam, device, params) {
  return new Promise(function (resolve, reject) {
    if (currentDeviceParam) {
      resolve(currentDeviceParam);
      return;
    }
    console.log(2);

    devicesList(device, params).then(function (device) {
      debug((0, _stringify2.default)(device.devices, null, 2));
      // 选择模拟器
      return selectDevices(device, params).then(resolve);
    }, function (err) {
      reject(err);
    });
  });
}

function selectDevices(device, params, callback) {
  var currentDevice, defaultType;
  // 过滤设备
  var devicesType = selected(device.devicesType, ['iPhone 4s', 'iPhone 5', 'iPhone 5s', 'iPhone 6s', 'iPhone 6', 'iPhone 6 Plus', 'iPhone 6s', 'iPhone 6s Plus', 'iPad Air', 'iPad 2']);

  for (var i = 0; i < devicesType.length; i++) {

    if (devicesType[i].indexOf('iPhone 5s') > -1) {
      defaultType = devicesType[i];
      break;
    }
  }

  var questions = [{
    'type': 'list',
    'name': 'type',
    'choices': devicesType,
    'message': '请选择设备类型创建模拟器',
    'default': defaultType || ''
  }];

  return inquirer.prompt(questions).then(function (answers) {
    currentDevice = device.devices[answers.type];
    return currentDevice || {};
  });
}

function selected(devicesType, names) {
  var tempDevices = [],
      i = 0,
      j = 0;

  for (; i < devicesType.length; i++) {
    for (j = 0; j < names.length; j++) {
      if (devicesType[i].split(' (')[0] == names[j]) {
        tempDevices.push(devicesType[i]);
      }
    }
  }
  return tempDevices;
}

module.exports = simulatorSelect;