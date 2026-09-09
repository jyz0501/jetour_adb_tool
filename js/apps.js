


let checkBrowserSupport = () => {
    
    if (typeof window.browserSupport !== 'undefined') {
        if (window.browserSupport === false) {
            alert('您的浏览器不支持 WebUSB API，请使用 Chrome 或 Edge 浏览器');
        }
        return window.browserSupport !== false;
    }
    if (!('usb' in navigator)) {
        alert('您的浏览器不支持 WebUSB API，请使用 Chrome 或 Edge 浏览器');
        return false;
    }
    return true;
};


let blockingModal = null;

function showBlockingModal(message, stage = 'download') {
    if (blockingModal) {
        return;
    }
    
    blockingModal = document.createElement('div');
    blockingModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: var(--mask);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: var(--card);
        border: 1px solid var(--line);
        padding: 30px;
        border-radius: 14px;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 8px 24px var(--shadow);
    `;
    
    let stageText = '';
    let waitText = '';
    
    if (stage === 'download') {
        stageText = '正在下载';
        waitText = '请耐心等待，下载完成后将自动开始安装';
    } else if (stage === 'install') {
        stageText = '正在安装';
        waitText = '请耐心等待，安装完成后将自动关闭此窗口';
    } else {
        stageText = '正在处理';
        waitText = '请耐心等待，操作完成后将自动关闭此窗口';
    }
    
    content.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 15px; color: var(--txt);">${stageText}</div>
        <div style="font-size: 16px; color: var(--sub); margin-bottom: 20px;">${message}</div>
        <div style="width: 50px; height: 50px; border: 4px solid var(--line); border-top: 4px solid var(--brand); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        <div style="font-size: 14px; color: var(--sub); margin-top: 20px;">${waitText}</div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    
    blockingModal.appendChild(content);
    document.body.appendChild(blockingModal);
}

function updateBlockingModal(message, stage = 'install') {
    if (!blockingModal) {
        return;
    }
    
    const content = blockingModal.querySelector('div');
    const stageText = stage === 'download' ? '正在下载' : '正在安装';
    
    content.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 15px; color: var(--txt);">${stageText}</div>
        <div style="font-size: 16px; color: var(--sub); margin-bottom: 20px;">${message}</div>
        <div style="width: 50px; height: 50px; border: 4px solid var(--line); border-top: 4px solid var(--brand); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        <div style="font-size: 14px; color: var(--sub); margin-top: 20px;">请耐心等待，操作完成后将自动关闭此窗口</div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
}

function removeBlockingModal() {
    if (blockingModal) {
        document.body.removeChild(blockingModal);
        blockingModal = null;
    }
}


let downloadToPhoneAndPush = async (appName, downloadUrl, savePath, backupUrl = null, packageName = null) => {
    if (!checkBrowserSupport()) {
        return;
    }
    
    
    if (!window.adbClient) {
        alert('未连接到设备，请先点击"开始连接"按钮连接设备');
        return;
    }
    
    clear();
    showProgress(true);
    showBlockingModal(appName + ' 正在从车机下载...', 'download');
    log('正在从车机下载 ' + appName + '...\n');
    log('下载链接: ' + downloadUrl);
    
    try {
        
        await execShellAndGetOutput("setprop persist.sv.enable_adb_install 1");
        
        
        log('正在清空download目录...');
        await execShellAndGetOutput('rm -f /storage/emulated/0/Download/*.apk');
        log('download目录已清空');
        
        let downloadSuccess = false;
        let currentUrl = downloadUrl;
        
        
        for (let attempt = 1; attempt <= 2; attempt++) {
            if (attempt === 2 && backupUrl) {
                log('主链接失败，尝试备用链接...');
                currentUrl = backupUrl;
            } else if (attempt === 2 && !backupUrl) {
                break;
            }
            
            log(`尝试下载 (${attempt}/2)...`);
            
            const downloadPromise = execShellAndGetOutput('curl -L --connect-timeout 30 --max-time 60 --retry 3 --insecure --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" -o ' + savePath + ' "' + currentUrl + '"');
            
            try {
                await downloadPromise;
                
                const sizeCheck = await execShellAndGetOutput('stat -c %s ' + savePath);
                const fileSize = parseInt(sizeCheck.trim());
                if (!isNaN(fileSize) && fileSize > 51200) {
                    downloadSuccess = true;
                    break;
                } else {
                    log('文件不存在或太小，可能下载不完整');
                }
            } catch (e) {
                log('下载失败: ' + e.message);
            }
        }
        
        if (downloadSuccess) {
            log('\n下载完成，正在安装...\n');
            updateBlockingModal(appName + ' 正在安装...', 'install');
            
            let installOutput = await execShellAndGetOutput("pm install -g -r -d " + savePath);
            
            
            await execShellAndGetOutput("setprop persist.sv.enable_adb_install 0");
            
            if (installOutput.includes('Success')) {
                log('安装成功！');
                alert(appName + " 安装成功！");
                await execShellAndGetOutput('rm -f ' + savePath);
                log('已删除安装文件: ' + savePath);
                
                
                if (packageName) {
                    setTimeout(async () => {
                        log('正在启动 ' + appName + '...');
                        await execShellAndGetOutput('monkey -p ' + packageName + ' -c android.intent.category.LAUNCHER 1');
                    }, 1000);
                }
            } else {
                log('安装失败: ' + installOutput);
                alert(appName + ' 安装失败！\n\n' + installOutput);
            }
        } else {
            
            removeBlockingModal();
            log('车机下载失败');
            
            const userChoice = confirm(
                '车机下载失败，可能原因：\n' +
                '1. 车机网络连接问题\n' +
                '2. 下载链接暂时不可用\n' +
                '3. 下载超时（60秒）\n\n' +
                '点击「确定」打开网站手动下载，\n' +
                '点击「取消」选择手机内的安装包安装。'
            );
            
            if (userChoice) {
                
                window.open(downloadUrl, '_blank');
                log('已打开下载链接: ' + downloadUrl);
                
                setTimeout(() => {
                    const useLocalFile = confirm('下载完成后，是否立即使用「自选APK」功能安装？');
                    if (useLocalFile) {
                        document.getElementById('apkFile').click();
                    }
                }, 500);
            } else {
                
                document.getElementById('apkFile').click();
            }
        }
    } catch (error) {
        log('安装过程出错: ' + error.message);
        alert('安装失败: ' + error.message);
    }
    
    removeBlockingModal();
    showProgress(false);
};


let sfgj = async () => {
    const downloadUrl = 'https://zero.shafa.com/file/pad_webwww/shafa_market/latest';
    const backupUrl = 'http://a14472357.a.328657.xyz/a14472357/sfgj4.9.54.apk';
    const savePath = '/storage/emulated/0/Download/sfgj.apk';
    await downloadToPhoneAndPush('沙发管家', downloadUrl, savePath, backupUrl, 'com.shafa.markethd');
};


let yygj = async () => {
    const downloadUrl = 'https://file.vju.cc/%E5%BA%94%E7%94%A8%E7%AE%A1%E5%AE%B6/%E5%BA%94%E7%94%A8%E7%AE%A1%E5%AE%B6v1.9.0%281905%29%E5%85%AC%E7%AD%BE%E7%89%88.apk';
    const backupUrl = 'http://a14472357.a.328657.xyz/a14472357/yygj1.9.0.apk'; 
    const savePath = '/storage/emulated/0/Download/yygj.apk';
    await downloadToPhoneAndPush('应用管家', downloadUrl, savePath, backupUrl, 'com.yunpan.appmanage');
};




let sentry = async () => {
    const downloadUrl = 'http://a14472357.a.328657.xyz/a14472357/sbcamerav1.1.8.apk';
    const backupUrl = null;
    const savePath = '/storage/emulated/0/Download/sentry.apk';
    await downloadToPhoneAndPush('哨兵监控', downloadUrl, savePath, backupUrl);
};


let hstrip = async () => {
    const downloadUrl = 'http://a14472357.a.328657.xyz/a14472357/Gesture_2.0.0.apk';
    const backupUrl = 'http://a14472357.a.328657.xyz/a14472357/小横条_2.0.1_signed.apk';
    const savePath = '/storage/emulated/0/Download/Gesture.apk';
    await downloadToPhoneAndPush('小横条', downloadUrl, savePath, backupUrl, 'com.omarea.gesture');
};


let ykpip = async () => {
    const downloadUrl = 'http://a14472357.a.328657.xyz/a14472357/%E6%98%93%E6%8E%A7%E8%BD%A6%E6%9C%BA%E7%89%88V1.6.10_PIP.apk';
    const backupUrl = null;
    const savePath = '/storage/emulated/0/Download/ykpip.apk';
    await downloadToPhoneAndPush('易控车机PIP', downloadUrl, savePath, backupUrl);
};



let cdb = async () => {
    const downloadUrl = 'https://gjx.cheji.cc/apk/cbl.apk';
    const backupUrl = 'http://a14472357.a.328657.xyz/a14472357/cbl_1.0.apk';
    const savePath = '/storage/emulated/0/Download/cdb.apk';
    await downloadToPhoneAndPush('侧边栏', downloadUrl, savePath, backupUrl, 'com.hzsoft.sidebar');
};


let bdui = async () => {
    const downloadUrl = 'https://file.vju.cc/%E5%B8%83%E4%B8%81UI%E6%A1%8C%E9%9D%A2/%E5%B8%83%E4%B8%81UI2.2.7.apk';
    const backupUrl = 'http://a14472357.a.328657.xyz/a14472357/bdUI_2.2.7.apk'; 
    const savePath = '/storage/emulated/0/Download/bdui.apk';
    await downloadToPhoneAndPush('布丁UI', downloadUrl, savePath, backupUrl, 'com.sfcar.launcher');
};


let lyyk = () => {
    const downloadUrl = 'http://a14472357.a.328657.xyz/a14472357/lyyk2.0.9.apk';
    
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'lyyk2.0.9.apk';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    log('蓝牙遥控下载已开始，请检查下载文件夹');
};


function startGuanJia() {
    
    if (window.adbClient) {
        clear();
        showProgress(true);
        log('开始启动应用管家...\n');
        try {
            
            window.adbClient.subprocess.noneProtocol.spawnWaitText([
                'monkey', '-p', 'com.yunpan.appmanage', '-c', 'android.intent.category.LAUNCHER', '1'
            ]).then(result => {
                log(result);
                showProgress(false);
            }).catch(error => {
                console.error('启动应用管家失败:', error);
                log('启动失败: ' + (error.message || error.toString()));
                showProgress(false);
            });
        } catch (error) {
            console.error('启动应用管家失败:', error);
            log('启动失败: ' + (error.message || error.toString()));
            showProgress(false);
        }
        return;
    }
    
    
    alert("未连接到设备，请先点击'开始连接'按钮连接设备");
}


let loadPackageList = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    
    
    if (!window.adbClient) {
        alert('未连接到设备，请先点击"开始连接"按钮连接设备');
        return;
    }
    
    clear();
    showProgress(true);
    var packageContent = "";
    try {
        const result = await window.adbClient.subprocess.noneProtocol.spawnWaitText(["pm", "list", "packages", "-3"]);
        packageContent = result;
    } catch (error) {
        log(error);
    }
    let packageList = document.getElementById('package-list').getElementsByTagName('tbody')[0];
    packageList.innerHTML = "";
    let arryAll = packageContent.split("\n");
    let index = 1;
    
    for (var i = 0, len = arryAll.length; i < len; i++) {
        let line = arryAll[i];
        if (line.indexOf("package:") != 0) {
            continue;
        }
        let packageName = line.substring(8);
        
        var tr = document.createElement("tr");
        
        var tdIndex = document.createElement("td");
        tdIndex.textContent = index;
        tr.appendChild(tdIndex);
        
        var tdPackage = document.createElement("td");
        tdPackage.textContent = packageName;
        tdPackage.style.wordBreak = "break-all";
        tr.appendChild(tdPackage);
        
        var tdActions = document.createElement("td");
        tdActions.className = "text-nowrap";
        
        var launchButton = document.createElement("button");
        launchButton.className = "btn btn-connect btn-sm";
        launchButton.style.marginRight = "5px";
        launchButton.onclick = function(pkg) {
            return function() {
                execShellAndGetOutput('monkey -p ' + pkg + ' -c android.intent.category.LAUNCHER 1');
            };
        }(packageName);
        launchButton.textContent = "启动";
        tdActions.appendChild(launchButton);
        
        var stopButton = document.createElement("button");
        stopButton.className = "btn btn-connect btn-sm";
        stopButton.style.marginRight = "5px";
        stopButton.style.backgroundColor = "var(--brand)";
        stopButton.onclick = function(pkg) {
            return function() {
                execShellAndGetOutput('am force-stop ' + pkg);
            };
        }(packageName);
        stopButton.textContent = "停止";
        tdActions.appendChild(stopButton);
        tr.appendChild(tdActions);
        
        var tdRemove = document.createElement("td");
        var removeButton = document.createElement("button");
        removeButton.className = "btn btn-disconnect btn-sm";
        removeButton.onclick = function(pkg) {
            return function() {
                if (confirm("确定要卸载 " + pkg + " 吗？")) {
                    execShellAndGetOutput('pm uninstall ' + pkg);
                }
            };
        }(packageName);
        removeButton.textContent = "卸载";
        tdRemove.appendChild(removeButton);
        tr.appendChild(tdRemove);
        
        packageList.appendChild(tr);
        index++;
    }
    showProgress(false);
};


let loadApkFile = async () => {
    document.getElementById('apkFile').click();
};


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initFileInput();
    });
} else {
    initFileInput();
}

function initFileInput() {
    if (navigator.usb) {
        
    }
    let apkFile = document.getElementById('apkFile');
    if (apkFile) {
        apkFile.addEventListener('change', function() {
            const fileNameEl = document.getElementById('apkFileName');
            const files = Array.from(this.files).filter(file =>
                file.name.toLowerCase().endsWith('.apk')
            );
            if (files.length === 0) {
                fileNameEl.textContent = "未选择文件";
                this.value = '';
            } else if (files.length === 1) {
                fileNameEl.textContent = files[0].name;
            } else {
                fileNameEl.textContent = `已选择 ${files.length} 个 文件`;
            }
        });
    }
}


let installApkFile = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    
    const input = document.getElementById('apkFile');
    const validFiles = Array.from(input.files).filter(file =>
        file.name.toLowerCase().endsWith('.apk')
    );
    if (validFiles.length === 0) {
        alert("未选择 apk 文件");
        return;
    }
    clear();
    showProgress(true);
    log(`开始安装 ${validFiles.length} 个 APK 文件...\n`);
    let successCount = 0;
    let failCount = 0;
    try {
        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
            const remotePath = `/storage/emulated/0/Download/upload_${Date.now()}_${i}.apk`;
            log(`[${i + 1}/${validFiles.length}] 推送: ${file.name}`);
            await push(remotePath, file);
            
            log(`正在安装: ${file.name}`);
            const output = await execShellAndGetOutput(`pm install -g -r ${remotePath}`);
            if (output.includes('Success')) {
                successCount++;
                log(`✅ ${file.name} 安装成功\n`);
            } else {
                failCount++;
                log(`❌ ${file.name} 安装失败\n`);
            }
        }
        alert(`🎉 安装完成！成功 ${successCount} 个，失败 ${failCount} 个`);
        loadPackageList();
    } catch (error) {
        console.error("批量安装出错:", error);
        log("❌ 批量安装过程中发生错误，请查看控制台。");
        alert("安装过程中出错，请查看日志。");
    } finally {
        showProgress(false);
    }
};


