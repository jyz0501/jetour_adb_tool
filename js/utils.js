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
    window.location.hash = '#exec-result';
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
    // 检测 iOS 设备
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (isIOS) {
        document.getElementById('usb-warning').innerHTML = '⚠️ iOS 设备暂不支持 WebUSB 连接<br>请使用以下替代方案：<br>1. 使用 Windows/Mac 电脑连接<br>2. 使用无线 ADB（手机设置→开发者选项→无线调试）';
        document.getElementById('usb-warning').style.display = 'block';
        return false;
    }
    
    // 基本检测
    if (!('usb' in navigator)) {
        document.getElementById('usb-warning').style.display = 'block';
        showEdgeDownloadPopup();
        return false;
    }
    
    // 高级浏览器检测
    const userAgent = navigator.userAgent;
    
    // Edge 浏览器（优先检测）
    if (userAgent.indexOf('Edg') > -1) {
        // 尝试匹配版本号，支持多种格式
        const edgeMatch = userAgent.match(/Edg\/(\d+)/);
        if (edgeMatch) {
            const edgeVersion = parseInt(edgeMatch[1]);
            if (edgeVersion >= 79) {
                document.getElementById('usb-warning').style.display = 'none';
                return true;
            }
        } else {
            // 如果版本号匹配失败但确实是Edge浏览器，也认为支持
            document.getElementById('usb-warning').style.display = 'none';
            return true;
        }
    }
    
    // Chrome 浏览器
    if (userAgent.indexOf('Chrome') > -1) {
        const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
        if (chromeMatch) {
            const chromeVersion = parseInt(chromeMatch[1]);
            if (chromeVersion >= 61) {
                document.getElementById('usb-warning').style.display = 'none';
                return true;
            }
        } else {
            // 如果版本号匹配失败但确实是Chrome浏览器，也认为支持
            document.getElementById('usb-warning').style.display = 'none';
            return true;
        }
    }
    
    // Opera 浏览器
    if (userAgent.indexOf('OPR') > -1) {
        const operaMatch = userAgent.match(/OPR\/(\d+)/);
        if (operaMatch) {
            const operaVersion = parseInt(operaMatch[1]);
            if (operaVersion >= 48) {
                document.getElementById('usb-warning').style.display = 'none';
                return true;
            }
        } else {
            // 如果版本号匹配失败但确实是Opera浏览器，也认为支持
            document.getElementById('usb-warning').style.display = 'none';
            return true;
        }
    }
    
    // 如果支持 WebUSB API，即使浏览器检测失败也认为支持
    if ('usb' in navigator) {
        document.getElementById('usb-warning').style.display = 'none';
        return true;
    }
    
    // 其他浏览器
    document.getElementById('usb-warning').style.display = 'block';
    showEdgeDownloadPopup();
    return false;
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
        modalCallback(true);
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