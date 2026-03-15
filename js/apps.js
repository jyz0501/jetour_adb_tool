// 应用安装相关功能

// 无法关闭的弹窗
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
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 12px;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
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
        <div style="font-size: 24px; margin-bottom: 15px; color: #333;">${stageText}</div>
        <div style="font-size: 16px; color: #666; line-height: 1.6;">${message}</div>
        <div style="margin-top: 20px; color: #999; font-size: 14px;">${waitText}</div>
        <div style="margin-top: 10px; color: #ff6b6b; font-size: 14px; font-weight: bold;">请勿关闭页面或刷新浏览器</div>
    `;
    
    blockingModal.appendChild(content);
    document.body.appendChild(blockingModal);
}

function updateBlockingModal(message, stage) {
    if (!blockingModal) {
        return;
    }
    
    const content = blockingModal.querySelector('div > div');
    if (!content) {
        return;
    }
    
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
        <div style="font-size: 24px; margin-bottom: 15px; color: #333;">${stageText}</div>
        <div style="font-size: 16px; color: #666; line-height: 1.6;">${message}</div>
        <div style="margin-top: 20px; color: #999; font-size: 14px;">${waitText}</div>
        <div style="margin-top: 10px; color: #ff6b6b; font-size: 14px; font-weight: bold;">请勿关闭页面或刷新浏览器</div>
    `;
}

function removeBlockingModal() {
    if (blockingModal) {
        blockingModal.remove();
        blockingModal = null;
    }
}

// 检查浏览器支持
function checkBrowserSupport() {
    const isSupported = checkWebUSBSupport();
    if (!isSupported || !navigator.usb) {
        alert('检测到您的浏览器不支持，请根据顶部的 "警告提示" 更换指定浏览器使用。');
        return false;
    }
    
    // 检查是否已连接设备
    if (!window.adbClient) {
        alert('未连接到设备，请先点击"开始连接"按钮连接设备');
        return false;
    }
    
    return true;
}

// 通用车机下载安装函数
let downloadAndInstall = async (appName, downloadUrl, savePath, backupUrl = null) => {
    if (!checkBrowserSupport()) {
        return;
    }
    clear();
    showProgress(true);
    showBlockingModal('正在从车机下载 ' + appName + '...');
    log('正在从车机下载 ' + appName + '...\n');
    
    try {
        await exec_shell("setprop persist.sv.enable_adb_install 1");
        
        let downloadSuccess = false;
        const downloadPromise = exec_shell('curl -sL -o ' + savePath + ' "' + downloadUrl + '"');
        
        const progressInterval = setInterval(async () => {
            try {
                const sizeResult = await window.adbClient.subprocess.noneProtocol.spawnWaitText(['ls', '-l', savePath]);
                const sizeMatch = sizeResult.match(/\d+\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+(\d+)/);
                if (sizeMatch) {
                    const sizeMB = (parseInt(sizeMatch[1]) / 1024 / 1024).toFixed(2);
                    log('下载中... 已下载 ' + sizeMB + ' MB\r');
                }
            } catch (e) {}
        }, 1000);
        
        try {
            await downloadPromise;
            downloadSuccess = true;
        } finally {
            clearInterval(progressInterval);
        }
        
        if (downloadSuccess) {
            updateBlockingModal('正在安装 ' + appName + '...', 'install');
            log('\n下载完成，正在安装...\n');
            let installOutput = await execShellAndGetOutput("pm install -g -r " + savePath);
            
            if (installOutput.includes('Success')) {
                log('安装成功！');
                alert(appName + " 安装成功！");
                await exec_shell('rm -f ' + savePath);
                log('已删除安装文件: ' + savePath);
                removeBlockingModal();
                setTimeout(() => {
                    exec_shell('monkey -p com.yunpan.appmanage -c android.intent.category.LAUNCHER 1');
                    log('正在启动应用管家...');
                }, 1000);
            } else {
                log('安装失败: ' + installOutput);
                listDeviceApkFiles('/storage/emulated/0/Download', async (file) => {
                    await installFromDevice(file.path);
                });
            }
        }
    } catch (error) {
        log('下载失败: ' + error.message);
        if (error.message.includes('404') || error.message.includes('Not Found')) {
            log('错误: 文件不存在或链接无法抵达');
        } else if (error.message.includes('Connection') || error.message.includes('Network')) {
            log('错误: 网络连接失败，请检查网络');
        } else {
            log('错误: 下载过程中发生未知错误');
        }
        listDeviceApkFiles('/storage/emulated/0/Download', async (file) => {
            await installFromDevice(file.path);
        });
    }
    
    showProgress(false);
};

// 通用下载到手机再推送到车机安装函数
let downloadToPhoneAndPush = async (appName, downloadUrl, savePath, backupUrl = null, packageName = null) => {
    if (!checkBrowserSupport()) {
        return;
    }
    clear();
    showProgress(true);
    showBlockingModal('正在下载 ' + appName + ' 到手机...', 'download');
    log('正在下载 ' + appName + ' 到手机...\n');
    
    try {
        // 先下载到手机本地
        let response = await fetch(downloadUrl);
        
        // 如果主链接失败，尝试备用链接
        if (!response.ok && backupUrl) {
            log('主链接下载失败，尝试备用链接...');
            response = await fetch(backupUrl);
        }
        
        if (!response.ok) {
            throw new Error('下载失败: ' + response.status);
        }
        
        // 获取文件数据
        const blob = await response.blob();
        const fileSize = (blob.size / 1024 / 1024).toFixed(2);
        log('下载完成，文件大小: ' + fileSize + ' MB');
        
        // 推送到车机
        updateBlockingModal('正在推送 ' + appName + ' 到车机...', 'install');
        log('正在推送 ' + appName + ' 到车机...\n');
        
        // 使用 ADB push 将文件推送到车机
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // 创建临时文件并推送
        await exec_shell('mkdir -p /storage/emulated/0/Download');
        
        // 使用 sync 服务推送文件
        const sync = await window.adbClient.sync();
        await sync.push(savePath, uint8Array);
        await sync.quit();
        
        log('推送完成，正在安装...\n');
        
        // 安装应用
        await exec_shell("setprop persist.sv.enable_adb_install 1");
        let installOutput = await execShellAndGetOutput("pm install -g -r " + savePath);
        
        if (installOutput.includes('Success')) {
            log('安装成功！');
            alert(appName + " 安装成功！");
            await exec_shell('rm -f ' + savePath);
            log('已删除安装文件: ' + savePath);
            removeBlockingModal();
            
            // 如果指定了包名，启动应用
            if (packageName) {
                setTimeout(() => {
                    exec_shell('monkey -p ' + packageName + ' -c android.intent.category.LAUNCHER 1');
                    log('正在启动 ' + appName + '...');
                }, 1000);
            }
        } else {
            log('安装失败: ' + installOutput);
            alert(appName + ' 安装失败！');
            removeBlockingModal();
        }
    } catch (error) {
        log('下载失败: ' + error.message);
        if (error.message.includes('404') || error.message.includes('Not Found')) {
            log('错误: 文件不存在或链接无法抵达');
        } else if (error.message.includes('Connection') || error.message.includes('Network')) {
            log('错误: 网络连接失败，请检查网络');
        } else {
            log('错误: 下载过程中发生未知错误');
        }
        alert('下载失败: ' + error.message);
        removeBlockingModal();
    }
    
    showProgress(false);
};

// 沙发管家
let sfgj = async () => {
    const downloadUrl = 'http://a14472357.328657.xyz/a14472357/沙发管家4.9.54.apk';
    const backupUrl = 'https://101.42.10.175:35070/down/IvlRhguh57DO.apk';
    const savePath = '/storage/emulated/0/Download/sfgj.apk';
    await downloadToPhoneAndPush('沙发管家', downloadUrl, savePath, backupUrl, 'com.shafa.markethd');
};

// 应用管家
let yygj = async () => {
    const downloadUrl = 'https://file.vju.cc/%E5%BA%94%E7%94%A8%E7%AE%A1%E5%AE%B6/%E5%8E%86%E5%8F%B2%E7%89%88%E6%9C%AC/%E5%BA%94%E7%94%A8%E7%AE%A1%E5%AE%B6v1.8.3%28%E6%AD%A3%E5%BC%8F%E7%89%88%29%E5%85%AC%E7%AD%BE%E7%89%88.apk';
    const backupUrl = 'http://a14472357.328657.xyz/a14472357/应用管家1.8.3.apk';
    const savePath = '/storage/emulated/0/Download/yygj.apk';
    await downloadToPhoneAndPush('应用管家', downloadUrl, savePath, backupUrl, 'com.vjoycar.gj');
};

// 从设备安装APK
let installFromDevice = async (devicePath) => {
    if (!window.adbClient) {
        alert('请先连接设备');
        return;
    }
    
    clear();
    showProgress(true);
    showBlockingModal('正在安装 ' + devicePath);
    log('正在安装 ' + devicePath + ' ...\n');
    
    try {
        await exec_shell("setprop persist.sv.enable_adb_install 1");
        let installOutput = await execShellAndGetOutput("pm install -g -r " + devicePath);
        
        if (installOutput.includes('Success')) {
            log('安装成功！');
            alert("安装成功！");
            await exec_shell('rm -f ' + devicePath);
            log('已删除安装文件: ' + devicePath);
            removeBlockingModal();
        } else {
            log('安装失败: ' + installOutput);
            alert("安装失败！");
            removeBlockingModal();
        }
    } catch (error) {
        log('安装失败: ' + error.message);
        alert("安装失败: " + error.message);
        removeBlockingModal();
    }
    
    showProgress(false);
};

// 哨兵监控
let sentry = async () => {
    const downloadUrl = 'http://a14472357.328657.xyz/a14472357/哨兵监控v1.1.8.apk';
    const backupUrl = 'https://101.42.10.175:35070/down/tZyE46IwtbVf.apk';
    const savePath = '/storage/emulated/0/Download/sentry.apk';
    await downloadToPhoneAndPush('哨兵监控', downloadUrl, savePath, backupUrl);
};

// 小横条
let hstrip = async () => {
    const downloadUrl = 'http://a14472357.328657.xyz/a14472357/Gesture_1.6.4.apk';
    const backupUrl = 'http://a14472357.a.328657.xyz/a14472357/小横条_2.0.0.apk';
    const savePath = '/storage/emulated/0/Download/hstrip.apk';
    await downloadToPhoneAndPush('小横条', downloadUrl, savePath, backupUrl);
};

// 易控车机PIP
let ykpip = async () => {
    const downloadUrl = 'http://a14472357.328657.xyz/a14472357/EDGE.apk';
    const backupUrl = 'https://101.42.10.175:35070/down/qdieD4GPTDev.apk';
    const savePath = '/storage/emulated/0/Download/ykpip.apk';
    await downloadToPhoneAndPush('易控车机PIP', downloadUrl, savePath, backupUrl);
};

// 无障碍管理器
let wzagl = async () => {
    await downloadAndInstall('无障碍管理器', '', '/storage/emulated/0/Download/wzagl.apk');
};

// 返回菜单键
let fhcdj = async () => {
    await downloadAndInstall('返回菜单键', '', '/storage/emulated/0/Download/fhcdj.apk');
};

// 氢桌面
let qzm = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    clear();
    showProgress(true);
    showBlockingModal('正在从车机下载氢桌面...');
    log('正在从车机下载氢桌面...\n');
    
    const downloadUrl = 'https://101.42.10.175:35070/down/tY8gaYp7Wbjm.apk';
    const savePath = '/storage/emulated/0/Download/qzm.apk';
    
    try {
        await exec_shell("setprop persist.sv.enable_adb_install 1");
        
        const downloadCommand = 'curl -sL -o ' + savePath + ' "' + downloadUrl + '"';
        const downloadPromise = exec_shell(downloadCommand);
        
        const progressInterval = setInterval(async () => {
            try {
                const sizeResult = await window.adbClient.subprocess.noneProtocol.spawnWaitText(['ls', '-l', savePath]);
                const sizeMatch = sizeResult.match(/\d+\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+(\d+)/);
                if (sizeMatch) {
                    const sizeMB = (parseInt(sizeMatch[1]) / 1024 / 1024).toFixed(2);
                    log('下载中... 已下载 ' + sizeMB + ' MB\r');
                }
            } catch (e) {}
        }, 1000);
        
        let downloadSuccess = false;
        try {
            await downloadPromise;
            downloadSuccess = true;
        } finally {
            clearInterval(progressInterval);
        }
        
        if (downloadSuccess) {
            updateBlockingModal('正在安装侧边栏...', 'install');
            log('\n下载完成，正在安装...\n');
            let installOutput = await execShellAndGetOutput("pm install -g -r " + savePath);
            
            if (installOutput.includes('Success')) {
                log('安装成功！');
                alert("安装成功！");
                await exec_shell('rm -f ' + savePath);
                log('已删除安装文件: ' + savePath);
                removeBlockingModal();
                setTimeout(() => {
                    exec_shell('monkey -p com.hzsoft.sidebar -c android.intent.category.LAUNCHER 1');
                    log('正在启动侧边栏...');
                }, 1000);
            } else {
                log('安装失败: ' + installOutput);
                removeBlockingModal();
                listDeviceApkFiles('/storage/emulated/0/Download', async (file) => {
                    await installFromDevice(file.path);
                });
            }
        }
    } catch (error) {
        log('下载失败: ' + error.message);
        removeBlockingModal();
        listDeviceApkFiles('/storage/emulated/0/Download', async (file) => {
            await installFromDevice(file.path);
        });
    }
    
    showProgress(false);
};

// 侧边栏
let cdb = async () => {
    const downloadUrl = 'http://a14472357.328657.xyz/a14472357/侧边栏_1.0.apk';
    const backupUrl = 'https://101.42.10.175:35070/down/P32XjDMnyz3M.apk';
    const savePath = '/storage/emulated/0/Download/cdb.apk';
    await downloadToPhoneAndPush('侧边栏', downloadUrl, savePath, backupUrl, 'com.hzsoft.sidebar');
};

// 布丁UI
let bdui = async () => {
    const downloadUrl = 'https://file.vju.cc/%E5%B8%83%E4%B8%81UI%E6%A1%8C%E9%9D%A2/%E5%B8%83%E4%B8%81UI_2.2.3.apk';
    const backupUrl = 'http://a14472357.328657.xyz/a14472357/布丁UI_2.2.3.apk';
    const savePath = '/storage/emulated/0/Download/bdui.apk';
    await downloadToPhoneAndPush('布丁UI', downloadUrl, savePath, backupUrl, 'com.buding.ui');
};

// 蓝牙遥控 - 本地下载到手机
let lyyk = () => {
    const downloadUrl = 'http://a14472357.328657.xyz/a14472357/蓝牙遥控2.0.9.apk';
    const backupUrl = 'http://a14472357.a.328657.xyz/a14472357/蓝牙遥控2.0.9.apk';
    
    // 创建隐藏的下载链接
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = '蓝牙遥控2.0.9.apk';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    log('蓝牙遥控下载已开始，请检查下载文件夹');
};

// 启动应用管家
function startGuanJia() {
    // 检查是否有 Tango ADB 客户端
    if (window.adbClient) {
        clear();
        showProgress(true);
        log('开始启动应用管家...\n');
        try {
            // 使用 Tango ADB 执行启动命令
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
    
    // 未连接设备
    alert("未连接到设备，请先点击'开始连接'按钮连接设备");
}

// 刷新用户应用列表
let loadPackageList = async () => {
    if (!checkBrowserSupport()) {
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
                exec_shell('monkey -p ' + pkg + ' -c android.intent.category.LAUNCHER 1');
            };
        }(packageName);
        launchButton.textContent = "启动";
        tdActions.appendChild(launchButton);
        
        var stopButton = document.createElement("button");
        stopButton.className = "btn btn-connect btn-sm";
        stopButton.style.marginRight = "5px";
        stopButton.style.backgroundColor = "#2196f3";
        stopButton.onclick = function(pkg) {
            return function() {
                exec_shell('am force-stop ' + pkg);
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
                    exec_shell('pm uninstall ' + pkg);
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

// 自选apk
let loadApkFile = async () => {
    document.getElementById('apkFile').click();
};

// 处理 APK 文件选择事件
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initFileInput();
    });
} else {
    initFileInput();
}

function initFileInput() {
    if (navigator.usb) {
        // 隐藏不支持提示
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

// 安装自选apk
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
    try {
        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
            const remotePath = `/storage/emulated/0/Download/upload_${Date.now()}_${i}.apk`;
            log(`[${i + 1}/${validFiles.length}] 推送: ${file.name}`);
            await push(remotePath, file);
            // 安装 APK（-r 表示覆盖安装，-g 自动授予权限）
            log(`正在安装: ${file.name}`);
            const output = await execShellAndGetOutput(`pm install -g -r ${remotePath}`);
            if (output.includes('Success')) {
                log(`✅ ${file.name} 安装成功\n`);
            } else {
                log(`❌ ${file.name} 安装失败\n`);
            }
        }
        alert(`🎉 共 ${validFiles.length} 个应用安装完成！`);
        loadPackageList();
    } catch (error) {
        console.error("批量安装出错:", error);
        log("❌ 批量安装过程中发生错误，请查看控制台。");
        alert("安装过程中出错，请查看日志。");
    } finally {
        showProgress(false);
    }
};

// 列出设备上的APK文件
let listDeviceApkFiles = async (directory, onSelect) => {
    if (!window.adbClient) {
        alert('请先连接设备');
        return;
    }
    
    clear();
    showProgress(true);
    log('正在扫描 ' + directory + ' 目录下的APK文件...\n');
    log('提示：如果找不到APK文件，请先将APK文件通过数据线传到车机存储目录\n');
    
    alert('即将扫描 ' + directory + ' 目录下的APK文件。\n\n如果找不到文件，请先将APK文件传到车机的「下载」或「存储」目录。');
    
    try {
        const result = await window.adbClient.subprocess.noneProtocol.spawnWaitText([
            'ls', '-la', directory + '/*.apk'
        ]);
        
        const lines = result.trim().split('\n').filter(line => line.endsWith('.apk'));
        const files = lines.map(line => {
            const match = line.match(/^[-drwx]+\s+\d+\s+\w+\s+\w+\s+(\d+)\s+.+\s+(.+)$/);
            const size = match ? match[1] : '0';
            const filename = match ? match[2] : line.trim().split(/\s+/).pop();
            return {
                name: filename,
                path: directory + '/' + filename,
                size: parseInt(size) || 0
            };
        });
        
        showProgress(false);
        
        if (files.length === 0) {
            alert('未找到APK文件！\n\n请确认：\n1. APK文件是否已传到车机存储\n2. 尝试切换到其他目录（下载/存储）\n3. 或使用车机浏览器下载APK后再安装');
            return;
        }
        
        showApkFilePicker(files, directory, onSelect);
        
    } catch (error) {
        showProgress(false);
        alert('扫描失败: ' + error.message);
    }
};

// 显示APK文件选择弹窗
let showApkFilePicker = (files, currentDir, onSelect) => {
    // 创建弹窗
    const modal = document.createElement('div');
    modal.id = 'apk-picker-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;justify-content:center;align-items:center;';
    
    const content = document.createElement('div');
    content.style.cssText = 'background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:16px;padding:24px;max-width:600px;width:90%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);';
    
    let html = '<div style="background:white;border-radius:12px;padding:20px;">';
    html += '<h3 style="margin-top:0;color:#333;font-size:20px;display:flex;align-items:center;gap:10px;">📦 选择APK文件</h3>';
    html += '<p style="color:#666;background:#f5f5f5;padding:10px;border-radius:8px;font-size:13px;">📂 当前目录: <code style="background:#e8f4fd;padding:2px 6px;border-radius:4px;">' + currentDir + '</code></p>';
    html += '<div style="display:flex;gap:8px;margin-bottom:15px;flex-wrap:wrap;">';
    html += '<button onclick="listDeviceApkFiles(\'/storage/emulated/0/Download\', window.currentApkSelectCallback)" style="padding:8px 14px;cursor:pointer;background:#4CAF50;color:white;border:none;border-radius:6px;font-weight:bold;">📥 Download文件夹</button>';
    html += '<button onclick="listDeviceApkFiles(\'/storage/emulated/0\', window.currentApkSelectCallback)" style="padding:8px 14px;cursor:pointer;background:#2196F3;color:white;border:none;border-radius:6px;font-weight:bold;">💾 车机内部存储</button>';
    html += '</div>';
    html += '<div style="margin-bottom:15px;display:flex;gap:8px;">';
    html += '<input type="text" id="custom-apk-path" placeholder="输入其他目录路径" style="flex:1;padding:10px;border:2px solid #ddd;border-radius:8px;font-size:14px;">';
    html += '<button onclick="var path=document.getElementById(\'custom-apk-path\').value;if(path)listDeviceApkFiles(path, window.currentApkSelectCallback)" style="padding:10px 16px;cursor:pointer;background:#FF9800;color:white;border:none;border-radius:8px;font-weight:bold;">🔍 跳转</button>';
    html += '</div>';
    html += '<div style="background:#f8f9fa;border-radius:8px;padding:10px;margin-bottom:15px;font-size:12px;color:#666;">';
    html += '💡 提示: 点击文件选中后点击确定按钮安装';
    html += '</div>';
    html += '<div id="selected-file-info" style="display:none;background:#e3f2fd;border-radius:8px;padding:10px;margin-bottom:15px;font-size:13px;color:#1565c0;">';
    html += '</div>';
    html += '<div id="apk-file-list" style="max-height:350px;overflow-y:auto;border:1px solid #e0e0e0;border-radius:8px;background:white;">';
    
    files.forEach((file, index) => {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        const displayName = file.name.replace(/\.apk$/i, '');
        html += '<div onclick="window.selectApkFile(' + index + ')" style="padding:12px;cursor:pointer;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:12px;transition:all 0.2s;" onmouseover="this.style.background=\'#f8f9fa\'" onmouseout="this.style.background=\'#fff\'">';
        html += '<div style="width:40px;height:40px;background:linear-gradient(135deg,#4CAF50,#2E7D32);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;">📦</div>';
        html += '<div style="flex:1;overflow:hidden;"><div style="font-weight:600;color:#333;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + displayName + '</div></div>';
        html += '<div style="background:#e8f5e9;color:#2e7d32;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;">' + sizeMB + ' MB</div>';
        html += '</div>';
    });
    
    html += '</div>';
    html += '<div style="margin-top:20px;text-align:right;display:flex;gap:10px;justify-content:flex-end;">';
    html += '<button onclick="document.getElementById(\'apk-picker-modal\').remove()" style="padding:10px 20px;cursor:pointer;background:#9e9e9e;color:white;border:none;border-radius:8px;font-size:14px;">取消</button>';
    html += '<button id="confirm-apk-btn" onclick="window.confirmApkSelect()" disabled style="padding:10px 24px;cursor:pointer;background:#9e9e9e;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:bold;">确定安装</button>';
    html += '</div>';
    html += '</div>';
    
    content.innerHTML = html;
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // 存储文件和回调
    window.apkFileList = files;
    window.currentApkSelectCallback = onSelect;
    
    // 全局选择函数
    window.selectApkFile = (index) => {
        document.querySelectorAll('#apk-file-list > div').forEach(d => d.style.background = '#fff');
        document.querySelectorAll('#apk-file-list > div')[index].style.background = '#e3f2fd';
        window.selectedApkIndex = index;
        const btn = document.getElementById('confirm-apk-btn');
        btn.disabled = false;
        btn.style.background = '#28a745';
        btn.style.cursor = 'pointer';
        
        // 显示选中文件的路径
        const file = files[index];
        const selectedInfo = document.getElementById('selected-file-info');
        if (selectedInfo) {
            selectedInfo.style.display = 'block';
            selectedInfo.innerHTML = '✅ 已选择: ' + file.name.replace(/\.apk$/i, '');
        }
    };
    
    window.confirmApkSelect = () => {
        if (window.selectedApkIndex !== undefined && window.currentApkSelectCallback) {
            const file = window.apkFileList[window.selectedApkIndex];
            modal.remove();
            window.currentApkSelectCallback(file);
        }
    };
};

// 导出函数
try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            sfgj,
            yygj,
            qzm,
            cdb,
            startGuanJia,
            loadPackageList,
            loadApkFile,
            installApkFile
        };
    }
} catch (e) {
    // 浏览器环境，不需要导出
}