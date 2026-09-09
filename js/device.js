



window.adbDevice = null;
window.adbTransport = null;
window.isConnecting = false;
window.browserSupport = null;
window.isMobile = null;


let getBrowserInfo = () => {
    const ua = navigator.userAgent;
    let browserName = 'Unknown';
    let version = 'Unknown';
    
    
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


let isMobileDevice = () => {
    const userAgent = navigator.userAgent;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
};




let showUsbConflictDialog = async () => {
    const command = 'adb kill-server';
    const dialogHtml = `
        <div id="usb-conflict-dialog" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999; background: var(--card); border: 1px solid var(--line); padding: 30px; border-radius: 14px; box-shadow: 0 8px 24px var(--shadow); max-width: 450px; width: 90%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <h3 style="margin: 0 0 10px 0; color: var(--txt); font-size: 20px;">USB 接口冲突</h3>
                <p style="color: var(--sub); font-size: 14px; line-height: 1.6; margin: 0;">
                    检测到本地 ADB Server 正在占用 USB 接口<br/>
                    导致浏览器无法通过 WebUSB 访问设备
                </p>
            </div>
            <div style="background: #fafbff; border: 1px solid var(--line); padding: 15px; border-radius: 8px; margin: 20px 0; font-family: monospace; font-size: 14px; color: var(--txt); display: flex; justify-content: space-between; align-items: center;">
                <code id="adb-command" style="margin: 0;">${command}</code>
                <button id="copy-btn" style="background: var(--brand); color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: background 0.2s;">复制</button>
            </div>
            <div style="margin-bottom: 15px; font-size: 13px; color: var(--txt); line-height: 1.5; background: rgba(245, 158, 11, 0.10); border: 1px solid rgba(245, 158, 11, 0.30); border-left: 3px solid var(--accent); padding: 10px; border-radius: 6px;">
                <strong>操作步骤：</strong><br/>
                1. 点击"复制"按钮复制命令<br/>
                2. 打开终端/PowerShell<br/>
                3. 粘贴并执行命令<br/>
                4. 点击下方"我已执行"按钮
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="retry-btn" style="flex: 1; background: var(--ok); color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 500; transition: background 0.2s;">
                    我已执行，重试连接
                </button>
                <button id="cancel-btn" style="background: var(--sub); color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; transition: background 0.2s;">
                    取消
                </button>
            </div>
        </div>
        <div id="usb-conflict-mask" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--mask); z-index: 9998;"></div>
    `;
    
    
    const existing = document.getElementById('usb-conflict-dialog');
    if (existing) existing.remove();
    const existingMask = document.getElementById('usb-conflict-mask');
    if (existingMask) existingMask.remove();
    
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = dialogHtml;
    document.body.appendChild(tempDiv.firstElementChild);
    document.body.appendChild(document.getElementById('usb-conflict-mask'));
    
    return new Promise((resolve) => {
        const copyBtn = document.getElementById('copy-btn');
        const retryBtn = document.getElementById('retry-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        const commandEl = document.getElementById('adb-command');
        
        copyBtn.addEventListener('click', () => {
            const text = commandEl.textContent;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                    copyBtn.textContent = '✓ 已复制';
                    copyBtn.style.background = 'var(--ok)';
                    setTimeout(() => {
                        copyBtn.textContent = '复制';
                        copyBtn.style.background = 'var(--brand)';
                    }, 2000);
                });
            } else {
                
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
                copyBtn.textContent = '✓ 已复制';
                copyBtn.style.background = 'var(--ok)';
                setTimeout(() => {
                    copyBtn.textContent = '复制';
                    copyBtn.style.background = 'var(--brand)';
                }, 2000);
            }
        });
        
        retryBtn.addEventListener('click', async () => {
            closeDialog();
            logDevice('已关闭 ADB Server，正在重试连接...');
            resolve('retry');
        });
        
        cancelBtn.addEventListener('click', () => {
            closeDialog();
            resolve('cancel');
        });
        
        function closeDialog() {
            const dialog = document.getElementById('usb-conflict-dialog');
            const mask = document.getElementById('usb-conflict-mask');
            if (dialog) dialog.remove();
            if (mask) mask.remove();
        }
    });
};


function logDevice(message) {
    console.log(message);
    const deviceLogElement = document.getElementById('device-log');
    if (deviceLogElement) {
        deviceLogElement.textContent = deviceLogElement.textContent + message + '\n';
    }
}


function clearDeviceLog() {
    const deviceLogElement = document.getElementById('device-log');
    if (deviceLogElement) {
        deviceLogElement.textContent = '';
    }
}


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
        
        
        window.adbClient = null;
        window.adbDevice = null;
        window.adbTransport = null;
        setDeviceName(null);
    }
};


let connectWithDevice = async (webusbDevice, adbApi, adbCredentialWeb) => {
    try {
        logDevice('设备: ' + webusbDevice.name + ' (Serial: ' + webusbDevice.serial + ')');
        
        
        logDevice('正在创建 ADB 连接...');
        
        
        const AdbCredentialStore = adbCredentialWeb.default;
        const AdbNamespace = adbApi;
        const Adb = AdbNamespace.Adb;
        const AdbDaemonTransport = AdbNamespace.AdbDaemonTransport;
        
        
        const connection = await webusbDevice.connect();
        logDevice('WebUSB 连接已建立');
        
        
        const credentialStore = new AdbCredentialStore('Jetour ADB Tool');
        
        
        
        
        
        
        
        logDevice('正在进行 ADB RSA 鉴权...');
        
        const transport = await AdbDaemonTransport.authenticate({
            serial: webusbDevice.serial,
            connection: connection,
            credentialStore: credentialStore
        });
        logDevice('ADB 传输层已建立（RSA 鉴权成功）');
        
        
        logDevice('正在创建 ADB 客户端...');
        const adb = new Adb(transport);
        logDevice('ADB 客户端已创建');
        
        
        window.adbClient = adb;
        window.adbDevice = webusbDevice;
        window.adbTransport = connection;
        
        
        logDevice('获取设备信息...');
        const model = await adb.subprocess.noneProtocol.spawnWaitText(["getprop", "ro.product.model"]);
        const manufacturer = await adb.subprocess.noneProtocol.spawnWaitText(["getprop", "ro.product.manufacturer"]);
        const brand = await adb.subprocess.noneProtocol.spawnWaitText(["getprop", "ro.product.brand"]);
        const device = await adb.subprocess.noneProtocol.spawnWaitText(["getprop", "ro.product.device"]);
        const productName = await adb.subprocess.noneProtocol.spawnWaitText(["getprop", "ro.product.name"]);
        const board = await adb.subprocess.noneProtocol.spawnWaitText(["getprop", "ro.product.board"]);
        const hardware = await adb.subprocess.noneProtocol.spawnWaitText(["getprop", "ro.hardware"]);
        
        
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
        
        
        startDeviceMonitoring();
        
        
        window.isConnecting = false;
        
    } catch (e) {
        logDevice('连接失败: ' + e.message);
        console.error('ADB connection error:', e);
        
        
        if (e.message && (e.message.includes('Unable to claim interface') || e.message.includes('Busy') || e.message.includes('already in used') || e.message.includes('claimed'))) {
            logDevice('错误原因：USB 接口被其他程序占用');
            logDevice('解决方案：请关闭占用 USB 的程序后刷新页面重试');
        } else if (e.message && (e.message.includes('auth') || e.message.includes('unauthorized') || e.message.includes('UnauthorizedError'))) {
            logDevice('错误原因：ADB RSA 密钥鉴权失败');
            logDevice('解决方案：请在车机上点击"允许USB调试"，或在车机开发者选项中撤销 USB 调试授权后重新连接');
        } else if (e.message && e.message.includes('transferOut')) {
            logDevice('错误原因：USB 传输错误，可能是连接不稳定');
            logDevice('建议：检查 USB 线是否牢固，尝试更换 USB 端口');
        }
        
        
        window.isConnecting = false;
    }
};


let disconnectSilently = async () => {
    try {
        if (window.adbClient) {
            logDevice('检测到已有连接，正在断开旧连接...');
            await window.adbClient.close();
        }
    } catch (e) {
        console.error('关闭 ADB 客户端失败:', e);
    }
    
    try {
        if (window.adbTransport && window.adbTransport.close) {
            await window.adbTransport.close();
        }
    } catch (e) {
        console.error('关闭 WebUSB 传输失败:', e);
    }
    
    try {
        if (window.adbDevice && window.adbDevice.close) {
            await window.adbDevice.close();
        }
    } catch (e) {
        console.error('关闭 WebUSB 设备失败:', e);
    }
    
    window.adbClient = null;
    window.adbDevice = null;
    window.adbTransport = null;
    setDeviceName(null);
    stopDeviceMonitoring();
    logDevice('旧连接已断开');
};


let connectDevice = async () => {
    if (window.isConnecting) {
        logDevice('正在连接中...');
        return;
    }
    
    window.isConnecting = true;
    
    try {
        
        if (window.adbClient || window.adbTransport || window.adbDevice) {
            await disconnectSilently();
        }
        
        
        let attempts = 0;
        while (!window.Adb && !window.TangoADB && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        
        
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
        
        logDevice('正在连接设备（WebUSB 模式）...');
        
        
        let devices = [];
        try {
            devices = await manager.getDevices();
        } catch (e) {}
        
        
        if (devices.length === 0) {
            
            await disconnectSilently();
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
        
        
        logDevice('建立 ADB 连接...');
        await connectWithDevice(devices[0], adbApi, adbCredentialWeb);
        window.isConnecting = false;
        
    } catch (error) {
        const msg = error.message || error.toString();
        logDevice('连接失败: ' + msg);
        
        
        if (msg.includes('Unable to claim interface') || msg.includes('claim')) {
            logDevice('检测到 USB 接口冲突，请停止电脑 ADB 服务，执行 adb kill-server');
            logDevice('检测到 USB 接口冲突，显示解决方案...');
            const result = await showUsbConflictDialog();
            if (result === 'retry') {
                logDevice('用户已执行 adb kill-server，重试连接...');
                window.isConnecting = false;
                await connectDevice();
                return;
            }
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


let deviceMonitoringInterval = null;


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


let stopDeviceMonitoring = () => {
    if (deviceMonitoringInterval) {
        clearInterval(deviceMonitoringInterval);
        deviceMonitoringInterval = null;
    }
};


let setDeviceName = async (name) => {
    if (!name) {
        name = '🚗 未连接';
    }
    const statusElement = document.getElementById('device-status');
    if (statusElement) {
        statusElement.textContent = name;
    }
};


let initDeviceDetection = async () => {
    try {
        if (!navigator.usb) {
            logDevice('浏览器不支持 WebUSB，请使用 Chrome 或 Edge');
            return;
        }
        
        
        navigator.usb.addEventListener('connect', async () => {
            logDevice('检测到 USB 设备插入');
            if (!window.isConnecting && !window.adbClient) {
                await connectDevice();
            }
        });
        
        
        navigator.usb.addEventListener('disconnect', () => {
            logDevice('USB 设备已断开');
            if (window.adbClient) {
                disconnectSilently();
            }
        });
        
        
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


let push = async (filePath, blob) => {
    
    if (window.adbClient) {
        clear();
        showProgress(true);
        try {
            log("正在推送 " + filePath + " ...");
            
            
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            
            const readableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(uint8Array);
                    controller.close();
                }
            });
            
            
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
    
    
    alert('未连接到设备，请先点击"开始连接"按钮连接设备');
    showProgress(false);
};


let exec_shell = async (command) => {
    
    if (window.adbClient) {
        clear();
        showProgress(true);
        log('开始执行指令: ' + command + '\n');
        try {
            
            
            const result = await window.adbClient.subprocess.noneProtocol.spawnWaitText([command]);
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
    
    
    alert('未连接到设备，请先点击"开始连接"按钮连接设备');
    showProgress(false);
};


let execShellAndGetOutput = async (command) => {
    
    if (window.adbClient) {
        let output = "";
        try {
            
            
            const result = await window.adbClient.subprocess.noneProtocol.spawnWaitText([command]);
            output = result;
            log(output); 
            return output;
        } catch (error) {
            console.error('Tango ADB shell error:', error);
            log('执行命令失败: ' + (error.message || error.toString()));
            return "";
        }
    }
    
    
    alert('未连接到设备，请先点击"开始连接"按钮连接设备');
    return "";
};


let exec_command = async (args) => {
    const command = document.getElementById('shell').value;
    if (!command) {
        alert('请输入命令');
        return;
    }
    
    
    if (window.adbClient) {
        clear();
        showProgress(true);
        log('开始执行指令: ' + command + '\n');
        try {
            
            
            const result = await window.adbClient.subprocess.noneProtocol.spawnWaitText([command]);
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
    
    
    alert('未连接到设备，请先点击"开始连接"按钮连接设备');
};


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
    
    if (typeof window !== 'undefined') {
        window.connectDevice = connectDevice;
    }
} catch (e) {
    
}