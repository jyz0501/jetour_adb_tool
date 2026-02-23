// 全局变量
let adb;
let webusb;

// 执行日志显示
let log = (...args) => {
    if (args[0] instanceof Error) {
        console.error.apply(console, args);
    } else {
        console.log.apply(console, args);
    }
    let logElement = document.getElementById('log');
    if (logElement) {
        logElement.textContent = logElement.textContent + args.join(' ') + '\n';
        logElement.scrollTop = logElement.scrollHeight;
    }
};

// 定义一个异步函数clear，用于清空日志内容
let clear = async () => {
    let logElement = document.getElementById('log');
    if (logElement) {
        logElement.textContent = "";
    }
};

// 定义一个异步函数 showProgress，用于显示或隐藏进度条
let showProgress = async (show) => {
    let progress = document.getElementById('progress');
    if (progress) {
        if (show) {
            progress.className = "progress active progress-striped";
        } else {
            progress.className = "progress";
            log("");
        }
    }
};

// 更新下载百分比文本
function updateDownloadProgressText(percentage) {
    var progressText = document.getElementById('download-progress-text');
    var progressBar = document.getElementById('download-progress-bar');
    progressText.textContent = percentage + '%';
    progressBar.style.width = percentage + '%';
}

// 使用 XMLHttpRequest 来获取下载进度
async function fetchWithProgress(url, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'blob';
        xhr.onprogress = onProgress;
        xhr.onload = function() {
            if (xhr.status === 200) {
                resolve(xhr.response);
            } else {
                reject(new Error('Failed to fetch the resource'));
            }
        };
        xhr.onerror = function() {
            reject(new Error('Network error'));
        };
        xhr.send();
    });
}

// 硬刷新
function hardReload() {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    // 添加/覆盖时间戳参数（确保每次URL不同）
    params.set('t', new Date().getTime());
    // 重构完整URL（保留协议/域名/路径/原始参数）
    url.search = params.toString();
    window.location.href = url.toString();
}

// 检测浏览器是否支持WebUSB
function checkWebUSBSupport() {
    const usbWarning = document.getElementById('usb-warning');

    // 第一层：检测 iOS 设备
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) {
        console.log('checkWebUSBSupport: failed at iOS check');
        usbWarning.innerHTML = '⚠️ iOS 设备暂不支持 WebUSB 连接<br>请使用以下替代方案：<br>1. 使用 Windows/Mac 电脑连接<br>2. 使用无线 ADB（手机设置→开发者选项→无线调试）';
        usbWarning.style.display = 'block';
        showEdgeDownloadPopup();
        return false;
    }

    // 第二层：基本 WebUSB 支持
    console.log('WebUSB check: navigator.usb =', navigator.usb);
    if (!('usb' in navigator)) {
        console.log('checkWebUSBSupport: failed at basic WebUSB check');
        console.log('WebUSB not supported - no usb in navigator');
        usbWarning.innerHTML = '⚠️ 您的浏览器不支持 WebUSB API<br>请使用 Chrome 或 Edge 浏览器';
        usbWarning.style.display = 'block';
        showEdgeDownloadPopup();
        return false;
    }

    // 第三层：检测是否为支持的浏览器类型
    const userAgent = navigator.userAgent;
    const isEdge = userAgent.indexOf('Edg') > -1;
    const isChrome = userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1;
    const isOpera = userAgent.indexOf('OPR') > -1;
    const isSupportedBrowser = isEdge || isChrome || isOpera;
    
    console.log('Browser detection:', { userAgent, isEdge, isChrome, isOpera, isSupportedBrowser });

    if (!isSupportedBrowser) {
        console.log('checkWebUSBSupport: failed at browser type check');
        usbWarning.innerHTML = '⚠️ 您的浏览器类型不支持 WebUSB<br>请使用 Chrome 或 Edge 浏览器<br><br>当前UA: ' + userAgent;
        usbWarning.style.display = 'block';
        showEdgeDownloadPopup();
        return false;
    }

    // 第四层：检测浏览器版本
    let isSupportedVersion = false;

    // Edge 浏览器
    if (isEdge) {
        const edgeMatch = userAgent.match(/Edg\/(\d+)/);
        if (edgeMatch) {
            const edgeVersion = parseInt(edgeMatch[1]);
            isSupportedVersion = edgeVersion >= 79;
        }
    }
    // Chrome 浏览器
    else if (isChrome) {
        const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
        if (chromeMatch) {
            const chromeVersion = parseInt(chromeMatch[1]);
            isSupportedVersion = chromeVersion >= 61;
        }
    }
    // Opera 浏览器
    else if (isOpera) {
        const operaMatch = userAgent.match(/OPR\/(\d+)/);
        if (operaMatch) {
            const operaVersion = parseInt(operaMatch[1]);
            isSupportedVersion = operaVersion >= 48;
        }
    }

    if (!isSupportedVersion) {
        console.log('checkWebUSBSupport: failed at version check');
        usbWarning.innerHTML = '⚠️ 您的浏览器版本过低，不支持 WebUSB<br>请更新到最新版本的 Chrome 或 Edge 浏览器';
        usbWarning.style.display = 'block';
        showEdgeDownloadPopup();
        return false;
    }

    console.log('checkWebUSBSupport: passed all checks');
    // 所有检测都通过，支持 WebUSB
    usbWarning.style.display = 'none';
    return true;
}

// 自定义弹窗功能
let modalCallback = null;

// 显示自定义弹窗
function showModal(title, content, options = {}) {
    // 确保DOM元素已加载
    if (typeof document === 'undefined') {
        console.error('Document not available');
        return;
    }
    
    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    
    if (!modal || !modalTitle || !modalBody || !modalFooter) {
        console.error('Modal elements not found');
        // 回退到原生alert
        alert(title + '\n\n' + content);
        return;
    }
    
    // 设置标题和内容
    modalTitle.textContent = title;
    modalBody.innerHTML = content; // 使用innerHTML支持HTML内容
    
    // 设置按钮
    const defaultOptions = {
        showCancel: true,
        cancelText: '取消',
        confirmText: '确定',
        cancelClass: 'custom-modal-btn-secondary',
        confirmClass: 'custom-modal-btn-primary',
        callback: null
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    modalCallback = finalOptions.callback;
    
    // 构建按钮
    modalFooter.innerHTML = '';
    
    if (finalOptions.showCancel) {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = `custom-modal-btn ${finalOptions.cancelClass}`;
        cancelBtn.textContent = finalOptions.cancelText;
        cancelBtn.onclick = closeModal;
        modalFooter.appendChild(cancelBtn);
    }
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = `custom-modal-btn ${finalOptions.confirmClass}`;
    confirmBtn.textContent = finalOptions.confirmText;
    confirmBtn.onclick = confirmModal;
    modalFooter.appendChild(confirmBtn);
    
    // 显示弹窗
    modal.style.display = 'block';
}

// 关闭弹窗
function closeModal() {
    const modal = document.getElementById('customModal');
    if (modal) {
        modal.style.display = 'none';
    }
    modalCallback = null;
}

// 确认弹窗
function confirmModal() {
    if (typeof modalCallback === 'function') {
        const result = modalCallback(true);
        // 如果回调返回 false，阻止关闭弹窗
        if (result === false) {
            return;
        }
    }
    closeModal();
}

// 显示带超链接的提示
function showAlertWithLinks(title, content) {
    showModal(title, content, {
        showCancel: false,
        confirmText: '我知道了'
    });
}

// 显示确认对话框
function showConfirmWithLinks(title, content, callback) {
    showModal(title, content, {
        callback: callback
    });
}

// 显示浏览器下载弹窗
function showEdgeDownloadPopup() {
    const content = '您的浏览器不支持 WebUSB，请使用以下浏览器：<br><br>' +
                    '<a href="https://www.microsoft.com/zh-cn/edge/download" target="_blank">1. Microsoft Edge 浏览器</a><br>' +
                    '<a href="https://www.google.com/chrome/downloads/" target="_blank">2. Google Chrome 浏览器</a><br><br>' +
                    '点击上方链接直接下载，或点击下方按钮选择浏览器下载。';
    
    showModal('浏览器支持提示', content, {
        showCancel: true,
        cancelText: '取消',
        confirmText: '下载 Edge',
        callback: function(confirmed) {
            if (confirmed) {
                window.open('https://www.microsoft.com/zh-cn/edge/download', '_blank');
            }
        }
    });
}

// 导出函数
try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            log,
            clear,
            showProgress,
            updateDownloadProgressText,
            fetchWithProgress,
            hardReload,
            checkWebUSBSupport
        };
    }
} catch (e) {
    // 浏览器环境，不需要导出
}