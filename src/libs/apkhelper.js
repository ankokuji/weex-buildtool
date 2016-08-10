'use strict';
require('colors');
const path = require('path');
const childProcess = require('child_process');
const fs = require('fs-extra');
// const Promise = require('bluebird');
const crypto = require('crypto');

/**
 * 检查 Android SDK 安装情况
 * 若缺少则自动安装
 * 依赖 Android SDK，并须添加环境变量 ANDROID_SDK
 */
export function checkSDK() {
  process.stdout.write('检查 Android SDK...'.green);

  return new Promise((resolve, reject) => {

    let sdkPath = process.env.ANDROID_HOME;
    if (sdkPath) {
      console.info('已安装'.green);

      let lack = [];
      if (!fs.existsSync(path.resolve(sdkPath, 'platforms/android-24'))) {
        lack.push('android-24');
      }
      if (!fs.existsSync(path.resolve(sdkPath, 'build-tools/24.0.1'))) {
        lack.push('build-tools-24.0.1');
      }
      if (lack.length) {
        console.info('检测到以下内容尚未安装：'.yellow);
        console.info('');
        for (let item of lack) {
          console.info(`    * ${item}`);
        }
        console.info('');
        console.info('程序将自动安装...'.yellow);
        resolve(installSDK(lack));
      } else {
        resolve();
      }
    } else {
      console.info(`未找到 Android SDK，请确定其已经正确安装并添加到系统环境变量，详见 http://xxxxx `.red);
      reject();
    }

  });

}

/**
 * 自动安装缺少的sdk
 * 依赖 Android SDK，并须添加环境变量 ANDROID_SDK
 * @param  {Array} lack 缺少的SDK名称
 * @return {Promise}
 */
export function installSDK(lack) {
  lack = lack.join(',');
  return new Promise((resolve, reject) => {
    let android = childProcess.exec(`android update sdk --no-ui --all --filter ${lack}`);
    android.stdout.on('data', data => process.stdout.write(data.grey));
    android.stderr.on('data', data => process.stdout.write(data.red));
    android.stdin.pipe(process.stdin);
    android.on('close', code => {
      if (code) {
        console.info('安装遇到错误'.red);
        reject();
      } else {
        console.info('SDK 安装完成'.green);
        resolve();
      }
    });
    android.stdin.write('y\n');
  })
}

function getMd5(p){
	var str = fs.readFileSync(p,'utf-8');
	var md5um = crypto.createHash('md5');
	md5um.update(str);
	return md5um.digest('hex');
}

/**
 * 同步工程目录的文件到构建目录, 在修改配置之前执行
 * @param  {absolutePath} projectPath [description]
 * @param  {absolutePath} buildPath   [description]
 * @param  {String | RegExp} excludes    [description]
 * @return {Promise}             [description]
 */
export function sync(projectPath, buildPath, excludes) {
  process.stdout.write('生成构建目录...\n'.green);
  fs.ensureDirSync(buildPath);
  let buildFileInfo = new Map();
  let projectFileInfo = new Map();
  process.stdout.write('读取目录信息...'.grey);
  return new Promise((resolve, reject) => {
    fs.walk(buildPath)
    .on('data', item => {
      if (item.stats.isFile()) {
        buildFileInfo.set(path.relative(buildPath, item.path), getMd5(item.path));
      } else if (item.stats.isDirectory()) {
        buildFileInfo.set(path.relative(buildPath, item.path), 'dir');
      }
    })
    .on('end', resolve);
  })
  .then(() => {
    return new Promise((resolve, reject) => {
      fs.walk(projectPath)
      .on('data', item => {
        if (item.stats.isFile()) {
          projectFileInfo.set(path.relative(projectPath, item.path), getMd5(item.path));
        } else if (item.stats.isDirectory()) {
          projectFileInfo.set(path.relative(projectPath, item.path), 'dir');
        }
      })
      .on('end', resolve);
    });
  })
  .then(() => {
    process.stdout.write('done\n'.grey);
    let buildKeys = buildFileInfo.keys();
    for (let key of buildKeys) {
      if (!projectFileInfo.has(key)) {
        let absolutePath = path.resolve(buildPath, key);
        process.stdout.write(`  remove: ${absolutePath}\n`.grey);
        fs.removeSync(absolutePath);
      }
    }
  })
  .then(() => {
    for (let [key, md5] of projectFileInfo) {
      let buildItem = buildFileInfo.get(key);
      if (buildItem !== md5) {
        let absolutePath = path.resolve(buildPath, key);
        process.stdout.write(`  copy: ${absolutePath}\n`.grey);
        fs.copySync(path.resolve(projectPath, key), absolutePath);
      }
    }
    process.stdout.write('完成\n'.green);
  })
}

/**
 * 打包特定目录下的 Android 工程
 * @param  {absolutePath} buildPath [description]
 * @param  {Boolean} release   是否为发布版，默认为 Debug 版
 * @return {[type]}           [description]
 */
export function pack(buildPath, release) {
  console.info('准备生成APK...'.green);
  return checkSDK()

  .then(() => {
    let arg = release ? 'assembleRelease' : 'assembleDebug';

    return new Promise((resolve, reject) => {

      console.info('正在启动 Gradle...'.green);

      let gradlew = childProcess.execFile(path.join(buildPath,
        `gradlew${process.platform === 'win32' ? '.bat' : ''}`), [arg],
        {cwd: buildPath});

      gradlew.stdout.on('data', data => process.stdout.write(data.grey));
      gradlew.stderr.on('data', data => process.stdout.write(data.red));

      gradlew.on('close', code => {
        if (code) {
          console.info('APK 生成遇到错误'.red);
          reject();
        } else {
          console.info('Android 打包完成'.green);
          console.info('生成的文件位于：'.yellow,
            path.resolve(buildPath, 'app/build/outputs/apk/'));
          resolve();
        }
      });

    });

  });
}
