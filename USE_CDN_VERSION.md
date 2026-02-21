# 使用 CDN 版本的 @yume-chan/adb

由于 npm install 可能需要较长时间，这里提供一个使用 CDN 的快速方案。

## 方案：使用 ESM 模块 + CDN

直接在浏览器中使用 import 动态加载 @yume-chan/adb 的 ESM 版本。

### 1. 创建新的 HTML 页面

创建 `index-cdn.html`，使用 CDN 加载：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>捷途大伦哥的应用管家 - CDN版</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container">
        <h3>ADB 连接测试</h3>

        <div style="margin: 20px 0;">
            <button id="connect-btn" style="padding: 10px 20px;">连接设备</button>
            <button id="test-btn" style="padding: 10px 20px; margin-left: 10px;">测试命令</button>
            <button id="disconnect-btn" style="padding: 10px 20px; margin-left: 10px; background: #dc3545; color: white;">断开连接</button>
        </div>

        <div id="device-status" style="margin: 20px 0; padding: 10px; background: #f0f0f0;">
            设备状态: 未连接
        </div>

        <div id="log" style="margin: 20px 0; padding: 10px; background: #f9f9f9; font-family: monospace; min-height: 200px;">
            <div>日志输出...</div>
        </div>
    </div>

    <script type="module">
        // 使用 CDN 加载 @yume-chan/adb
        import { AdbDaemonWebUsbDeviceManager } from 'https://cdn.jsdelivr.net/npm/@yume-chan/adb-backend-webusb/+esm';
        import { Adb } from 'https://cdn.jsdelivr.net/npm/@yume-chan/adb/+esm';

        let deviceManager = null;
        let currentDevice = null;
        let currentAdb = null;

        function log(message) {
            const logDiv = document.getElementById('log');
            const time = new Date().toLocaleTimeString();
            logDiv.innerHTML += `<div>[${time}] ${message}</div>`;
            logDiv.scrollTop = logDiv.scrollHeight;
            console.log(message);
        }

        async function connectDevice() {
            try {
                log('初始化设备管理器...');
                deviceManager = new AdbDaemonWebUsbDeviceManager();

                log('请求设备权限...');
                const device = await deviceManager.requestDevice({
                    filters: [
                        { classCode: 0xff, subclassCode: 0x42, protocolCode: 0x01 }
                    ]
                });

                log('正在连接设备...');
                currentDevice = device;

                const transport = await device.connect();
                currentAdb = new Adb({
                    transport: transport
                });

                log('✓ 设备连接成功！');
                document.getElementById('device-status').textContent = '设备状态: 已连接';
                document.getElementById('device-status').style.background = '#d4edda';

            } catch (error) {
                log('✗ 连接失败: ' + error.message);
                console.error(error);
            }
        }

        async function testCommand() {
            if (!currentAdb) {
                log('✗ 请先连接设备');
                return;
            }

            try {
                log('执行测试命令: getprop ro.product.model');
                const stream = await currentAdb.createStream('shell:getprop ro.product.model');

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

                log('✓ 设备型号: ' + output.trim());

            } catch (error) {
                log('✗ 命令执行失败: ' + error.message);
                console.error(error);
            }
        }

        async function disconnectDevice() {
            try {
                if (currentDevice) {
                    // 关闭连接
                    log('断开设备连接...');
                    // 注意：需要正确关闭连接
                    // currentDevice.disconnect() 方法需要根据实际 API 调整
                    currentDevice = null;
                    currentAdb = null;
                    log('✓ 设备已断开');
                    document.getElementById('device-status').textContent = '设备状态: 未连接';
                    document.getElementById('device-status').style.background = '#f0f0f0';
                }
            } catch (error) {
                log('✗ 断开失败: ' + error.message);
            }
        }

        // 绑定事件
        document.getElementById('connect-btn').addEventListener('click', connectDevice);
        document.getElementById('test-btn').addEventListener('click', testCommand);
        document.getElementById('disconnect-btn').addEventListener('click', disconnectDevice);

        log('✓ 页面加载完成，等待操作...');
    </script>
</body>
</html>
```

### 2. 使用说明

1. 直接在浏览器中打开 `index-cdn.html`
2. 点击"连接设备"按钮
3. 在设备上允许 USB 调试
4. 点击"测试命令"验证连接

### 3. 优势

- ✅ 无需 npm install
- ✅ 无需 webpack 构建
- ✅ 直接使用最新版本
- ✅ 无需 WebSocket 服务器
- ✅ 使用 WebUSB API 直接连接

### 4. 注意事项

1. **浏览器要求**：
   - Chrome / Edge（推荐最新版）
   - 必须支持 WebUSB API

2. **HTTPS 要求**：
   - 本地开发：`http://localhost` 或 `file://` 可以
   - 部署：必须使用 `https://`

3. **设备要求**：
   - Android 设备
   - 开启 USB 调试模式
   - 使用支持 ADB 的数据线

### 5. 如果 CDN 版本不可用

某些地区可能无法访问 jsdelivr CDN，可以尝试其他 CDN：

```javascript
// 使用 unpkg
import { AdbDaemonWebUsbDeviceManager } from 'https://unpkg.com/@yume-chan/adb-backend-webusb?module';
import { Adb } from 'https://unpkg.com/@yume-chan/adb?module';

// 或使用 esm.sh
import { AdbDaemonWebUsbDeviceManager } from 'https://esm.sh/@yume-chan/adb-backend-webusb';
import { Adb } from 'https://esm.sh/@yume-chan/adb';
```

## 下一步

测试成功后，可以将这个 CDN 版本集成到现有的 `index.html` 中。
