// 设备管理相关功能
// 使用 Tango ADB 原生 API

// 全局变量
window.adbDevice = null;
window.adbTransport = null;
window.isConnecting = false;
window.browserSupport = null;
window.isMobile = null;

// 获取浏览器名称和版本
let getBrowserInfo = () => {
    const ua = navigator.userAgent;
    let browserName = 'Unknown';
    let version = 'Unknown';
    
    // 检测主流浏览器
    if (ua.indexOf('Chrome') !== -1 && ua.indexOf('Edg') === -1 && ua.indexOf('EdgA') === -1) {
        browserName = 'Chrome';
        version = ua.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/)[1];
    } else if (ua.indexOf('Edg') !== -1 || ua.indexOf('EdgA') !== -1) {
        browserName = 'Edge';
        version = ua.match(/EdgA?\/(\d+\.\d+\.\d+\.\d+)/)[1];
    } else if (ua.indexOf('Firefox') !== -1) {
        browserName = 'Firefox';
        version = ua.match(/Firefox\/(\d+\.\d+)/)[1];
    } else if (ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1) {
        browserName = 'Safari';
        version = ua.match(/Version\/(\d+\.\d+)/)[1];
    } else if (ua.indexOf('MSIE') !== -1 || ua.indexOf('Trident') !== -1) {
        browserName = 'Internet Explorer';
        version = ua.match(/MSIE\s*(\d+\.\d+)/) || ua.match(/rv:(\d+\.\d+)/);
        version = version ? version[1] : 'Unknown';
    }
    
    return { browserName, version, userAgent: ua };
};

// 检测是否是移动端设备
let isMobileDevice = () => {
    const userAgent = navigator.userAgent;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
};

// 一键复制命令到剪贴板
let copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (e) {
        // 兼容旧浏览器
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch (e2) {
            document.body.removeChild(textarea);
            return false;
        }
    }
};

// 显示冲突解决方案对话框
let showUsbConflictDialog = () => {
    const command = 'adb kill-server';
    
    // 创建或更新模态框
    let modal = document.getElementById('customModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'customModal';
        modal.style.cssText = 'display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.2);z-index:1000;width:400px;overflow:hidden;';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div style="padding:15px 20px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:15px;font-weight:bold;color:#d32f2f;">⚠ USB 接口冲突</span>
            <button onclick="document.getElementById('customModal').style.display='none'" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;line-height:1;">×</button>
        </div>
        <div style="padding:20px;">
            <div style="font-size:13px;color:#333;margin-bottom:15px;line-height:1.5;">
                本地 ADB Server 正在运行，占用了 USB 接口。<br>
                需要先释放接口才能连接。
            </div>
            <div style="background:#263238;border-radius:6px;padding:10px 12px;margin-bottom:15px;display:flex;align-items:center;justify-content:space-between;">
                <code style="color:#4fc3f7;font-family:monospace;font-size:13px;">${command}</code>
                <button onclick="copyKillServerCmd(this)" style="background:#4fc3f7;color:#263238;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">复制</button>
            </div>
            <div style="font-size:12px;color:#888;margin-bottom:15px;">
                在终端/命令提示符中执行后，点击下方按钮重试
            </div>
        </div>
        <div style="padding:10px 20px;border-top:1px solid #eee;text-align:right;">
            <button onclick="retryConnect()" style="background:#4caf50;color:white;border:none;padding:8px 20px;border-radius:4px;cursor:pointer;font-size:13px;">重试连接</button>
        </div>
    `;
    modal.style.display = 'block';
    
    // 绑定全局函数
    window.copyKillServerCmd = async (btn) => {
        const ok = await copyToClipboard(command);
        btn.textContent = ok ? '已复制 ✓' : '失败';
        btn.style.background = ok ? '#4caf50' : '#f44336';
        setTimeout(() => { btn.textContent = '复制'; btn.style.background = '#4fc3f7'; }, 2000);
    };
    
    window.retryConnect = () => {
        modal.style.display = 'none';
        connectDevice();
    };
};

// 设备日志记录
function logDevice(message) {
    console.log(message);
    const deviceLogElement = document.getElementById('device-log');
    if (deviceLogElement) {
        deviceLogElement.textContent = deviceLogElement.textContent + message + '\n';
    }
}

// 清除设备日志
function clearDeviceLog() {
    const deviceLogElement = document.getElementById('device-log');
    if (deviceLogElement) {
        deviceLogElement.textContent = '';
    }
}

// 断开连接
let disconnect = async () => {
    if (!window.adbClient) {
        logDevice('没有设备需要断开');
        return;
    }
    
    const confirmed = confirm("是否断开连接？");
    if (!confirmed) {
        return;
    }
    
    try {
        logDevice('正在断开连接...');
        
        if (window.adbClient) {
            await window.adbClient.close();
            window.adbClient = null;
        }
        
        window.adbDevice = null;
        window.adbTransport = null;
        window.adbConnectionMode = null;
        
        setDeviceName(null);
        logDevice('===== 设备已断开连接 =====');
        stopDeviceMonitoring();
    } catch (error) {
        console.error('Disconnect error:', error);
        logDevice('断开连接失败: ' + (error.message || error.toString()));
        
        // 即使断开失败也清理状态
        window.adbClient = null;
        window.adbDevice = null;
        window.adbTransport = null;
        window.adbConnectionMode = null;
        setDeviceName(null);
    }
};

// 使用指定设备建立ADB连接
let connectWithDevice = async (webusbDevice, adbApi, adbCredentialWeb) => {
    try {
        logDevice('设备: ' + webusbDevice.name + ' (Serial: ' + webusbDevice.serial + ')');
        
        // 使用 Tango ADB 的 API 创建连接
        logDevice('正在创建 ADB 连接...');
        
        // 获取所需的类
        const AdbCredentialStore = adbCredentialWeb.default;
        const AdbNamespace = adbApi;
        const Adb = AdbNamespace.Adb;
        const AdbDaemonTransport = AdbNamespace.AdbDaemonTransport;
        
        // 直接使用设备的 connect 方法
        const connection = await webusbDevice.connect();
        logDevice('WebUSB 连接已建立');
        
        // 创建凭据管理器
        const credentialStore = new AdbCredentialStore('Jetour ADB Tool');
        
        // 使用 AdbDaemonTransport.authenticate 创建 transport
        // 此方法内部会处理 RSA 密钥交换：
        // 1. 发送 Connect 包
        // 2. 设备返回 Auth Token
        // 3. 用本地密钥签名或发送公钥
        // 4. 等待设备确认（用户需在设备上点击"允许"）
        logDevice('正在进行 ADB RSA 鉴权...');
        const ADB_DEFAULT_AUTHENTICATORS = adbApi.ADB_DEFAULT_AUTHENTICATORS;
        
        const transport = await AdbDaemonTransport.authenticate({
            serial: webusbDevice.serial,
            connection: connection,
            credentialStore: credentialStore,
            authenticators: ADB_DEFAULT_AUTHENTICATORS
        });
        logDevice('ADB 传输层已建立（RSA 鉴权成功）');
        
        // 使用 new Adb(transport) 创建 ADB 客户端
        logDevice('正在创建 ADB 客户端...');
        const adb = new Adb(transport);
        logDevice('ADB 客户端已创建');
        
        // 保存连接对象到全局变量
        window.adbClient = adb;
        window.adbDevice = webusbDevice;
        window.adbTransport = connection;
        
        // 获取设备信息
        logDevice('获取设备信息...');
        const model = await adb.subprocess.noneProtocol.spawnWaitText(["getprop", "ro.product.model"]);
        const manufacturer = await adb.subprocess.noneProtocol.spawnWaitText(["getprop", "ro.product.manufacturer"]);
        const brand = await adb.subprocess.noneProtocol.spawnWaitText(["getprop", "ro.product.brand"]);
        const device = await adb.subprocess.noneProtocol.spawnWaitText(["getprop", "ro.product.device"]);
        const productName = await adb.subprocess.noneProtocol.spawnWaitText(["getprop", "ro.product.name"]);
        const board = await adb.subprocess.noneProtocol.spawnWaitText(["getprop", "ro.product.board"]);
        const hardware = await adb.subprocess.noneProtocol.spawnWaitText(["getprop", "ro.hardware"]);
        
        // ADB 连接成功，显示弹窗提示
        logDevice('===== ADB 连接成功 =====');
        alert('ADB 连接成功！设备信息：\n品牌: ' + brand.trim() + '\n型号: ' + model.trim() + '\n设备: ' + device.trim());
        const version = await adb.subprocess.noneProtocol.spawnWaitText(["getprop", "ro.build.version.release"]);
        const sdk = await adb.subprocess.noneProtocol.spawnWaitText(["getprop", "ro.build.version.sdk"]);
        const securityPatch = await adb.subprocess.noneProtocol.spawnWaitText(["getprop", "ro.build.version.security_patch"]);
        const serialno = await adb.subprocess.noneProtocol.spawnWaitText(["getprop", "ro.serialno"]);
        const id = await adb.subprocess.noneProtocol.spawnWaitText(["getprop", "ro.build.id"]);
        const displayId = await adb.subprocess.noneProtocol.spawnWaitText(["getprop", "ro.build.display.id"]);
        const diagSn = await adb.subprocess.noneProtocol.spawnWaitText(["getprop", "persist.vendor.bosch.cfg.diag.sn"]);
        const modelName = model.trim();
        const serialNumber = serialno.trim();
        const deviceName = device.trim();
        
        logDevice('系统版本: ' + version.trim());
        logDevice('系统版本号: ' + displayId.trim());
        logDevice('设备序列号: ' + diagSn.trim());
        
        setDeviceName('🚗 ' + deviceName + ' | ' + serialNumber);
        
        // 开始监控
        startDeviceMonitoring();
        
        // 连接成功，重置连接状态
        window.isConnecting = false;
        
    } catch (e) {
        logDevice('连接失败: ' + e.message);
        console.error('ADB connection error:', e);
        
        // 针对常见错误提供解决方案
        if (e.message && (e.message.includes('Unable to claim interface') || e.message.includes('Busy') || e.message.includes('already in used'))) {
            logDevice('错误原因：USB 接口被其他程序占用');
            logDevice('解决方案：请关闭占用 USB 的程序后刷新页面重试');
        } else if (e.message && (e.message.includes('auth') || e.message.includes('unauthorized') || e.message.includes('UnauthorizedError'))) {
            logDevice('错误原因：ADB RSA 密钥鉴权失败');
            logDevice('解决方案：请在车机上点击"允许USB调试"，或在车机开发者选项中撤销 USB 调试授权后重新连接');
        } else if (e.message && e.message.includes('transferOut')) {
            logDevice('错误原因：USB 传输错误，可能是连接不稳定');
            logDevice('建议：检查 USB 线是否牢固，尝试更换 USB 端口');
        }
        
        // 连接失败，重置连接状态
        window.isConnecting = false;
    }
};

// 连接设备（一键连接）
let connectDevice = async () => {
    if (window.adbClient) {
        logDevice('设备已连接');
        return;
    }
    
    if (window.isConnecting) {
        logDevice('正在连接中...');
        return;
    }
    
    window.isConnecting = true;
    logDevice('正在连接设备...');
    
    try {
        // 等待库加载
        let attempts = 0;
        while (!window.Adb && !window.TangoADB && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        
        // 获取 API
        let adbApi, adbDaemonWebUsb, adbCredentialWeb;
        
        if (window.TangoADB) {
            adbApi = window.TangoADB.Adb;
            adbDaemonWebUsb = window.TangoADB.AdbDaemonWebUsb;
            adbCredentialWeb = window.TangoADB.AdbCredentialWeb;
        } else if (window.Adb) {
            adbApi = window.Adb;
            adbDaemonWebUsb = window.AdbDaemonWebUsb;
            adbCredentialWeb = window.AdbCredentialWeb;
        } else {
            throw new Error('ADB 库未加载，请刷新页面');
        }
        
        if (!adbApi || !adbDaemonWebUsb) {
            throw new Error('浏览器不支持 WebUSB，请使用 Chrome 或 Edge');
        }
        
        const manager = adbDaemonWebUsb.AdbDaemonWebUsbDeviceManager.BROWSER;
        if (!manager) {
            throw new Error('WebUSB 不可用');
        }
        
        // 步骤1：检查已授权设备
        let devices = [];
        try {
            devices = await manager.getDevices();
        } catch (e) {}
        
        // 步骤2：如果没有已授权设备，请求用户选择（首次连接）
        if (devices.length === 0) {
            logDevice('首次连接，请选择设备...');
            const device = await manager.requestDevice();
            if (!device) {
                logDevice('已取消');
                window.isConnecting = false;
                return;
            }
            devices = [device];
            logDevice('设备已选择');
        }
        
        // 步骤3：建立 ADB 连接
        logDevice('建立 ADB 连接...');
        await connectWithDevice(devices[0], adbApi, adbCredentialWeb);
        window.isConnecting = false;
        
    } catch (error) {
        const msg = error.message || error.toString();
        logDevice('连接失败: ' + msg);
        
        // USB 冲突检测
        if (msg.includes('Unable to claim interface')) {
            showUsbConflictDialog();
        } else if (msg.includes('auth') || msg.includes('unauthorized')) {
            alert('请在设备上点击"允许 USB 调试"');
        } else if (msg.includes('NotFoundError')) {
            logDevice('用户取消了操作');
        } else {
            alert('连接失败：' + msg);
        }
        
        window.isConnecting = false;
    }
};

// 设备状态监控
let deviceMonitoringInterval = null;

// 开始持续检测设备状态
let startDeviceMonitoring = () => {
    stopDeviceMonitoring();
    deviceMonitoringInterval = setInterval(async () => {
        try {
            if (!window.adbClient) {
                setDeviceName(null);
                stopDeviceMonitoring();
            }
        } catch (error) {
            setDeviceName(null);
            stopDeviceMonitoring();
        }
    }, 5000);
};

// 停止设备状态监控
let stopDeviceMonitoring = () => {
    if (deviceMonitoringInterval) {
        clearInterval(deviceMonitoringInterval);
        deviceMonitoringInterval = null;
    }
};

// 当前设备状态
let setDeviceName = async (name) => {
    if (!name) {
        name = '🚗 未连接';
    }
    const statusElement = document.getElementById('device-status');
    if (statusElement) {
        statusElement.textContent = name;
    }
};

// 初始化设备检测
let initDeviceDetection = async () => {
    try {
        if (!navigator.usb) {
            logDevice('浏览器不支持 WebUSB，请使用 Chrome 或 Edge');
            return;
        }
        
        // 监听 USB 设备连接事件 - 自动触发连接
        navigator.usb.addEventListener('connect', async () => {
            logDevice('检测到 USB 设备插入');
            if (!window.isConnecting && !window.adbClient) {
                await connectDevice();
            }
        });
        
        // 监听 USB 设备断开事件
        navigator.usb.addEventListener('disconnect', () => {
            logDevice('USB 设备已断开');
            if (window.adbClient) {
                disconnect();
            }
        });
        
        // 页面加载后延迟检查已授权设备，自动连接
        setTimeout(async () => {
            try {
                const devices = await navigator.usb.getDevices();
                if (devices.length > 0) {
                    logDevice(`检测到 ${devices.length} 个已授权设备，自动连接中...`);
                    if (!window.isConnecting && !window.adbClient) {
                        await connectDevice();
                    }
                } else {
                    logDevice('未检测到已授权设备，请点击"开始连接"');
                }
            } catch (e) {
                logDevice('等待用户点击"开始连接"');
            }
        }, 500);
        
    } catch (error) {
        logDevice('设备检测启动失败');
    }
};

// 页面加载完成后初始化
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
        window.isMobile = isMobileDevice();
        window.browserSupport = checkWebUSBSupport();
        
        if (!window.browserSupport) {
            logDevice('浏览器不支持 WebUSB，请使用 Chrome 或 Edge');
            return;
        }
        
        initDeviceDetection();
    });
}

// 推送应用
let push = async (filePath, blob) => {
    // 检查是否有 Tango ADB 客户端
    if (window.adbClient) {
        clear();
        showProgress(true);
        try {
            log("正在推送 " + filePath + " ...");
            
            // 将 Blob 转换为 Uint8Array
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // 创建 ReadableStream
            const readableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(uint8Array);
                    controller.close();
                }
            });
            
            // 使用 sync 协议推送文件
            const sync = await window.adbClient.sync();
            await sync.write({
                filename: filePath,
                file: readableStream,
                permission: 0o644
            });
            
            log("推送成功: " + filePath);
            showProgress(false);
            return;
        } catch (error) {
            console.error('Tango ADB push error:', error);
            log('推送失败: ' + (error.message || error.toString()));
            showProgress(false);
            throw error;
        }
    }
    
    // 未连接设备
    alert('未连接到设备，请先点击"开始连接"按钮连接设备');
    showProgress(false);
};

// 执行命令
let exec_shell = async (command) => {
    // 检查是否有 Tango ADB 客户端
    if (window.adbClient) {
        clear();
        showProgress(true);
        log('开始执行指令: ' + command + '\n');
        try {
            // 使用 Tango ADB 的 subprocess.spawnWaitText
            const result = await window.adbClient.subprocess.noneProtocol.spawnWaitText(command.split(' '));
            log(result);
            showProgress(false);
            return;
        } catch (error) {
            console.error('Tango ADB shell error:', error);
            log('命令执行失败: ' + (error.message || error.toString()));
            showProgress(false);
            alert('命令执行失败，请检查命令是否正确');
            return;
        }
    }
    
    // 未连接设备
    alert('未连接到设备，请先点击"开始连接"按钮连接设备');
    showProgress(false);
};

// 优化网络传输性能
let optimizeNetworkPerformance = async () => {
    if (!window.adbClient) {
        alert('未连接到设备，请先点击"开始连接"按钮连接设备');
        return;
    }
    
    clear();
    showProgress(true);
    log('开始优化网络传输性能...\n');
    
    try {
        // 1. 调整 TCP 窗口参数
        log('1. 调整 TCP 窗口参数...');
        await exec_shell('echo \'net.ipv4.tcp_window_scaling=1\' >> /proc/sys/net/ipv4/tcp_window_scaling');
        log('TCP 窗口参数调整成功\n');
        
        // 2. 启用 ADB 的压缩传输功能
        log('2. 启用 ADB 压缩传输功能...');
        // 注意：ADB 压缩传输功能需要在 ADB 客户端启用，这里我们通过 shell 命令设置相关参数
        await exec_shell('setprop persist.adb.zlib-deflate 1');
        log('ADB 压缩传输功能启用成功\n');
        
        log('网络传输性能优化完成！');
        alert('网络传输性能优化完成！');
    } catch (error) {
        log('性能优化失败:', error);
        alert('性能优化失败，请检查设备状态');
    }
    showProgress(false);
};

// 执行命令并返回输出
let execShellAndGetOutput = async (command) => {
    // 检查是否有 Tango ADB 客户端
    if (window.adbClient) {
        let output = "";
        try {
            // 使用 Tango ADB 的 subprocess.spawnWaitText
            const result = await window.adbClient.subprocess.noneProtocol.spawnWaitText(command.split(' '));
            output = result;
            log(output); // 同时输出到日志
            return output;
        } catch (error) {
            console.error('Tango ADB shell error:', error);
            log('执行命令失败: ' + (error.message || error.toString()));
            return "";
        }
    }
    
    // 未连接设备
    alert('未连接到设备，请先点击"开始连接"按钮连接设备');
    return "";
};

// 手动执行命令
let exec_command = async (args) => {
    const command = document.getElementById('shell').value;
    if (!command) {
        alert('请输入命令');
        return;
    }
    
    // 检查是否有 Tango ADB 客户端
    if (window.adbClient) {
        clear();
        showProgress(true);
        log('开始执行指令: ' + command + '\n');
        try {
            // 使用 Tango ADB 的 subprocess.spawnWaitText
            const result = await window.adbClient.subprocess.noneProtocol.spawnWaitText(command.split(' '));
            log(result);
            showProgress(false);
            return;
        } catch (error) {
            console.error('Tango ADB shell error:', error);
            log('命令执行失败: ' + (error.message || error.toString()));
            showProgress(false);
            alert('命令执行失败，请检查命令是否正确');
            return;
        }
    }
    
    // 未连接设备
    alert('未连接到设备，请先点击"开始连接"按钮连接设备');
};

// 通过 WebRTC 获取本机局域网IP
async function getLocalIP() {
    return new Promise((resolve) => {
        const pc = new RTCPeerConnection({
            iceServers: []
        });
        pc.createDataChannel('');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));

        let ipFound = null;
        pc.onicecandidate = (evt) => {
            if (evt.candidate) {
                const match = evt.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
                if (match) {
                    const ip = match[1];
                    // 过滤出局域网IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
                    if (ip.startsWith('192.168.') || ip.startsWith('10.') ||
                        (ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31)) {
                        ipFound = ip;
                        pc.close();
                        resolve(ipFound);
                    }
                }
            }
        };

        // 超时返回默认值
        setTimeout(() => {
            pc.close();
            resolve(ipFound || '192.168.1.1');
        }, 2000);
    });
}

// 导出函数
try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            disconnect,
            setDeviceName,
            push,
            exec_shell,
            execShellAndGetOutput,
            exec_command,
            adbDevice,
            adbTransport,
            connectDevice
        };
    }
    // 浏览器环境，暴露到全局作用域
    if (typeof window !== 'undefined') {
        window.connectDevice = connectDevice;
    }
} catch (e) {
    // 忽略错误
}