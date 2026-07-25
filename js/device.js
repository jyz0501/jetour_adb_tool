// 设备管理相关功能
// 使用 Tango ADB 原生 API

// 全局变量
window.adbDevice = null;
window.adbTransport = null;
window.isConnecting = false;
window.browserSupport = null; // 全局浏览器支持状态
window.isMobile = null; // 全局设备类型状态

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

// 连接设备
let connectDevice = async () => {
    // 防止重复连接
    if (window.adbClient) {
        logDevice('设备已连接，请勿重复点击');
        return;
    }
    
    // 防止重复连接请求
    if (window.isConnecting) {
        logDevice('正在连接中，请勿重复操作');
        return;
    }
    
    window.isConnecting = true;
    
    // 使用全局设备类型变量
    const isMobile = window.isMobile;
    logDevice(`当前设备类型: ${isMobile ? '移动端' : 'PC'}`);
    
    try {
        // 开始连接设备
        logDevice('开始连接设备...');
        
        // 详细调试
        console.log('点击时检查:');
        console.log('  window.TangoADB:', window.TangoADB);
        console.log('  window.Adb:', window.Adb);
        console.log('  window.AdbDaemonWebUsb:', window.AdbDaemonWebUsb);
        console.log('  window keys with Adb:', Object.keys(window).filter(k => k.toLowerCase().includes('adb')));
        
        // 等待库加载 - 直接检查原生变量
        let attempts = 0;
        while (!window.Adb && !window.TangoADB && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        
        // 获取 API
        let adbApi, adbDaemonWebUsb, adbCredentialWeb;
        
        if (window.TangoADB) {
            console.log('使用 window.TangoADB');
            console.log('window.TangoADB:', window.TangoADB);
            console.log('window.TangoADB.Adb:', window.TangoADB.Adb);
            console.log('window.TangoADB.AdbDaemonWebUsb:', window.TangoADB.AdbDaemonWebUsb);
            console.log('window.TangoADB.AdbCredentialWeb:', window.TangoADB.AdbCredentialWeb);
            adbApi = window.TangoADB.Adb;
            adbDaemonWebUsb = window.TangoADB.AdbDaemonWebUsb;
            adbCredentialWeb = window.TangoADB.AdbCredentialWeb;
        } else if (window.Adb) {
            console.log('使用 window.Adb');
            // Adb 类直接可用
            adbApi = window.Adb;
            console.log('获取到 Adb 类:', adbApi);
            console.log('Adb.authenticate:', adbApi.authenticate);
            adbDaemonWebUsb = window.AdbDaemonWebUsb;
            console.log('window.AdbDaemonWebUsb:', window.AdbDaemonWebUsb);
            console.log('window.AdbDaemonWebUsb.AdbDaemonWebUsbDeviceManager:', window.AdbDaemonWebUsb.AdbDaemonWebUsbDeviceManager);
            adbCredentialWeb = window.AdbCredentialWeb;
            console.log('window.AdbCredentialWeb:', window.AdbCredentialWeb);
        } else {
            console.log('未找到任何 API');
        }
        
        if (!adbApi || !adbDaemonWebUsb) {
            logDevice('错误: Tango ADB 库未加载');
            alert('Tango ADB 库未加载，请刷新页面');
            window.isConnecting = false;
            return;
        }
        
        const DeviceManagerClass = adbDaemonWebUsb.AdbDaemonWebUsbDeviceManager;
        const manager = DeviceManagerClass.BROWSER;
        
        if (!manager) {
            logDevice('错误: 浏览器不支持 WebUSB');
            alert('您的浏览器不支持 WebUSB，请使用 Chrome 浏览器');
            window.isConnecting = false;
            return;
        }
        
        const AdbCredentialWeb = adbCredentialWeb;
        logDevice('获取已授权设备...');
        
        // 先检查是否有已授权的设备
        let existingDevices = [];
        try {
            existingDevices = await manager.getDevices();
            if (existingDevices.length > 0) {
                logDevice('发现 ' + existingDevices.length + ' 个已授权设备');
            }
        } catch (e) {
            console.log('检查已授权设备失败:', e);
        }
        
        // 如果没有已授权设备，尝试请求用户选择
        if (existingDevices.length === 0) {
            logDevice('没有已授权设备，弹出浏览器设备选择框...');
            
            try {
                const device = await manager.requestDevice();
                
                if (device) {
                    logDevice(`用户已选择设备: ${device.name || '未知'}`);
                    logDevice(`设备序列号: ${device.serial || '未知'}`);
                    logDevice('正在建立 ADB 连接，等待设备 RSA 鉴权...');
                    
                    // 直接使用 requestDevice 返回的设备建立连接
                    // AdbDaemonTransport.authenticate 内部会处理 RSA 公钥交换
                    // 如果设备需要授权，会自动等待用户在设备上点击"允许"
                    try {
                        await connectWithDevice(device, adbApi, adbCredentialWeb);
                    } catch (connError) {
                        // 如果鉴权失败（如用户拒绝了 RSA 密钥），提示用户
                        if (connError.message && (
                            connError.message.includes('auth') ||
                            connError.message.includes('unauthorized') ||
                            connError.message.includes('Authentication')
                        )) {
                            alert('请在车机上点击"允许USB调试"以完成 RSA 密钥配对');
                            logDevice('ADB RSA 鉴权被拒绝，请在车机上允许 USB 调试');
                        }
                        throw connError;
                    }
                    return;
                } else {
                    logDevice('用户取消了设备选择');
                    window.isConnecting = false;
                    return;
                }
            } catch (e) {
                if (e.name === 'NotFoundError') {
                    logDevice('用户取消了设备选择');
                    window.isConnecting = false;
                    return;
                }
                logDevice('请求设备失败: ' + e.message);
                console.error(e);
            }
            
            logDevice('请先连接 USB 设备并授权后再试');
            window.isConnecting = false;
            return;
        }
        
        // 使用已授权设备连接
        logDevice('使用已授权设备连接...');
        await connectWithDevice(existingDevices[0], adbApi, adbCredentialWeb);
    } catch (error) {
        log('检查浏览器支持失败:', error);
        logDevice('连接失败: ' + (error.message || error.toString()));
        console.error('Connection error:', error);
        
        // 连接失败，重置连接状态
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
            logDevice('浏览器不支持 WebUSB');
            return;
        }
        
        const browserInfo = getBrowserInfo();
        logDevice(`您使用的 ${browserInfo.browserName} 浏览器支持 WebUSB`);
        const webusbDevices = await navigator.usb.getDevices();
        if (webusbDevices.length > 0) {
            logDevice(`发现 ${webusbDevices.length} 个已连接的 WebUSB 设备`);
            webusbDevices.forEach((device, index) => {
                logDevice(`设备 ${index + 1}: ${device.productName || 'USB设备'} (VID: ${device.vendorId}, PID: ${device.productId})`);
            });
        } else {
            logDevice('未发现已连接的 WebUSB 设备');
        }
        
        // 监听设备连接事件
        navigator.usb.addEventListener('connect', async (event) => {
            logDevice('===== USB 设备已连接 =====');
            logDevice(`设备: ${event.device.productName || 'USB设备'} (VID: ${event.device.vendorId}, PID: ${event.device.productId})`);

            setTimeout(async () => {
                // 检查是否已经在连接中
                if (!window.isConnecting) {
                    await connectDevice();
                } else {
                    logDevice('发现其他连接正在进行中，本操作已被忽略');
                }
            }, 1000);
        });
        
        // 监听设备断开事件
        navigator.usb.addEventListener('disconnect', (event) => {
            logDevice('===== USB 设备已断开 =====');
            logDevice(`设备: ${event.device.productName || 'USB设备'} (VID: ${event.device.vendorId}, PID: ${event.device.productId})`);
        });
        
    } catch (error) {
        logDevice('设备检测启动失败: ' + (error.message || error.toString()));
    }
};

// 页面加载完成后初始化
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
        // 检测设备类型并存储到全局变量
        window.isMobile = isMobileDevice();
        console.log(`设备类型: ${window.isMobile ? '移动端' : 'PC'}`);
        
        // 检测浏览器支持并存储到全局变量
        window.browserSupport = checkWebUSBSupport();
        console.log(`您所使用的浏览器支持WebUSB: ${window.browserSupport}`);
        
        if (!window.browserSupport) {
            logDevice('您所使用的浏览器不支持WebUSB，请更换Chrome或Edge浏览器');
            return;
        }
        
        // 初始化设备检测
        initDeviceDetection();
        
        // 检查已授权设备并自动连接
        logDevice('检查已授权设备...');
        setTimeout(async () => {
            try {
                // 设置设备日志
                const deviceLogElement = document.getElementById('device-log');
                if (deviceLogElement) {
                    deviceLogElement.textContent = '正在等待设备连接...';
                }
                
                // 等待库加载
                let attempts = 0;
                while (!window.Adb && !window.TangoADB && attempts < 50) {
                    await new Promise(r => setTimeout(r, 100));
                    attempts++;
                }
                
                if (!window.Adb && !window.TangoADB) {
                    logDevice('ADB库未加载');
                    return;
                }
                
                // 获取API
                let adbDaemonWebUsb;
                if (window.TangoADB) {
                    adbDaemonWebUsb = window.TangoADB.AdbDaemonWebUsb;
                } else if (window.Adb) {
                    adbDaemonWebUsb = window.AdbDaemonWebUsb;
                }
                
                if (!adbDaemonWebUsb) {
                    return;
                }
                
                const DeviceManagerClass = adbDaemonWebUsb.AdbDaemonWebUsbDeviceManager;
                const manager = DeviceManagerClass.BROWSER;
                
                if (!manager) {
                    return;
                }
                
                // 检查已授权设备
                const existingDevices = await manager.getDevices();
                if (existingDevices.length > 0) {
                    logDevice(`发现 ${existingDevices.length} 个已授权设备，尝试自动连接...`);
                    // 检查是否已经在连接中
                    if (!window.isConnecting) {
                        await connectDevice();
                    } else {
                        logDevice('发现其他连接正在进行中，跳过自动连接');
                    }
                } else {
                    logDevice('没有已授权设备');
                }
            } catch (e) {
                console.log('检查已授权设备失败:', e);
            }
        }, 3000); // 延迟3秒，等待页面完全加载
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