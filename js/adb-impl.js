// 基于 @yume-chan/adb 的 ADB 实现
// 移除对 WebSocket 服务器的依赖，专注于 WebUSB 连接

import { AdbDaemonWebUsbDeviceManager, AdbDaemonWebUsbDevice } from '@yume-chan/adb-backend-webusb';
import { Adb } from '@yume-chan/adb';
import { Consumable, ReadableStream, WritableStream } from '@yume-chan/stream-extra';

// 全局变量
let deviceManager = null;
let currentDevice = null;
let currentAdb = null;
let currentTransport = null;

// 日志函数
function log(...args) {
    console.log('[AdbImpl]', ...args);
}

// 初始化设备管理器
async function initDeviceManager() {
    if (deviceManager) {
        return deviceManager;
    }

    try {
        deviceManager = new AdbDaemonWebUsbDeviceManager();
        log('设备管理器初始化成功');
        return deviceManager;
    } catch (error) {
        log('设备管理器初始化失败:', error);
        throw error;
    }
}

// 请求设备连接
async function requestDevice() {
    try {
        const manager = await initDeviceManager();

        // 监听设备断开事件
        manager.onDisconnected = (device) => {
            log('设备已断开:', device.serial);
            if (currentDevice === device) {
                currentDevice = null;
                currentAdb = null;
                currentTransport = null;
            }
        };

        // 获取已连接的设备
        const devices = await manager.getDevices();

        if (devices.length === 0) {
            // 没有已连接的设备，请求用户选择
            log('没有已连接的设备，请求用户选择...');
            const device = await manager.requestDevice({
                filters: [
                    { classCode: 0xff, subclassCode: 0x42, protocolCode: 0x01 },
                    { classCode: 0xff, subclassCode: 0x42, protocolCode: 0x03 }
                ]
            });
            return device;
        } else {
            log(`发现 ${devices.length} 个已连接的设备`);
            return devices[0]; // 返回第一个设备
        }
    } catch (error) {
        log('请求设备失败:', error);
        throw error;
    }
}

// 连接到设备
async function connectDevice(device) {
    try {
        log('正在连接到设备...');
        currentDevice = device;

        // 创建 ADB 连接
        const transport = await device.connect();
        currentTransport = transport;

        // 创建 ADB 实例
        currentAdb = new Adb({
            transport: transport
        });

        log('设备连接成功:', await getDeviceInfo());
        return currentAdb;
    } catch (error) {
        log('连接设备失败:', error);
        throw error;
    }
}

// 获取设备信息
async function getDeviceInfo() {
    if (!currentDevice) {
        return null;
    }

    try {
        const info = await currentDevice.getInfo();
        return `${info.product || 'Unknown'} (${info.serial})`;
    } catch (error) {
        log('获取设备信息失败:', error);
        return 'Unknown Device';
    }
}

// 执行 shell 命令
async function execShell(command) {
    if (!currentAdb) {
        throw new Error('未连接到设备');
    }

    try {
        log('执行命令:', command);
        const stream = await currentAdb.createStream(`shell:${command}`);

        const reader = stream.readable.getReader();
        const chunks = [];
        let output = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            output += new TextDecoder().decode(value);
        }

        reader.releaseLock();
        await stream.close();

        log('命令执行完成');
        return output;
    } catch (error) {
        log('命令执行失败:', error);
        throw error;
    }
}

// 安装应用
async function installApp(apkData, options = {}) {
    if (!currentAdb) {
        throw new Error('未连接到设备');
    }

    try {
        log('正在安装应用...');

        // 将 APK 数据推送到设备
        const remotePath = `/data/local/tmp/install_${Date.now()}.apk`;
        await pushFile(remotePath, apkData);

        // 构建安装命令
        let command = 'pm install';
        if (options.replace) {
            command += ' -r';
        }
        if (options.grantPermissions) {
            command += ' -g';
        }
        command += ` ${remotePath}`;

        // 执行安装
        const output = await execShell(command);

        // 清理临时文件
        await execShell(`rm ${remotePath}`);

        log('应用安装完成');
        return output;
    } catch (error) {
        log('应用安装失败:', error);
        throw error;
    }
}

// 推送文件到设备
async function pushFile(remotePath, data) {
    if (!currentAdb) {
        throw new Error('未连接到设备');
    }

    try {
        log(`推送文件到 ${remotePath}...`);

        const sync = await currentAdb.createStream('sync:');
        const writer = sync.writable.getWriter();

        // 发送 SEND 命令
        const encoder = new TextEncoder();
        const filename = remotePath.split('/').pop();

        // 发送文件头
        const header = new Uint8Array([
            ...encoder.encode('SEND'),
            ...new Uint8Array([0, 0, 0, 0]), // length (little endian)
            ...encoder.encode(`${filename},${0o644}`)
        ]);
        await writer.write(header);

        // 发送文件数据
        if (data instanceof Blob) {
            const buffer = await data.arrayBuffer();
            await writer.write(new Uint8Array(buffer));
        } else if (data instanceof ArrayBuffer) {
            await writer.write(new Uint8Array(data));
        } else if (data instanceof Uint8Array) {
            await writer.write(data);
        }

        // 发送 DONE 命令
        const done = new Uint8Array([
            ...encoder.encode('DONE'),
            ...new Uint8Array([0, 0, 0, 0]), // timestamp
            ...new Uint8Array([0, 0, 0, 0])  // length
        ]);
        await writer.write(done);

        writer.releaseLock();
        await sync.close();

        log('文件推送完成');
    } catch (error) {
        log('文件推送失败:', error);
        throw error;
    }
}

// 获取已安装应用列表
async function getInstalledPackages(options = {}) {
    if (!currentAdb) {
        throw new Error('未连接到设备');
    }

    try {
        let command = 'pm list packages';
        if (!options.includeSystem) {
            command += ' -3';
        }

        const output = await execShell(command);

        // 解析包名
        const packages = output
            .split('\n')
            .filter(line => line.startsWith('package:'))
            .map(line => line.substring(8));

        return packages;
    } catch (error) {
        log('获取应用列表失败:', error);
        throw error;
    }
}

// 启动应用
async function startActivity(packageName, activityName) {
    if (!currentAdb) {
        throw new Error('未连接到设备');
    }

    try {
        const command = `am start -n ${packageName}/${activityName}`;
        return await execShell(command);
    } catch (error) {
        log('启动应用失败:', error);
        throw error;
    }
}

// 停止应用
async function stopApp(packageName) {
    if (!currentAdb) {
        throw new Error('未连接到设备');
    }

    try {
        const command = `am force-stop ${packageName}`;
        return await execShell(command);
    } catch (error) {
        log('停止应用失败:', error);
        throw error;
    }
}

// 卸载应用
async function uninstallApp(packageName, options = {}) {
    if (!currentAdb) {
        throw new Error('未连接到设备');
    }

    try {
        let command = 'pm uninstall';
        if (options.keepData) {
            command += ' -k';
        }
        command += ` ${packageName}`;

        return await execShell(command);
    } catch (error) {
        log('卸载应用失败:', error);
        throw error;
    }
}

// 开启无线 ADB 端口
async function enableTcpIp(port = 5555) {
    if (!currentAdb) {
        throw new Error('未连接到设备');
    }

    try {
        const command = `tcpip ${port}`;
        return await execShell(command);
    } catch (error) {
        log('开启无线 ADB 失败:', error);
        throw error;
    }
}

// 断开连接
async function disconnect() {
    try {
        if (currentTransport) {
            await currentTransport.close();
        }

        currentDevice = null;
        currentAdb = null;
        currentTransport = null;

        log('设备已断开连接');
    } catch (error) {
        log('断开连接失败:', error);
        throw error;
    }
}

// 检查连接状态
function isConnected() {
    return currentAdb !== null && currentTransport !== null;
}

// 获取当前设备
function getCurrentDevice() {
    return currentDevice;
}

// 获取当前 ADB 实例
function getCurrentAdb() {
    return currentAdb;
}

// 导出 API（兼容浏览器全局变量）
if (typeof window !== 'undefined') {
    window.AdbImpl = {
        initDeviceManager,
        requestDevice,
        connectDevice,
        getDeviceInfo,
        execShell,
        installApp,
        pushFile,
        getInstalledPackages,
        startActivity,
        stopApp,
        uninstallApp,
        enableTcpIp,
        disconnect,
        isConnected,
        getCurrentDevice,
        getCurrentAdb
    };

    // 同时导出到模块系统（供 webpack 使用）
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = window.AdbImpl;
    }
}

// ES6 模块导出
export {
    initDeviceManager,
    requestDevice,
    connectDevice,
    getDeviceInfo,
    execShell,
    installApp,
    pushFile,
    getInstalledPackages,
    startActivity,
    stopApp,
    uninstallApp,
    enableTcpIp,
    disconnect,
    isConnected,
    getCurrentDevice,
    getCurrentAdb
};

export default {
    initDeviceManager,
    requestDevice,
    connectDevice,
    getDeviceInfo,
    execShell,
    installApp,
    pushFile,
    getInstalledPackages,
    startActivity,
    stopApp,
    uninstallApp,
    enableTcpIp,
    disconnect,
    isConnected,
    getCurrentDevice,
    getCurrentAdb
};
