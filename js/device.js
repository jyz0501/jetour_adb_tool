



window.adbDevice = null;
window.adbTransport = null;
window.isConnecting = false;
window.browserSupport = null;
window.isMobile = null;


let isTrustedOrigin = () => {
    const host = location.hostname;
    return location.protocol === 'https:' ||
        location.protocol === 'file:' ||
        host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
};


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




let detectUsbIssue = (message) => {
    const msg = (message || '').toString().toLowerCase();

    
    const rules = [
        {
            id: 'usb',
            strong: [
                /unable to claim interface/,
                /unable to claim/,
                /interface (?:is )?(?:already )?(?:busy|in use)/,
                /(?:device|resource) (?:is )?busy/,
                /libusb[_\s]?error[_\s]?busy/,
                /already (?:claimed|in use)/,
                /claimed by (?:another|other)/
            ],
            weak: [
                /claim/,
                /busy/,
                /in use/,
                /access denied/,
                /permission denied/
            ]
        },
        {
            id: 'auth',
            strong: [
                /unauthorized/,
                /auth(?:orization)? (?:fail|error|reject)/,
                /insufficient permissions for device/,
                /rsa key/,
                /key reject/
            ],
            weak: [
                /\bauth\b/,
                /denied/
            ]
        },
        {
            id: 'cable',
            strong: [
                /transfer(?:out|in)/,
                /transfer (?:fail|error|abort)/,
                /pipe error/,
                /the device was disconnected/,
                /babble/,
                /(?:crc|checksum) error/
            ],
            weak: [
                /disconnect/,
                /\bstall\b/,
                /timeout/,
                /epipe/
            ]
        },
        {
            id: 'debug',
            strong: [
                /no (?:device|devices) (?:found|selected|available)/,
                /device not (?:found|available)/,
                /no compatible device/,
                /please connect (?:a|the|an) device/,
                /not ?found/,
                /adb 库未加载/,
                /浏览器不支持 webusb/,
                /webusb 不可用/
            ],
            weak: [
                /no device/
            ]
        }
    ];

    
    const scored = rules.map((rule) => {
        let score = 0;
        rule.strong.forEach((p) => { if (p.test(msg)) score += 2; });
        (rule.weak || []).forEach((p) => { if (p.test(msg)) score += 1; });
        return { id: rule.id, score };
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
        return {
            reason: '未能自动定位原因，请按以下步骤逐一排查。',
            focus: null,
            focuses: [],
            recognized: false
        };
    }

    const mobile = isMobileDevice();
    const reasonByFocus = {
        usb: mobile
            ? 'USB 接口被占用：手机上可能正在运行其它 OTG/ADB 调试类 App，或该接口已被系统占用。'
            : 'USB 接口被占用：电脑端可能正在运行 ADB 服务、手机助手或模拟器，浏览器无法独占该接口。',
        auth: '车机未授权本次 USB 调试请求（RSA 鉴权失败）。',
        cable: 'USB 数据传输中断，通常是数据线仅充电不传数据、接口接触不良或供电不足。',
        debug: '未检测到可用的 USB 调试设备。'
    };

    const focuses = scored.map((item) => item.id);

    return {
        reason: reasonByFocus[focuses[0]],
        focus: focuses[0],
        focuses: focuses,
        recognized: true
    };
};


let showConnectionTroubleshootDialog = async (errorMessage) => {
    const issue = detectUsbIssue(errorMessage);
    const command = 'adb kill-server';

    if (typeof logDevice === 'function') {
        logDevice('自动判定原因: ' + (issue.recognized ? issue.focuses.join(' > ') : '未识别') + '（原错误: ' + (errorMessage || '未知错误') + '）');
    }

    const tips = [
        {
            id: 'debug',
            icon: '🔧',
            title: '开启ADB权限',
            desc: '进入车机「工程模式 —— 加密设置」打开「ADB权限」。'
        },
        {
            id: 'auth',
            icon: '📱',
            title: '在车机上允许 USB 调试授权',
            desc: '连接时车机会弹出「是否允许 USB 调试」，请勾选「一律允许」后点击「允许」。若曾误点拒绝，重新拔插车机端OTG线。'
        },
        {
            id: 'cable',
            icon: '🔌',
            title: '更换 OTG 线材与 USB 端口',
            desc: '部分线材仅能充电、无法传输数据，请更换OTG数据线，电脑用户请直连设备，避免经过USBHub或扩展坞）。'
        },
        {
            id: 'usb',
            icon: '🖥️',
            title: isMobileDevice() ? '解除手机端 OTG 接口占用' : '解除电脑端 USB 接口占用',
            desc: isMobileDevice()
                ? '关闭手机上正在运行的 OTG 调试、ADB 工具类 App，拔插 OTG 线后重试。'
                : '关闭手机助手、模拟器、豌豆荚及其它 ADB 调试工具等程序，并在终端 / PowerShell 中执行下方命令，释放被占用的 ADB 服务。'
        },
        {
            id: 'refresh',
            icon: '♻️',
            title: '刷新页面后重新连接',
            desc: '完成以上操作后刷新本页面（F5），或直接点击下方「重试连接」按钮。'
        }
    ];

    const tipsHtml = tips.map((tip) => {
        const highlight = issue.focuses.indexOf(tip.id) !== -1;
        return `
            <div class="ts-item" style="margin-bottom: 8px; border-radius: 8px; overflow: hidden; background: ${highlight ? 'rgba(245, 158, 11, 0.10)' : '#fafbff'}; border: 1px solid ${highlight ? 'rgba(245, 158, 11, 0.35)' : 'var(--line)'}; ${highlight ? 'border-left: 3px solid var(--accent);' : ''}">
                <div class="ts-head" style="display: flex; align-items: center; gap: 8px; padding: 11px 12px; cursor: pointer; user-select: none;">
                    <span style="font-size: 16px; line-height: 1;">${tip.icon}</span>
                    <span style="flex: 1; font-size: 13px; font-weight: bold; color: var(--txt); line-height: 1.4;">
                        ${tip.title}${highlight ? '<span style="font-size: 11px; font-weight: normal; color: var(--accent); margin-left: 5px;">（疑似原因）</span>' : ''}
                    </span>
                    <span class="ts-arrow" style="font-size: 11px; color: var(--sub);">${highlight ? '▾' : '▸'}</span>
                </div>
                <div class="ts-body" style="display: ${highlight ? 'block' : 'none'}; padding: 0 12px 12px 36px;">
                    <div style="font-size: 12px; color: var(--sub); line-height: 1.7;">${tip.desc}</div>
                    ${tip.id === 'usb' && !isMobileDevice() ? `
                    <div style="margin-top: 10px; background: var(--card); border: 1px dashed var(--line); padding: 10px; border-radius: 6px; font-family: monospace; font-size: 12px; color: var(--txt); display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                        <code style="margin: 0;">${command}</code>
                        <button id="conn-trouble-copy" style="background: var(--brand); color: white; border: none; padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; white-space: nowrap;">复制命令</button>
                    </div>` : ''}
                </div>
            </div>
        `;
    }).join('');

    const dialogHtml = `
        <div id="conn-trouble-dialog" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999; background: var(--card); border: 1px solid var(--line); padding: 22px; border-radius: 14px; box-shadow: 0 8px 24px var(--shadow); max-width: 480px; width: 92%; max-height: 88vh; overflow-y: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="text-align: center; margin-bottom: 14px;">
                <div style="font-size: 40px; margin-bottom: 6px;">⚠️</div>
                <h3 style="margin: 0 0 8px 0; color: var(--txt); font-size: 18px;">连接失败 · 排错指引</h3>
                <p style="color: var(--sub); font-size: 13px; line-height: 1.6; margin: 0;">${issue.reason}</p>
            </div>
            <div class="ts-item" style="margin-bottom: 12px; border-radius: 6px; overflow: hidden; background: rgba(225, 29, 72, 0.08); border: 1px solid rgba(225, 29, 72, 0.25);">
                <div class="ts-head" style="display: flex; align-items: center; gap: 8px; padding: 9px 12px; cursor: pointer; user-select: none;">
                    <span style="flex: 1; font-size: 12px; font-weight: bold; color: var(--bad);">查看原始错误信息</span>
                    <span class="ts-arrow" style="font-size: 11px; color: var(--sub);">▸</span>
                </div>
                <div class="ts-body" style="display: none; padding: 0 12px 10px 12px; font-family: monospace; font-size: 12px; color: var(--txt); word-break: break-all; line-height: 1.6;">
                    ${errorMessage ? errorMessage : '未知错误'}
                </div>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: bold; color: var(--txt);">排查步骤（点击标题展开）</span>
                <button id="conn-trouble-toggle-all" style="background: none; border: 1px solid var(--line); color: var(--brand); padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px;">展开全部</button>
            </div>
            ${tipsHtml}
            <div style="display: flex; gap: 10px;">
                <button id="conn-trouble-retry" style="flex: 1; background: var(--ok); color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 500;">
                    我已排查，重试连接
                </button>
                <button id="conn-trouble-close" style="background: var(--sub); color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                    关闭
                </button>
            </div>
        </div>
        <div id="conn-trouble-mask" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--mask); z-index: 9998;"></div>
    `;

    
    const existing = document.getElementById('conn-trouble-dialog');
    if (existing) existing.remove();
    const existingMask = document.getElementById('conn-trouble-mask');
    if (existingMask) existingMask.remove();

    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = dialogHtml;
    document.body.appendChild(tempDiv.firstElementChild);
    document.body.appendChild(tempDiv.lastElementChild);

    return new Promise((resolve) => {
        const copyBtn = document.getElementById('conn-trouble-copy');
        const retryBtn = document.getElementById('conn-trouble-retry');
        const closeBtn = document.getElementById('conn-trouble-close');
        const toggleAllBtn = document.getElementById('conn-trouble-toggle-all');
        const dialogEl = document.getElementById('conn-trouble-dialog');

        
        let expandAll = false;
        const setItemExpanded = (item, expanded) => {
            const body = item.querySelector('.ts-body');
            const arrow = item.querySelector('.ts-arrow');
            if (body) body.style.display = expanded ? 'block' : 'none';
            if (arrow) arrow.textContent = expanded ? '▾' : '▸';
        };

        dialogEl.addEventListener('click', (ev) => {
            const head = ev.target.closest ? ev.target.closest('.ts-head') : null;
            if (!head) return;
            const item = head.parentElement;
            if (!item) return;
            const body = item.querySelector('.ts-body');
            setItemExpanded(item, !body || body.style.display === 'none');
        });

        toggleAllBtn.addEventListener('click', () => {
            expandAll = !expandAll;
            dialogEl.querySelectorAll('.ts-item').forEach((item) => {
                setItemExpanded(item, expandAll);
            });
            toggleAllBtn.textContent = expandAll ? '收起全部' : '展开全部';
        });

        function closeDialog() {
            const dialog = document.getElementById('conn-trouble-dialog');
            const mask = document.getElementById('conn-trouble-mask');
            if (dialog) dialog.remove();
            if (mask) mask.remove();
        }

        copyBtn.addEventListener('click', () => {
            const done = () => {
                copyBtn.textContent = '✓ 已复制';
                copyBtn.style.background = 'var(--ok)';
                setTimeout(() => {
                    copyBtn.textContent = '复制命令';
                    copyBtn.style.background = 'var(--brand)';
                }, 2000);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(command).then(done).catch(done);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = command;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
                done();
            }
        });

        retryBtn.addEventListener('click', () => {
            closeDialog();
            logDevice('用户已排查问题，正在重试连接...');
            resolve('retry');
        });

        closeBtn.addEventListener('click', () => {
            closeDialog();
            resolve('cancel');
        });
    });
};



let authWaitingTimer = null;


let showAuthWaitingDialog = () => {
    closeAuthWaitingDialog();

    
    
    authWaitingTimer = setTimeout(() => {
        authWaitingTimer = null;

        const dialogHtml = `
            <div id="auth-waiting-dialog" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999; background: var(--card); border: 1px solid var(--line); padding: 24px; border-radius: 14px; box-shadow: 0 8px 24px var(--shadow); max-width: 380px; width: 90%; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <div style="font-size: 44px; margin-bottom: 8px;">📱</div>
                <h3 style="margin: 0 0 10px 0; font-size: 18px; color: var(--txt);">请在车机允许 ADB 调试授权</h3>
                <p style="font-size: 13px; color: var(--sub); line-height: 1.7; margin: 0 0 14px 0;">
                    请在车机屏幕上点击「<strong style="color: var(--txt);">允许 USB 调试</strong>」<br/>
                    建议勾选「一律允许此计算机」后再点确定
                </p>
                <div style="padding: 10px; background: rgba(91, 91, 214, 0.08); border: 1px solid rgba(91, 91, 214, 0.25); border-radius: 8px; font-size: 12px; color: var(--brand);">
                    正在等待车机确认…
                </div>
                <button id="auth-waiting-close" style="margin-top: 14px; width: 100%; background: var(--sub); color: white; border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                    关闭提示（连接继续）
                </button>
            </div>
            <div id="auth-waiting-mask" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--mask); z-index: 9998;"></div>
        `;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = dialogHtml;
        document.body.appendChild(tempDiv.firstElementChild);
        document.body.appendChild(tempDiv.lastElementChild);

        const closeBtn = document.getElementById('auth-waiting-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                closeAuthWaitingDialog();
            });
        }
    }, 400);
};


let closeAuthWaitingDialog = () => {
    if (authWaitingTimer) {
        clearTimeout(authWaitingTimer);
        authWaitingTimer = null;
    }
    const dialog = document.getElementById('auth-waiting-dialog');
    const mask = document.getElementById('auth-waiting-mask');
    if (dialog) dialog.remove();
    if (mask) mask.remove();
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

        
        showAuthWaitingDialog();
        
        
        const credentialStore = new AdbCredentialStore('Jetour ADB Tool');
        
        
        
        
        
        
        
        logDevice('正在进行 ADB RSA 鉴权...');

        const transport = await AdbDaemonTransport.authenticate({
            serial: webusbDevice.serial,
            connection: connection,
            credentialStore: credentialStore
        });
        logDevice('ADB 传输层已建立（RSA 鉴权成功）');

        
        closeAuthWaitingDialog();
        
        
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
        closeAuthWaitingDialog();
        logDevice('连接失败: ' + e.message);
        console.error('ADB connection error:', e);
        
        
        window.isConnecting = false;
        
        
        const result = await showConnectionTroubleshootDialog(e.message);
        if (result === 'retry') {
            await connectDevice();
        }
    }
};


let disconnectSilently = async () => {
    closeAuthWaitingDialog();

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
    
    if (!isTrustedOrigin()) {
        logDevice('⚠️ 当前页面通过不安全的 HTTP 明文加载，已阻止连接设备');
        logDevice('请使用 https://' + location.hostname + location.pathname + ' 打开本页面');
        return;
    }

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
        
        window.isConnecting = false;
        
        
        if (msg.includes('NotFoundError')) {
            logDevice('用户取消了操作');
            return;
        }
        
        
        const result = await showConnectionTroubleshootDialog(msg);
        if (result === 'retry') {
            logDevice('用户已排查问题，重试连接...');
            await connectDevice();
        }
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
        
        if (!isTrustedOrigin()) {
            logDevice('⚠️ 检测到非安全来源（HTTP 明文），已禁用 ADB 相关功能，请使用 HTTPS 访问');
            return;
        }

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
