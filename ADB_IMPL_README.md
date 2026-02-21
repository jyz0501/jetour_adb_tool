# 基于 @yume-chan/adb 的实现说明

## 概述

本项目已从自研的 ADB 实现切换到使用成熟的 **Tango ADB (@yume-chan/adb)** 库。

## 主要优势

1. **无需 WebSocket 服务器** - 直接使用 WebUSB API 连接设备
2. **更稳定可靠** - 使用经过大量测试的开源库
3. **功能更完善** - 支持完整的 ADB 协议
4. **更好的维护** - 持续更新的开源项目

## 安装依赖

```bash
npm install
```

## 构建项目

```bash
# 生产环境构建
npm run build

# 开发环境构建
npm run build:dev

# 监听模式（开发时使用）
npm run watch
```

## 使用方式

构建完成后，会在 `dist` 目录下生成 `adb-bundle.js` 文件。

### 在 HTML 中引用

```html
<script src="dist/adb-bundle.js"></script>
```

### API 示例

#### 1. 连接设备

```javascript
// 请求设备连接
const device = await AdbImpl.requestDevice();

// 连接到设备
await AdbImpl.connectDevice(device);

// 检查连接状态
console.log('是否已连接:', AdbImpl.isConnected());

// 获取设备信息
const deviceInfo = await AdbImpl.getDeviceInfo();
console.log('设备信息:', deviceInfo);
```

#### 2. 执行 Shell 命令

```javascript
// 执行命令
const output = await AdbImpl.execShell('ls -l /sdcard');
console.log('命令输出:', output);
```

#### 3. 安装应用

```javascript
// 从 URL 安装
const response = await fetch('https://example.com/app.apk');
const apkData = await response.blob();
const output = await AdbImpl.installApp(apkData, {
    replace: true,          // 覆盖安装
    grantPermissions: true  // 自动授予权限
});
console.log('安装结果:', output);
```

#### 4. 获取已安装应用列表

```javascript
// 获取所有第三方应用
const packages = await AdbImpl.getInstalledPackages({
    includeSystem: false
});
console.log('应用列表:', packages);
```

#### 5. 启动/停止应用

```javascript
// 启动应用
await AdbImpl.startActivity('com.example.app', 'com.example.app.MainActivity');

// 停止应用
await AdbImpl.stopApp('com.example.app');
```

#### 6. 推送文件

```javascript
// 推送文件到设备
const fileData = await fetch('file.txt').then(r => r.blob());
await AdbImpl.pushFile('/sdcard/file.txt', fileData);
```

#### 7. 开启无线 ADB

```javascript
// 开启无线 ADB 端口（仅供其他 ADB 工具使用）
await AdbImpl.enableTcpIp(5555);
console.log('无线 ADB 已开启，端口: 5555');
```

#### 8. 断开连接

```javascript
await AdbImpl.disconnect();
```

## 集成到现有项目

### 更新 device.js

将 `js/device.js` 中的自研 ADB 实现替换为使用 `AdbImpl`：

```javascript
// 替换原来的 initWebUSB 函数
async function connect() {
    try {
        clearDeviceLog();
        logDevice('开始连接设备...');

        // 使用新的 AdbImpl
        const device = await AdbImpl.requestDevice();
        await AdbImpl.connectDevice(device);

        if (AdbImpl.isConnected()) {
            const deviceInfo = await AdbImpl.getDeviceInfo();
            setDeviceName(deviceInfo);
            logDevice('设备连接成功: ' + deviceInfo);

            // 显示成功提示
            let toast = document.getElementById('success-toast');
            toast.style.visibility = 'visible';
            setTimeout(() => {
                toast.style.visibility = 'hidden';
            }, 3000);

            // 开始监控设备状态
            startDeviceMonitoring();
        }
    } catch (error) {
        log('设备连接失败:', error);
        logDevice('设备连接失败: ' + (error.message || error.toString()));
        alert('连接失败，请断开重新尝试。');
    }
}
```

### 更新 apps.js

将应用安装函数更新为使用 `AdbImpl`：

```javascript
// 示例：安装应用管家
async function yygj() {
    if (!AdbImpl.isConnected()) {
        alert("未连接到设备");
        return;
    }

    clear();
    let toast = document.getElementById('downloading-toast');
    toast.style.opacity = '1';
    toast.style.display = 'block';

    try {
        // 使用本地APK文件
        let response = await fetch('apk/应用管家1.8.3.apk');
        let fileBlob = await response.blob();

        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);

        log('正在安装 大伦应用管家 ...');
        let output = await AdbImpl.installApp(fileBlob, {
            replace: true,
            grantPermissions: true
        });

        if (output.includes('Success')) {
            log('安装成功！');
            alert("安装成功！");
        } else {
            log('安装失败！');
            alert("安装失败！");
        }
    } catch (error) {
        log('安装失败！！！', error);
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);
        alert("安装失败！！！");
    }
}
```

## 注意事项

### 浏览器要求

- ✅ Chrome / Edge (推荐)
- ✅ 其他 Chromium 内核浏览器
- ❌ Firefox (不支持 WebUSB)
- ❌ Safari (不支持 WebUSB)

### 设备要求

- Android 设备需要开启 USB 调试模式
- 需要使用支持 ADB 的数据线或 OTG 线

### 无线 ADB 说明

**浏览器无法直接进行 TCP 连接**，因此：

1. 通过 USB 连接设备
2. 使用 `enableTcpIp()` 开启无线端口
3. 使用其他 ADB 工具（如 `adb` 命令行）连接

### HTTPS 要求

WebUSB API 需要在 HTTPS 环境下使用：
- `https://` - 支持
- `http://localhost` - 支持
- `http://` (非本地) - 不支持

## 故障排查

### 连接失败

1. 检查浏览器是否支持 WebUSB
2. 检查设备是否开启 USB 调试
3. 检查数据线是否支持 ADB
4. 尝试重新拔插数据线

### 安装失败

1. 检查 APK 文件是否完整
2. 检查设备存储空间
3. 检查是否需要授权

### 命令执行失败

1. 检查命令语法是否正确
2. 检查设备是否有执行权限
3. 查看浏览器控制台错误信息

## 参考资源

- [Tango ADB 官方文档](https://tangoadb.dev/)
- [Tango ADB GitHub](https://github.com/yume-chan/ya-webadb)
- [WebUSB API 规范](https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API)
