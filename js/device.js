// 设备管理相关功能
// 参考 Tango ADB 的架构设计

// 全局变量
window.adbDevice = null;
window.adbTransport = null;

// 设备日志记录
function logDevice(message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    const deviceLogElement = document.getElementById('device-log');
    if (deviceLogElement) {
        deviceLogElement.textContent += logEntry;
        deviceLogElement.scrollTop = deviceLogElement.scrollHeight;
    }
    
    // 同时输出到控制台，方便调试
    console.log(`[Device] ${message}`);
}

// 清除设备日志
function clearDeviceLog() {
    const deviceLogElement = document.getElementById('device-log');
    if (deviceLogElement) {
        deviceLogElement.textContent = '';
    }
}

// 点击检测提示
let initWebUSB = async (device) => {
    // 更详细的浏览器检测
    const isSupported = checkWebUSBSupport();
    if (!isSupported || !navigator.usb) {
        alert('检测到您的浏览器不支持，请根据顶部的 "警告提示" 更换指定浏览器使用。');
        return false;
    }
    
    // 显示浏览器信息用于调试
    const userAgent = navigator.userAgent;
    log('浏览器信息:', userAgent);
    logDevice('浏览器信息: ' + userAgent);
    
    clear();
    try {
        // 使用新的 WebUSB 传输
        logDevice('正在初始化 WebUSB 设备...');
        
        if (device) {
            // 使用用户已选择的设备
            window.adbTransport = new WebUsbTransport(device);
        } else {
            // 请求新设备
            window.adbTransport = await WebUsbTransport.requestDevice();
        }
        
        await window.adbTransport.open();
        log('WebUSB 传输初始化成功');
        logDevice('WebUSB 传输初始化成功');
        return true;
    } catch (error) {
        log('WebUSB 初始化失败:', error);
        logDevice('WebUSB 初始化失败: ' + (error.message || error.toString()));
        if (error.message) {
            if (error.message.indexOf('No device') != -1 || error.name === 'NotFoundError') { // 未选中设备
                log('用户取消选择设备');
                logDevice('用户取消选择设备');
                return false;
            } else if (error.message.indexOf('was disconnected') != -1) {
                alert('无法连接到此设备，请断开重新尝试。');
                logDevice('设备已断开连接');
            } else {
                alert('初始化 WebUSB 失败: ' + error.message);
            }
        } else {
            alert('初始化 WebUSB 失败，请检查浏览器版本。');
        }
        return false;
    }
};

// 扫描 USB 端口设备
let scanUsbDevices = async () => {
    log('开始扫描 USB 端口设备...');
    logDevice('开始扫描 USB 端口设备...');
    
    // 扫描逻辑
    const devices = [];
    
    // 1. 扫描 WebUSB 设备
    try {
        const webusbDevices = await navigator.usb.getDevices();
        webusbDevices.forEach(device => {
            devices.push({
                type: 'WebUSB',
                name: device.productName || 'USB设备',
                vendorId: device.vendorId,
                productId: device.productId,
                device: device
            });
        });
        log(`发现 ${webusbDevices.length} 个 WebUSB 设备`);
        logDevice(`发现 ${webusbDevices.length} 个 WebUSB 设备`);
        
        // 记录每个设备的详细信息
        webusbDevices.forEach((device, index) => {
            logDevice(`设备 ${index + 1}: ${device.productName || 'USB设备'} (VID: ${device.vendorId}, PID: ${device.productId})`);
        });
    } catch (error) {
        log('WebUSB 设备扫描失败:', error);
        logDevice('WebUSB 设备扫描失败: ' + (error.message || error.toString()));
    }
    
    // 2. 扫描 5555 端口（ADB 无线调试）
    try {
        log('正在扫描 5555 端口...');
        logDevice('正在扫描 5555 端口...');
        // 这里可以添加网络扫描逻辑
        devices.push({
            type: 'Network',
            name: 'ADB 无线调试 (5555端口)',
            port: 5555,
            description: '可能的无线调试设备'
        });
        logDevice('发现 5555 端口（ADB 无线调试）');
    } catch (error) {
        log('5555 端口扫描失败:', error);
        logDevice('5555 端口扫描失败: ' + (error.message || error.toString()));
    }
    
    return devices;
};

// 显示设备选择弹窗
let showDeviceSelection = (devices) => {
    return new Promise((resolve, reject) => {
        if (devices.length === 0) {
            alert('未发现任何设备，请检查连接后重试。');
            reject(new Error('No devices found'));
            return;
        }
        
        // 创建设备选择内容
        let content = '<div style="max-height: 300px; overflow-y: auto;">';
        devices.forEach((device, index) => {
            let deviceInfo = '';
            if (device.type === 'WebUSB') {
                deviceInfo = `WebUSB 设备: ${device.name} (VID: ${device.vendorId}, PID: ${device.productId})`;
            } else if (device.type === 'Network') {
                deviceInfo = `网络设备: ${device.name}`;
            }
            
            content += `<div style="padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;" onclick="selectDevice(${index})" id="device-${index}">`;
            content += `<div style="font-weight: bold;">${deviceInfo}</div>`;
            content += '</div>';
        });
        content += '</div>';
        
        // 添加设备选择函数到全局
        let selectedDeviceIndex = -1;
        
        window.selectDevice = (index) => {
            // 清除之前的选择
            const deviceElements = document.querySelectorAll('[id^="device-"]');
            deviceElements.forEach(element => {
                element.style.border = '1px solid #ddd';
                element.style.backgroundColor = '';
            });
            
            // 选中当前设备
            selectedDeviceIndex = index;
            const selectedElement = document.getElementById(`device-${index}`);
            if (selectedElement) {
                selectedElement.style.border = '2px solid #007bff';
                selectedElement.style.backgroundColor = '#e3f2fd';
            }
        };
        
        // 添加刷新设备函数到全局
        window.refreshDevices = async () => {
            try {
                // 显示加载状态
                const modalBody = document.querySelector('.custom-modal-body');
                if (modalBody) {
                    modalBody.innerHTML = '<div style="text-align: center; padding: 20px;">正在刷新设备...</div>';
                }
                
                // 重新扫描设备
                logDevice('开始刷新设备列表...');
                const refreshedDevices = await scanUsbDevices();
                
                // 更新设备列表
                let updatedContent = '<div style="max-height: 300px; overflow-y: auto;">';
                refreshedDevices.forEach((device, index) => {
                    let deviceInfo = '';
                    if (device.type === 'WebUSB') {
                        deviceInfo = `WebUSB 设备: ${device.name} (VID: ${device.vendorId}, PID: ${device.productId})`;
                    } else if (device.type === 'Network') {
                        deviceInfo = `网络设备: ${device.name}`;
                    }
                    
                    updatedContent += `<div style="padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;" onclick="selectDevice(${index})" id="device-${index}">`;
                    updatedContent += `<div style="font-weight: bold;">${deviceInfo}</div>`;
                    updatedContent += '</div>';
                });
                updatedContent += '</div>';
                
                // 更新弹窗内容
                if (modalBody) {
                    modalBody.innerHTML = updatedContent;
                }
                
                // 更新设备列表引用
                devices = refreshedDevices;
                // 重置选中状态
                selectedDeviceIndex = -1;
                
                logDevice('设备列表刷新完成');
            } catch (error) {
                logDevice('刷新设备列表失败: ' + (error.message || error.toString()));
                alert('刷新设备列表失败，请重试');
            }
        };
        
        // 创建自定义弹窗内容，包含所有按钮
        const modalContent = `
            <div class="custom-modal-content">
                <div class="custom-modal-header">
                    <h4 class="custom-modal-title">选择设备</h4>
                </div>
                <div class="custom-modal-body">
                    ${content}
                </div>
                <div class="custom-modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
                    <button class="custom-modal-btn custom-modal-btn-secondary" onclick="refreshDevices()">刷新设备</button>
                    <div style="display: flex; gap: 10px;">
                        <button class="custom-modal-btn custom-modal-btn-secondary" onclick="closeModal()">取消</button>
                        <button class="custom-modal-btn custom-modal-btn-primary" onclick="confirmDeviceSelection()">确定连接</button>
                    </div>
                </div>
            </div>
        `;
        
        // 添加确认设备选择函数到全局
        window.confirmDeviceSelection = () => {
            if (selectedDeviceIndex === -1) {
                // 没有选择设备，提示用户
                alert('请先选择要连接的设备');
            } else {
                // 使用选中的设备
                resolve(devices[selectedDeviceIndex]);
                closeModal();
                cleanup();
            }
        };
        
        // 清理函数
        function cleanup() {
            delete window.selectDevice;
            delete window.refreshDevices;
            delete window.confirmDeviceSelection;
        }
        
        // 显示自定义弹窗
        const modal = document.getElementById('customModal');
        if (modal) {
            modal.innerHTML = modalContent;
            modal.style.display = 'block';
        }
        
        // 确保弹窗关闭时清理全局函数
        const originalCloseModal = window.closeModal;
        window.closeModal = () => {
            originalCloseModal();
            reject(new Error('User canceled'));
            cleanup();
        };
    });
};

// 连接设备
let connect = async () => {
    try {
        clearDeviceLog();
        logDevice('开始连接设备...');
        
        // 1. 扫描设备
        const devices = await scanUsbDevices();
        
        // 2. 显示设备选择弹窗
        logDevice('显示设备选择弹窗...');
        const selectedDevice = await showDeviceSelection(devices);
        logDevice('已选择设备: ' + selectedDevice.name);
        
        // 3. 根据设备类型连接
        if (selectedDevice.type === 'WebUSB') {
            // WebUSB 设备连接
            logDevice('正在连接 WebUSB 设备...');
            const initialized = await initWebUSB(selectedDevice.device);
            if (!initialized || !window.adbTransport) {
                logDevice('WebUSB 初始化失败');
                return;
            }
            
            window.adbDevice = null;
            
            // 创建 ADB 设备并连接
            logDevice('正在创建 ADB 设备...');
            window.adbDevice = new AdbDevice(window.adbTransport);
            await window.adbDevice.connect("host::web", () => {
                alert('请在您的设备上允许 ADB 调试');
                logDevice('请在您的设备上允许 ADB 调试');
            });
            
            if (window.adbDevice && window.adbDevice.connected) {
                let deviceName = window.adbDevice.banner || '设备';
                setDeviceName(deviceName);
                console.log('设备连接成功:', window.adbDevice);
                logDevice('设备连接成功: ' + deviceName);
                
                let toast = document.getElementById('success-toast');
                toast.style.visibility = 'visible';
                setTimeout(function() {
                    toast.style.visibility = 'hidden';
                }, 3000);
                
                // 开始持续检测设备状态
                startDeviceMonitoring();
            }
        } else if (selectedDevice.type === 'Network' && selectedDevice.port === 5555) {
            // 5555 端口连接
            alert('5555 端口连接功能正在开发中，请使用 WebUSB 连接方式。');
            logDevice('5555 端口连接功能正在开发中');
        }
    } catch (error) {
        log('设备连接失败:', error);
        logDevice('设备连接失败: ' + (error.message || error.toString()));
        window.adbDevice = null;
        window.adbTransport = null;
        
        if (error.message && error.message.indexOf('Authentication required') != -1) {
            alert('需要在设备上允许 ADB 调试');
            logDevice('需要在设备上允许 ADB 调试');
        } else if (error.message && error.message.indexOf('User canceled') != -1) {
            // 用户取消连接，不显示错误
            logDevice('用户取消连接');
        } else if (error.message && error.message.indexOf('Refresh devices') != -1) {
            // 用户点击了刷新设备，重新执行连接流程
            logDevice('用户请求刷新设备列表');
            connect();
        } else {
            alert('连接失败，请断开重新尝试。');
        }
    }
};

// 断开连接
let disconnect = async () => {
    if (!window.adbDevice && !window.adbTransport) {
        return;
    }
    
    const confirmed = confirm("是否断开连接？");
    if (!confirmed) {
        return; // 用户点击了取消，则不执行操作
    }
    
    try {
        logDevice('正在断开连接...');
        
        if (window.adbDevice) {
            await window.adbDevice.disconnect();
            window.adbDevice = null;
        } else if (window.adbTransport) {
            await window.adbTransport.close();
            window.adbTransport = null;
        }
        setDeviceName(null);
        log('设备已断开连接');
        logDevice('设备已断开连接');
        
        // 停止设备监控
        stopDeviceMonitoring();
    } catch (error) {
        log('断开连接失败:', error);
        logDevice('断开连接失败: ' + (error.message || error.toString()));
    }
};

// 设备状态监控
let deviceMonitoringInterval = null;

// 开始持续检测设备状态
let startDeviceMonitoring = () => {
    // 清除之前的监控
    stopDeviceMonitoring();
    
    // 每5秒检测一次设备状态
    deviceMonitoringInterval = setInterval(async () => {
        try {
            if (window.adbDevice && window.adbDevice.connected) {
                // 可以执行一些简单的命令来检测设备是否仍然响应
                // 例如，获取设备状态
                logDevice('设备状态: 已连接');
            } else {
                logDevice('设备状态: 已断开');
                setDeviceName(null);
                stopDeviceMonitoring();
            }
        } catch (error) {
            logDevice('设备监控失败: ' + (error.message || error.toString()));
            setDeviceName(null);
            stopDeviceMonitoring();
        }
    }, 5000);
    
    logDevice('开始持续监控设备状态');
};

// 停止设备状态监控
let stopDeviceMonitoring = () => {
    if (deviceMonitoringInterval) {
        clearInterval(deviceMonitoringInterval);
        deviceMonitoringInterval = null;
        logDevice('停止监控设备状态');
    }
};

// 当前设备状态
let setDeviceName = async (name) => {
    if (!name) {
        name = '未连接';
    }
    document.getElementById('device-status').textContent = name;
    logDevice('设备状态更新: ' + name);
};

// 初始化设备检测
let initDeviceDetection = async () => {
    try {
        // 检测浏览器支持
        const isSupported = checkWebUSBSupport();
        if (isSupported && navigator.usb) {
            logDevice('浏览器支持 WebUSB');
            
            // 初始化时检查是否有已连接的设备
            logDevice('初始化时检查已连接的设备...');
            const webusbDevices = await navigator.usb.getDevices();
            if (webusbDevices.length > 0) {
                logDevice(`发现 ${webusbDevices.length} 个已连接的 WebUSB 设备`);
                webusbDevices.forEach((device, index) => {
                    logDevice(`设备 ${index + 1}: ${device.productName || 'USB设备'} (VID: ${device.vendorId}, PID: ${device.productId})`);
                });
            } else {
                logDevice('未发现已连接的 WebUSB 设备');
            }
        } else {
            logDevice('浏览器不支持 WebUSB');
        }
    } catch (error) {
        logDevice('设备检测初始化失败: ' + (error.message || error.toString()));
    }
};

// 页面加载完成后初始化
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        // 初始化设备日志
        const deviceLogElement = document.getElementById('device-log');
        if (deviceLogElement) {
            deviceLogElement.textContent = '[初始化] 设备情况日志已就绪\n';
        }
        
        // 初始化设备检测
        initDeviceDetection();
    });
}

// 推送应用
let push = async (filePath, blob) => {
    if (!window.adbDevice) {
        alert("未连接到设备");
        return;
    }
    
    clear();
    showProgress(true);
    try {
        log("正在推送 " + filePath + " ...");
        
        // 转换 blob 为 ArrayBuffer
        const arrayBuffer = await blob.arrayBuffer();
        
        // 使用新的 sync 协议推送
        const syncStream = await window.adbDevice.sync();
        try {
            // 这里需要实现完整的 sync 协议
            // 暂时使用简单的 shell 命令推送
            const shellStream = await window.adbDevice.shell(`cat > ${filePath} && chmod 0644 ${filePath}`);
            try {
                await shellStream.send(arrayBuffer);
                await shellStream.close();
                log("推送成功！");
            } finally {
                await shellStream.close();
            }
        } finally {
            await syncStream.close();
        }
    } catch (error) {
        log('推送失败:', error);
        alert("推送失败，请断开重新尝试。");
    }
    showProgress(false);
};

// 执行命令
let exec_shell = async (command) => {
    if (!window.adbDevice) {
        alert("未连接到设备");
        return;
    }
    if (!command) {
        return;
    }
    
    clear();
    showProgress(true);
    log('开始执行指令: ' + command + '\n');
    
    try {
        const shellStream = await window.adbDevice.shell(command);
        try {
            let data;
            while ((data = await shellStream.receive()) !== null) {
                const decoder = new TextDecoder('utf-8');
                const txt = decoder.decode(data);
                log(txt);
            }
        } finally {
            await shellStream.close();
        }
    } catch (error) {
        log('命令执行失败:', error);
        console.error("命令执行失败，请断开重新尝试");
    }
    showProgress(false);
};

// 执行命令并返回输出
let execShellAndGetOutput = async (command) => {
    if (!window.adbDevice) {
        alert("未连接到设备");
        return "";
    }
    if (!command) {
        return "";
    }
    
    let output = "";
    try {
        const shellStream = await window.adbDevice.shell(command);
        try {
            let data;
            while ((data = await shellStream.receive()) !== null) {
                const decoder = new TextDecoder('utf-8');
                const txt = decoder.decode(data);
                output += txt;
                log(txt); // 同时输出到日志
            }
        } finally {
            await shellStream.close();
        }
    } catch (error) {
        log('命令执行失败:', error);
        throw error;
    }
    return output;
};

// 手动执行命令
let exec_command = async (args) => {
    exec_shell(document.getElementById('shell').value);
};

// 导出函数
try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            initWebUSB,
            connect,
            disconnect,
            setDeviceName,
            push,
            exec_shell,
            execShellAndGetOutput,
            exec_command,
            adbDevice,
            adbTransport
        };
    }
} catch (e) {
    // 浏览器环境，不需要导出
}