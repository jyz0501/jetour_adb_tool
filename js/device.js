// 设备管理相关功能
// 使用 Tango ADB 原生 API

// 全局变量
window.adbDevice = null;
window.adbTransport = null;
window.isConnecting = false;
window.browserSupport = null; // 全局浏览器支持状态

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

// 点击检测提示
let initWebUSB = async (device) => {
    clear();
    try {
        // 使用新的 WebUSB 传输
        console.log('正在初始化 WebUSB 设备...');

        if (device) {
            // 使用用户已选择的设备
            window.adbTransport = new WebUsbTransport(device);
        } else {
            // 请求新设备
            window.adbTransport = await WebUsbTransport.requestDevice();
        }

        await window.adbTransport.open();
        console.log('WebUSB 传输初始化成功');
        return true;
    } catch (error) {
        console.log('WebUSB 初始化失败:', error);
        if (error.message) {
            if (error.message.indexOf('No device') != -1 || error.name === 'NotFoundError') {
                console.log('用户取消选择设备');
                return false;
            } else if (error.message.indexOf('was disconnected') != -1) {
                alert('无法连接到此设备，请断开重新尝试。');
            } else if (error.message.indexOf('Unable to claim interface') != -1) {
                alert('设备接口被其他程序占用，请尝试以下步骤：\n\n1. 关闭电脑上运行的其他 ADB 工具（如 Android Studio、ADB Helper）\n2. 在终端运行 "adb kill-server" 断开所有连接\n3. 重新插拔 USB 线\n4. 刷新页面后重新连接');
            } else {
                alert('初始化 WebUSB 失败: ' + error.message);
            }
        } else {
            alert('初始化 WebUSB 失败，请检查浏览器版本。');
        }
        return false;
    }
};

// 扫描网络 ADB 设备
let scanNetworkAdbDevices = async () => {
    log('开始扫描网络 ADB 设备...');
    logDevice('开始扫描网络 ADB 设备...');
    
    const networkDevices = [];
    const defaultPort = 5555;
    
    try {
        // 1. 尝试连接本地 5555 端口
        logDevice('正在检查本地 5555 端口...');
        networkDevices.push({
            type: 'Network',
            name: '本地 ADB 无线调试',
            host: '127.0.0.1',
            port: defaultPort,
            description: '本地无线调试设备'
        });
        
        // 2. 尝试连接常用的 ADB 无线调试地址
        const commonAddresses = [
            '192.168.1.1',
            '192.168.0.1',
            '192.168.1.100',
            '192.168.0.100'
        ];
        
        for (const address of commonAddresses) {
            networkDevices.push({
                type: 'Network',
                name: `ADB 无线调试 (${address})`,
                host: address,
                port: defaultPort,
                description: `可能的无线调试设备 at ${address}:${defaultPort}`
            });
        }
        
        logDevice(`发现 ${networkDevices.length} 个可能的网络 ADB 设备`);
    } catch (error) {
        log('网络 ADB 设备扫描失败:', error);
        logDevice('网络 ADB 设备扫描失败: ' + (error.message || error.toString()));
    }
    
    return networkDevices;
};

// 扫描 USB 端口设备
let scanUsbDevices = async () => {
    log('开始扫描有线 USB 设备...');
    logDevice('开始扫描有线 USB 设备...');
    
    const devices = [];
    
    // 1. 先获取已授权的 WebUSB 设备
    try {
        const authorizedDevices = await navigator.usb.getDevices();
        authorizedDevices.forEach(device => {
            devices.push({
                type: 'WebUSB',
                name: device.productName || 'USB设备',
                vendorId: device.vendorId,
                productId: device.productId,
                device: device,
                authorized: true
            });
        });
        log(`已发现 ${authorizedDevices.length} 个已授权 USB 设备`);
        logDevice(`已发现 ${authorizedDevices.length} 个已授权 USB 设备`);
    } catch (error) {
        log('获取已授权设备失败:', error);
        logDevice('获取已授权设备失败: ' + (error.message || error.toString()));
    }
    
    // 2. 尝试请求新设备（让用户可以选择更多USB设备）
    try {
        // 使用宽泛的过滤器，扫描所有USB设备
        const newDevice = await navigator.usb.requestDevice({
            filters: [
                { classCode: 255, subclassCode: 66, protocolCode: 1 }, // ADB
                { classCode: 255, subclassCode: 66, protocolCode: 3 }, // Fastboot
                { classCode: 255 }, // 全部 USB 设备
            ]
        });
        
        // 检查是否已存在
        const exists = devices.some(d => 
            d.vendorId === newDevice.vendorId && d.productId === newDevice.productId
        );
        
        if (!exists) {
            devices.push({
                type: 'WebUSB',
                name: newDevice.productName || 'USB设备',
                vendorId: newDevice.vendorId,
                productId: newDevice.productId,
                device: newDevice,
                authorized: false
            });
            log('发现新 USB 设备');
            logDevice('发现新 USB 设备: ' + (newDevice.productName || 'USB设备'));
        }
    } catch (error) {
        if (error.name !== 'NotFoundError') {
            log('请求设备失败:', error);
            logDevice('请求设备失败: ' + (error.message || error.toString()));
        }
        // NotFoundError 表示用户取消选择，正常情况不需要提示
    }
    
    // 记录每个设备的详细信息
    devices.forEach((device, index) => {
        const authStatus = device.authorized ? '(已授权)' : '(待授权)';
        logDevice(`设备 ${index + 1}: ${device.name} ${authStatus} (VID: ${device.vendorId}, PID: ${device.productId})`);
    });
    
    log(`共发现 ${devices.length} 个 USB 设备`);
    logDevice(`共发现 ${devices.length} 个 USB 设备`);
    
    return devices;
};

// 显示设备选择弹窗
let showDeviceSelection = (devices) => {
    return new Promise((resolve, reject) => {
        // 创建设备选择内容
        let content = '<div style="max-height: 200px; overflow-y: auto;">';

        if (devices.length === 0) {
            // 没有设备时显示友好的提示
            content += `
                <div style="padding: 20px; text-align: center; color: #666;">
                    <div style="font-size: 36px; margin-bottom: 10px;">🔍</div>
                    <div style="font-size: 14px; margin-bottom: 8px;">未发现任何设备</div>
                    <div style="font-size: 11px; color: #999; line-height: 1.5;">
                        请检查：USB线连接、USB调试模式、设备授权
                    </div>
                </div>
            `;
        } else {
            // 有设备时显示设备列表
            devices.forEach((device, index) => {
                let deviceInfo = '';
                let authBadge = '';
                if (device.type === 'WebUSB') {
                    authBadge = device.authorized 
                        ? '<span style="color: #4caf50; font-size: 11px;">✓ 已授权</span>' 
                        : '<span style="color: #ff9800; font-size: 11px;">⚠ 待授权</span>';
                    deviceInfo = `USB 设备: ${device.name} ${authBadge} (VID: ${device.vendorId}, PID: ${device.productId})`;
                }

                if (deviceInfo) {
                    content += `<div style="padding: 8px; margin: 4px 0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;" onclick="selectDevice(${index})" id="device-${index}">`;
                    content += `<div style="font-weight: bold; font-size: 13px;">${deviceInfo}</div>`;
                    content += '</div>';
                }
            });
        }
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
                let updatedContent = '<div style="max-height: 200px; overflow-y: auto;">';

                if (refreshedDevices.length === 0) {
                    // 没有设备时显示友好的提示
                    updatedContent += `
                        <div style="padding: 20px; text-align: center; color: #666;">
                            <div style="font-size: 36px; margin-bottom: 10px;">🔍</div>
                            <div style="font-size: 14px; margin-bottom: 8px;">未发现任何设备</div>
                            <div style="font-size: 11px; color: #999; line-height: 1.5;">
                                请检查：USB线连接、USB调试模式、设备授权
                            </div>
                        </div>
                    `;
                } else {
                    // 有设备时显示设备列表
                    refreshedDevices.forEach((device, index) => {
                        let deviceInfo = '';
                        let authBadge = '';
                        if (device.type === 'WebUSB') {
                            authBadge = device.authorized 
                                ? '<span style="color: #4caf50; font-size: 11px;">✓ 已授权</span>' 
                                : '<span style="color: #ff9800; font-size: 11px;">⚠ 待授权</span>';
                            deviceInfo = `USB 设备: ${device.name} ${authBadge} (VID: ${device.vendorId}, PID: ${device.productId})`;
                        }

                        if (deviceInfo) {
                            updatedContent += `<div style="padding: 8px; margin: 4px 0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;" onclick="selectDevice(${index})" id="device-${index}">`;
                            updatedContent += `<div style="font-weight: bold; font-size: 13px;">${deviceInfo}</div>`;
                            updatedContent += '</div>';
                        }
                    });
                }
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
        
        // 清理函数
        function cleanup() {
            delete window.selectDevice;
            delete window.refreshDevices;
        }
        
        // 使用原始的 showModal 函数显示设备选择弹窗
        showModal('选择设备', content, {
            showCancel: true,
            cancelText: '取消',
            confirmText: '确定连接',
            callback: function(confirmed) {
                if (confirmed) {
                    if (devices.length === 0) {
                        // 没有设备，提示用户刷新
                        alert('未发现设备，请点击"刷新设备"按钮重新扫描');
                        // 返回 false 阻止关闭弹窗
                        return false;
                    } else if (selectedDeviceIndex === -1) {
                        // 有设备但没选择，提示用户
                        alert('请先选择要连接的设备');
                        // 返回 false 阻止关闭弹窗
                        return false;
                    } else {
                        // 使用选中的设备
                        resolve(devices[selectedDeviceIndex]);
                        // 返回 true 允许关闭弹窗（通过 closeModal 关闭）
                        closeModal();
                        cleanup();
                        return true;
                    }
                } else {
                    reject(new Error('User canceled'));
                    cleanup();
                    return true;
                }
            }
        });
        
        // 添加刷新按钮到弹窗底部
        const modalFooter = document.getElementById('modalFooter');
        if (modalFooter) {
            // 在取消按钮前添加刷新按钮
            const refreshBtn = document.createElement('button');
            refreshBtn.className = 'custom-modal-btn custom-modal-btn-secondary';
            refreshBtn.textContent = '刷新设备';
            refreshBtn.onclick = refreshDevices;
            modalFooter.insertBefore(refreshBtn, modalFooter.firstChild);
        }
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
        
        // 3. 连接 WebUSB 设备（开始连接）
        if (selectedDevice.type === 'WebUSB') {
            // WebUSB 设备连接
            logDevice('正在连接有线 USB 设备...');
            logDevice('设备信息: ' + selectedDevice.name + ' VID:' + selectedDevice.vendorId + ' PID:' + selectedDevice.productId);
            
            const initialized = await initWebUSB(selectedDevice.device);
            if (!initialized || !window.adbTransport) {
                logDevice('WebUSB 初始化失败');
                return;
            }
            
            window.adbDevice = null;
            
            // 创建 ADB 设备并连接
            logDevice('正在创建 ADB 设备...');
            window.adbDevice = new AdbDevice(window.adbTransport);
            logDevice('发送 ADB 连接请求，等待设备授权...');
            
            try {
                await window.adbDevice.connect("host::web", () => {
                    alert('请在您的设备上允许 ADB 调试');
                    logDevice('请在您的设备上允许 ADB 调试');
                });
            } catch (connectError) {
                logDevice('ADB 连接错误: ' + connectError.message);
                if (connectError.message.includes('authentication')) {
                    logDevice('设备需要授权，请确保手机上点击了"允许"');
                }
                throw connectError;
            }
            
            if (window.adbDevice && window.adbDevice.connected) {
                let deviceName = window.adbDevice.banner || '设备';
                let serialNumber = window.adbDevice.serial || '未知';
                setDeviceName('🚗 ' + deviceName + ' | ' + serialNumber);
                console.log('设备连接成功:', window.adbDevice);
                logDevice('===== ADB 连接成功 =====');
                logDevice('设备名称: ' + deviceName);
                logDevice('最大数据包: ' + window.adbDevice.maxPayload);
                logDevice('传输类型: ' + (window.adbTransport.constructor.name));
                logDevice('连接时间: ' + new Date().toLocaleString());
                
                let toast = document.getElementById('success-toast');
                toast.style.visibility = 'visible';
                setTimeout(function() {
                    toast.style.visibility = 'hidden';
                }, 3000);
                
                logDevice('');
                logDevice('提示: 可在终端运行 "adb devices" 查看设备列表');
                logDevice('');
                
                // 开始持续检测设备状态
                startDeviceMonitoring();
            }
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
    console.log('disconnect called, adbClient:', window.adbClient);
    
    if (!window.adbClient) {
        console.log('No device to disconnect');
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
        
        setDeviceName(null);
        logDevice('===== 设备已断开连接 =====');
        stopDeviceMonitoring();
    } catch (error) {
        console.error('Disconnect error:', error);
        log('断开连接失败:', error);
        logDevice('断开连接失败: ' + (error.message || error.toString()));
    }
};

// 显示无线设备选择弹窗
let showWirelessDeviceSelection = (devices) => {
    return new Promise((resolve, reject) => {
        // 创建设备选择内容
        let content = `
            <div style="max-height: 200px; overflow-y: auto; margin-bottom: 12px;">
                <h5 style="margin-top: 0; margin-bottom: 8px; font-size: 13px;">发现的无线设备：</h5>
        `;

        if (devices.length === 0) {
            content += '<div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">未在列表中发现设备<br>请在下方输入设备IP地址或点击"扫描网络"</div>';
        } else {
            devices.forEach((device, index) => {
                content += `
                    <div style="padding: 8px; margin: 4px 0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;" onclick="selectWirelessDevice(${index})" id="wireless-device-${index}">
                        <div style="font-weight: bold; font-size: 13px;">${device.name}</div>
                        <div style="font-size: 11px; color: #666;">${device.host}:${device.port}</div>
                        <div style="font-size: 11px; color: #999;">${device.description}</div>
                    </div>
                `;
            });
        }

        content += `
            </div>

            <div style="margin-bottom: 12px;">
                <h5 style="margin-top: 0; margin-bottom: 8px; font-size: 13px;">自定义 IP 和端口：</h5>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="text" id="customIp" placeholder="IP 地址" style="flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;" value="192.168.1.100">
                    <input type="number" id="customPort" placeholder="端口" style="width: 80px; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;" value="5555" min="1" max="65535">
                </div>
            </div>
        `;
        
        // 添加设备选择函数到全局
        let selectedDeviceIndex = -1;
        
        window.selectWirelessDevice = (index) => {
            // 清除之前的选择
            const deviceElements = document.querySelectorAll('[id^="wireless-device-"]');
            deviceElements.forEach(element => {
                element.style.border = '1px solid #ddd';
                element.style.backgroundColor = '';
            });
            
            // 选中当前设备
            selectedDeviceIndex = index;
            const selectedElement = document.getElementById(`wireless-device-${index}`);
            if (selectedElement) {
                selectedElement.style.border = '2px solid #007bff';
                selectedElement.style.backgroundColor = '#e3f2fd';
            }
        };
        
        // 添加刷新设备函数到全局
        window.refreshWirelessDevices = async () => {
            try {
                // 显示扫描进度
                const modalBody = document.querySelector('.custom-modal-body');
                if (modalBody) {
                    modalBody.innerHTML = `
                        <div style="padding: 20px;">
                            <div style="text-align: center; margin-bottom: 15px;">正在扫描局域网ADB设备...</div>
                            <div style="width: 100%; background-color: #e9ecef; border-radius: 4px; overflow: hidden;">
                                <div id="scan-progress-bar" style="width: 0%; height: 20px; background-color: #007bff; transition: width 0.3s;"></div>
                            </div>
                            <div id="scan-status" style="text-align: center; margin-top: 10px; font-size: 12px; color: #666;">正在获取本机IP...</div>
                        </div>
                    `;
                }

                logDevice('开始扫描局域网ADB设备...');

                // 通过 WebRTC 获取本机局域网IP
                const localIP = await getLocalIP();
                logDevice(`检测到本机IP: ${localIP}`);

                // 解析本机IP的网段
                let subnet = '192.168.1';
                if (localIP) {
                    const parts = localIP.split('.');
                    if (parts.length === 4) {
                        subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
                    }
                }

                logDevice(`扫描网段: ${subnet}.x`);

                // 扫描该网段的常用IP
                const scanTargets = [];
                // 添加网关
                scanTargets.push(`${subnet}.1`);
                // 添加常用设备IP范围
                for (let i = 2; i <= 20; i++) {
                    scanTargets.push(`${subnet}.${i}`);
                }
                for (let i = 100; i <= 120; i++) {
                    scanTargets.push(`${subnet}.${i}`);
                }

                const statusText = document.getElementById('scan-status');

                // 快速扫描：每个地址200ms延迟
                const scannedDevices = [];

                for (let i = 0; i < scanTargets.length; i++) {
                    const target = scanTargets[i];
                    const progress = Math.round(((i + 1) / scanTargets.length) * 100);

                    // 更新进度条
                    const progressBar = document.getElementById('scan-progress-bar');
                    const statusText = document.getElementById('scan-status');
                    if (progressBar) progressBar.style.width = progress + '%';
                    if (statusText) statusText.textContent = `正在扫描 ${target}:5555... (${progress}%)`;

                    // 模拟延迟（扫描每个地址）
                    await new Promise(resolve => setTimeout(resolve, 200));

                    // 注意：由于浏览器安全限制，无法真正检测TCP端口
                    // 这里只扫描局域网范围内的地址，提供常用IP给用户选择
                }

                // 显示扫描结果提示
                if (statusText) {
                    statusText.innerHTML = `扫描完成<br><span style="color: #999;">（网段: ${subnet}.x，浏览器限制无法检测端口，请手动连接）</span>`;
                }

                await new Promise(resolve => setTimeout(resolve, 500));

                // 清空设备列表，让用户手动输入
                showWirelessDeviceSelection([]).then(resolve).catch(reject);
            } catch (error) {
                logDevice('扫描网络设备失败: ' + (error.message || error.toString()));
                alert('扫描网络设备失败，请重试');
            }
        };
        
        // 清理函数
        function cleanup() {
            delete window.selectWirelessDevice;
            delete window.refreshWirelessDevices;
        }
        
        // 使用 showModal 函数显示弹窗
        showModal('无线设备连接', content, {
            showCancel: true,
            cancelText: '取消',
            confirmText: '连接',
            callback: function(confirmed) {
                if (confirmed) {
                    if (selectedDeviceIndex !== -1) {
                        // 使用选中的设备
                        resolve(devices[selectedDeviceIndex]);
                        cleanup();
                    } else {
                        // 使用自定义 IP 和端口
                        const customIp = document.getElementById('customIp').value;
                        const customPort = parseInt(document.getElementById('customPort').value);
                        
                        if (!customIp || isNaN(customPort)) {
                            alert('请输入有效的 IP 地址和端口');
                            // 重新显示弹窗
                            showWirelessDeviceSelection(devices).then(resolve).catch(reject);
                        } else {
                            resolve({
                                type: 'Network',
                                name: '自定义 IP 连接',
                                host: customIp,
                                port: customPort,
                                description: '自定义 IP 和端口连接'
                            });
                            cleanup();
                        }
                    }
                } else {
                    reject(new Error('User canceled'));
                    cleanup();
                }
            }
        });
        
        // 添加扫描网络按钮到弹窗底部
        const modalFooter = document.getElementById('modalFooter');
        if (modalFooter) {
            // 在取消按钮前添加扫描网络按钮
            const scanBtn = document.createElement('button');
            scanBtn.className = 'custom-modal-btn custom-modal-btn-secondary';
            scanBtn.textContent = '扫描网络';
            scanBtn.onclick = refreshWirelessDevices;
            modalFooter.insertBefore(scanBtn, modalFooter.firstChild);
        }
    });
};

// 检查浏览器支持并连接
let checkBrowserSupportAndConnect = async () => {
    // 防止重复连接
    if (window.adbClient && window.adbClient.connected) {
        logDevice('设备已连接，请勿重复点击');
        return;
    }
    
    // 防止重复连接请求
    if (window.isConnecting) {
        logDevice('正在连接中，请勿重复操作');
        return;
    }
    
    window.isConnecting = true;
    
    // 检测设备类型
    const isMobile = isMobileDevice();
    logDevice(`当前设备类型: ${isMobile ? '移动端' : 'PC'}`);
    
    try {
        // 检查浏览器是否支持 WebUSB
        if (window.browserSupport === null) {
            window.browserSupport = checkWebUSBSupport();
        }
        
        if (!window.browserSupport || !navigator.usb) {
            // 不支持，显示 Chrome 下载弹窗
            showChromeDownloadPopup();
            return;
        }
        
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
            return;
        }
        
        const DeviceManagerClass = adbDaemonWebUsb.AdbDaemonWebUsbDeviceManager;
        const manager = DeviceManagerClass.BROWSER;
        
        if (!manager) {
            logDevice('错误: 浏览器不支持 WebUSB');
            alert('您的浏览器不支持 WebUSB，请使用 Chrome 浏览器');
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
                    // 显示详细的设备信息
                    logDevice(`用户已选择设备: ${device.productName || '未知'}`);
                    if (device.device) {
                        logDevice(`设备PID: ${device.device.productId}`);
                        logDevice(`设备VID: ${device.device.vendorId}`);
                        logDevice(`设备序列号: ${device.serial || '未知'}`);
                        logDevice(`设备制造商: ${device.device.manufacturerName || '未知'}`);
                    }
                    alert('请在车机上点击"允许USB调试"');
                    
                    // PC连接时，自动检测授权状态
                    if (!isMobile) {
                        logDevice('正在等待车机授权...');
                        let checkCount = 0;
                        const maxChecks = 30; // 最多检查30次（30秒）
                        
                        const checkInterval = setInterval(async () => {
                            checkCount++;
                            try {
                                const devices = await manager.getDevices();
                                if (devices.length > 0) {
                                    clearInterval(checkInterval);
                                    logDevice('检测到车机已授权，开始连接...');
                                    await checkBrowserSupportAndConnect();
                                } else if (checkCount >= maxChecks) {
                                    clearInterval(checkInterval);
                                    logDevice('等待授权超时，请手动点击"开始连接"按钮');
                                }
                            } catch (e) {
                                console.log('检查授权状态失败:', e);
                            }
                        }, 1000); // 每秒检查一次
                    } else {
                        // 移动端，使用原来的延迟方式
                        setTimeout(async () => {
                            try {
                                await manager.requestDevice();
                            } catch(e) {}
                            await checkBrowserSupportAndConnect();
                        }, 2000);
                    }
                    return;
                } else {
                    logDevice('用户取消了设备选择');
                    return;
                }
            } catch (e) {
                if (e.name === 'NotFoundError') {
                    logDevice('用户取消了设备选择');
                    return;
                }
                logDevice('请求设备失败: ' + e.message);
                console.error(e);
            }
            
            logDevice('请先连接 USB 设备并授权后再试');
            return;
        }
        
        // 使用已授权设备连接
        try {
            logDevice('使用已授权设备连接...');
            const webusbDevice = existingDevices[0];
            logDevice('设备: ' + webusbDevice.name + ' (Serial: ' + webusbDevice.serial + ')');
            
            // 使用 Tango ADB 的 API 创建连接
            logDevice('正在创建 ADB 连接...');
            
            // 获取所需的类
            const AdbCredentialStore = adbCredentialWeb.default;
            // Adb 是一个命名空间
            const AdbNamespace = adbApi;
            const Adb = AdbNamespace.Adb;
            const AdbDaemonTransport = AdbNamespace.AdbDaemonTransport;
            console.log('AdbDaemonTransport:', AdbDaemonTransport);
            console.log('AdbDaemonTransport.authenticate:', AdbDaemonTransport?.authenticate);
            
            // 直接使用设备的 connect 方法
            const connection = await webusbDevice.connect();
            logDevice('WebUSB 连接已建立');
            
            // 创建凭据管理器
            const credentialStore = new AdbCredentialStore('Jetour ADB Tool');
            
            // 使用 AdbDaemonTransport.authenticate 创建 transport
            logDevice('正在创建 ADB 传输层...');
            // 使用 ADB_DEFAULT_AUTHENTICATORS
            const ADB_DEFAULT_AUTHENTICATORS = adbApi.ADB_DEFAULT_AUTHENTICATORS;
            
            // 添加重试机制
            let transport;
            let maxRetries = 3;
            let retryCount = 0;
            
            while (retryCount < maxRetries) {
                try {
                    transport = await AdbDaemonTransport.authenticate({
                        serial: webusbDevice.serial,
                        connection: connection,
                        credentialStore: credentialStore,
                        authenticators: ADB_DEFAULT_AUTHENTICATORS
                    });
                    logDevice('ADB 传输层已创建');
                    break;
                } catch (error) {
                    retryCount++;
                    if (retryCount < maxRetries) {
                        logDevice(`创建传输层失败，${retryCount}秒后重试...`);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    } else {
                        logDevice('创建传输层失败，达到最大重试次数');
                        throw error;
                    }
                }
            }
            
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
            // 使用 noneProtocol.spawnWaitText
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
                logDevice('解决方案：请刷新页面并重新连接');
            } else if (e.message && e.message.includes('transferOut')) {
                logDevice('错误原因：USB 传输错误，可能是连接不稳定');
                logDevice('建议：检查 USB 线是否牢固，尝试更换 USB 端口');
            }
            
            // 连接失败，重置连接状态
            window.isConnecting = false;
        }
    } catch (error) {
        log('检查浏览器支持失败:', error);
        logDevice('连接失败: ' + (error.message || error.toString()));
        console.error('Connection error:', error);
        
        // 连接失败，重置连接状态
        window.isConnecting = false;
    }
};

// 无线连接
let wirelessConnect = async () => {
    try {
        // 检查浏览器是否支持 WebUSB
        const isSupported = checkWebUSBSupport();
        if (!isSupported || !navigator.usb) {
            // 不支持，显示 Chrome 下载弹窗
            showChromeDownloadPopup();
            // 直接返回，不继续执行后续连接逻辑
            return;
        }
        // 支持，直接连接
        await performWirelessConnect();
    } catch (error) {
        log('无线连接失败:', error);
        logDevice('无线连接失败: ' + (error.message || error.toString()));
        window.adbDevice = null;
        window.adbTransport = null;

        if (error.message && error.message.indexOf('User canceled') != -1) {
            // 用户取消连接，不显示错误
            logDevice('用户取消连接');
        } else {
            alert('无线连接失败，请检查设备状态和网络连接。');
        }
    }
};

// 执行无线连接操作
let performWirelessConnect = async () => {
    try {
        clearDeviceLog();
        logDevice('开始无线 ADB 连接...');

        // 说明：浏览器无法直接建立TCP连接
        // 此功能仅用于通过USB连接设备后开启无线调试端口
        // 开启后的端口可供命令行adb等工具使用

        logDevice('注意：');
        logDevice('1. 浏览器无法直接连接TCP端口');
        logDevice('2. 无线ADB使用方式：');
        logDevice('   - 先使用USB连接设备');
        logDevice('   - 点击"开始连接"连接设备');
        logDevice('   - 使用系统工具中的"无线ADB"功能开启端口');
        logDevice('   - 之后可使用命令行 adb connect <IP>:5555 连接');

        const networkDevices = await scanNetworkAdbDevices();

        // 显示无线设备选择弹窗
        logDevice('显示无线设备选择弹窗...');
        const selectedDevice = await showWirelessDeviceSelection(networkDevices);

        if (!selectedDevice) {
            throw new Error('未选择设备');
        }

        const host = selectedDevice.host;
        const port = selectedDevice.port;

        logDevice(`尝试连接到 ${host}:${port}...`);

        try {
            // 创建 TCP 传输（会抛出浏览器不支持TCP的错误）
            window.adbTransport = new TcpTransport(host, port);

            // 打开传输连接
            await window.adbTransport.open();

            window.adbDevice = null;

            // 创建 ADB 设备并连接
            logDevice('正在创建 ADB 设备...');
            window.adbDevice = new AdbDevice(window.adbTransport);
            await window.adbDevice.connect("host::web", () => {
                alert('请在您的设备上允许 ADB 调试');
                logDevice('请在您的设备上允许 ADB 调试');
            });

            if (window.adbDevice && window.adbDevice.connected) {
                let deviceName = window.adbDevice.banner || '网络设备';
                let serialNumber = window.adbDevice.serial || '未知';
                setDeviceName('🚗 ' + deviceName + ' | ' + serialNumber);
                console.log('网络设备连接成功:', window.adbDevice);
                logDevice('网络设备连接成功: ' + deviceName);

                let toast = document.getElementById('success-toast');
                toast.style.visibility = 'visible';
                setTimeout(function() {
                    toast.style.visibility = 'hidden';
                }, 3000);

                // 开始持续检测设备状态
                startDeviceMonitoring();
            }
        } catch (error) {
            log('网络 ADB 设备连接失败:', error);
            logDevice('网络 ADB 设备连接失败: ' + (error.message || error.toString()));

            // 提供更友好的错误提示
            alert('无法直接连接到网络ADB设备。\n\n原因：浏览器不支持TCP连接。\n\n解决方案：\n1. 使用USB开始连接\n2. 通过USB连接后使用"无线ADB"功能开启端口（供其他工具使用）');

            window.adbDevice = null;
            window.adbTransport = null;
        }
    } catch (error) {
        log('执行无线连接失败:', error);
        if (error.message !== 'User canceled') {
            logDevice('执行无线连接失败: ' + (error.message || error.toString()));
        }
        throw error;
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
        // 检测浏览器支持
        if (window.browserSupport === null) {
            window.browserSupport = checkWebUSBSupport();
        }
        
        if (window.browserSupport && navigator.usb) {
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
                
                // 检测设备类型
                const isMobile = isMobileDevice();
                logDevice(`检测到${isMobile ? '移动端' : 'PC'}设备连接`);
                
                if (isMobile) {
                    logDevice('移动端设备，不自动连接，请手动点击"开始连接"按钮');
                } else {
                    logDevice('PC设备，车机允许USB调试后将自动连接');
                    logDevice('请在车机上点击"允许USB调试"');
                    // 延迟15秒让用户有时间点击允许，然后自动连接
                    setTimeout(async () => {
                        // 检查是否已经在连接中
                        if (!window.isConnecting) {
                            await checkBrowserSupportAndConnect();
                        } else {
                            logDevice('正在连接中，跳过自动连接');
                        }
                    }, 15000);
                }
            });
            
            // 监听设备断开事件
            navigator.usb.addEventListener('disconnect', (event) => {
                logDevice('===== USB 设备已断开 =====');
                logDevice(`设备: ${event.device.productName || 'USB设备'} (VID: ${event.device.vendorId}, PID: ${event.device.productId})`);
            });
            
        } else {
            logDevice('浏览器不支持 WebUSB');
        }
    } catch (error) {
        logDevice('设备检测初始化失败: ' + (error.message || error.toString()));
    }
};

// 页面加载完成后初始化
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
        // 输出浏览器 UA
        const ua = navigator.userAgent;
        logDevice('===== 初始化信息 =====');
        logDevice('浏览器 UA: ' + ua);
        logDevice('=====================');
        
        // 初始化设备检测
        initDeviceDetection();
        
        // PC端检查已授权设备并自动连接
        if (!isMobileDevice()) {
            logDevice('PC端，检查已授权设备...');
            setTimeout(async () => {
                try {
                    // 检查浏览器支持
                    if (window.browserSupport === null) {
                        window.browserSupport = checkWebUSBSupport();
                    }
                    
                    if (!window.browserSupport || !navigator.usb) {
                        return;
                    }
                    
                    // 初始化设备日志
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
                            await checkBrowserSupportAndConnect();
                        } else {
                            logDevice('正在连接中，跳过自动连接');
                        }
                    } else {
                        logDevice('没有已授权设备');
                    }
                } catch (e) {
                    console.log('检查已授权设备失败:', e);
                }
            }, 3000); // 延迟3秒，等待页面完全加载
        }
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