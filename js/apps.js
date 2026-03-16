// 应用安装相关功能

// 检查浏览器是否支持 WebUSB
let checkBrowserSupport = () => {
    if (!('usb' in navigator)) {
        alert('您的浏览器不支持 WebUSB API，请使用 Chrome 或 Edge 浏览器');
        return false;
    }
    return true;
};

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
        <div style="font-size: 16px; color: #666; margin-bottom: 20px;">${message}</div>
        <div style="width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        <div style="font-size: 14px; color: #999; margin-top: 20px;">${waitText}</div>
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
        <div style="font-size: 24px; margin-bottom: 15px; color: #333;">${stageText}</div>
        <div style="font-size: 16px; color: #666; margin-bottom: 20px;">${message}</div>
        <div style="width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        <div style="font-size: 14px; color: #999; margin-top: 20px;">请耐心等待，操作完成后将自动关闭此窗口</div>
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

// 通用车机下载安装函数
let downloadToPhoneAndPush = async (appName, downloadUrl, savePath, backupUrl = null, packageName = null) => {
    if (!checkBrowserSupport()) {
        return;
    }
    
    // 检查ADB连接状态
    if (!window.adbClient) {
        alert('请先建立ADB连接，然后再安装应用');
        return;
    }
    
    clear();
    showProgress(true);
    log('正在从车机下载 ' + appName + '...\n');
    log('下载链接: ' + downloadUrl);
    
    try {
        // 启用ADB安装
        await execShellAndGetOutput("setprop persist.sv.enable_adb_install 1");
        
        let downloadSuccess = false;
        let currentUrl = downloadUrl;
        
        // 尝试下载，最多2次（主链接和备用链接）
        for (let attempt = 1; attempt <= 2; attempt++) {
            if (attempt === 2 && backupUrl) {
                log('主链接失败，尝试备用链接...');
                currentUrl = backupUrl;
            } else if (attempt === 2 && !backupUrl) {
                break;
            }
            
            log(`尝试下载 (${attempt}/2)...`);
            
            // 使用curl下载，10秒超时，添加快速失败参数
            // --connect-timeout 5: 连接超时5秒
            // --max-time 10: 总超时10秒
            // --retry 0: 不重试，快速失败
            const downloadPromise = execShellAndGetOutput('curl -sL --connect-timeout 5 --max-time 10 --retry 0 -o ' + savePath + ' "' + currentUrl + '"');
            
            try {
                await downloadPromise;
                // 检查文件是否存在且大小正常（大于1MB）
                const checkResult = await execShellAndGetOutput('ls -l ' + savePath);
                if (checkResult.includes('.apk') && !checkResult.includes('No such file')) {
                    // 检查文件大小是否大于1MB（1048576字节）
                    const sizeMatch = checkResult.match(/\d+\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+(\d+)/);
                    if (sizeMatch && parseInt(sizeMatch[1]) > 1048576) {
                        downloadSuccess = true;
                        break;
                    } else {
                        log('文件太小，可能下载不完整');
                    }
                }
            } catch (e) {
                log('下载失败: ' + e.message);
            }
        }
        
        if (downloadSuccess) {
            log('\n下载完成，正在安装...\n');
            
            let installOutput = await execShellAndGetOutput("pm install -g -r " + savePath);
            
            // 安装完成后禁用ADB安装属性
            await execShellAndGetOutput("setprop persist.sv.enable_adb_install 0");
            
            if (installOutput.includes('Success')) {
                log('安装成功！');
                alert(appName + " 安装成功！");
                await execShellAndGetOutput('rm -f ' + savePath);
                log('已删除安装文件: ' + savePath);
                
                // 如果指定了包名，启动应用
                if (packageName) {
                    setTimeout(async () => {
                        log('正在启动 ' + appName + '...');
                        await execShellAndGetOutput('monkey -p ' + packageName + ' -c android.intent.category.LAUNCHER 1');
                        
                        // 启用无线ADB连接
                        log('正在启用无线ADB连接...');
                        await execShellAndGetOutput('setprop service.adb.tcp.port 5555');
                        await execShellAndGetOutput('stop adbd');
                        await execShellAndGetOutput('start adbd');
                        log('无线ADB已启用，端口：5555');
                    }, 1000);
                }
            } else {
                log('安装失败: ' + installOutput);
                alert(appName + ' 安装失败！\n\n' + installOutput);
            }
        } else {
            // 下载失败，提供手动下载和自选APK选项
            log('车机下载失败');
            
            const userChoice = confirm(
                '车机下载失败，可能原因：\n' +
                '1. 车机网络连接问题\n' +
                '2. 下载链接暂时不可用\n' +
                '3. 下载超时（30秒）\n\n' +
                '点击「确定」打开下载链接手动下载，\n' +
                '点击「取消」使用「自选APK」功能安装。'
            );
            
            if (userChoice) {
                // 打开下载链接让用户手动下载
                window.open(downloadUrl, '_blank');
                log('已打开下载链接: ' + downloadUrl);
                
                setTimeout(() => {
                    const useLocalFile = confirm('下载完成后，是否立即使用「自选APK」功能安装？');
                    if (useLocalFile) {
                        document.getElementById('apkFile').click();
                    }
                }, 500);
            } else {
                // 直接使用自选APK
                document.getElementById('apkFile').click();
            }
        }
    } catch (error) {
        log('安装过程出错: ' + error.message);
        alert('安装失败: ' + error.message);
    }
    
    showProgress(false);
};

// 沙发管家
let sfgj = async () => {
    const downloadUrl = 'http://a14472357.328657.xyz/a14472357/沙发管家4.9.54.apk';
    const savePath = '/storage/emulated/0/Download/sfgj.apk';
    await downloadToPhoneAndPush('沙发管家', downloadUrl, savePath, null, 'com.shafa.markethd');
};

// 应用管家
let yygj = async () => {
    const downloadUrl = 'https://file.vju.cc/%E5%BA%94%E7%94%A8%E7%AE%A1%E5%AE%B6/%E5%8E%86%E5%8F%B2%E7%89%88%E6%9C%AC/%E5%BA%94%E7%94%A8%E7%AE%A1%E5%AE%B6v1.8.3%28%E6%AD%A3%E5%BC%8F%E7%89%88%29%E5%85%AC%E7%AD%BE%E7%89%88.apk';
    const backupUrl = 'http://a14472357.328657.xyz/a14472357/应用管家1.8.3.apk';
    const savePath = '/storage/emulated/0/Download/yygj.apk';
    await downloadToPhoneAndPush('应用管家', downloadUrl, savePath, backupUrl, 'com.vjoycar.gj');
};



// 哨兵监控
let sentry = async () => {
    const downloadUrl = 'http://a14472357.328657.xyz/a14472357/哨兵监控v1.1.8.apk';
    const savePath = '/storage/emulated/0/Download/sentry.apk';
    await downloadToPhoneAndPush('哨兵监控', downloadUrl, savePath, null);
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
    const downloadUrl = 'http://a14472357.328657.xyz/a14472357/易控车机版V1.6.10_PIP.apk';
    const savePath = '/storage/emulated/0/Download/ykpip.apk';
    await downloadToPhoneAndPush('易控车机PIP', downloadUrl, savePath, null);
};


// 侧边栏
let cdb = async () => {
    const downloadUrl = 'http://a14472357.328657.xyz/a14472357/侧边栏_1.0.apk';
    const savePath = '/storage/emulated/0/Download/cdb.apk';
    await downloadToPhoneAndPush('侧边栏', downloadUrl, savePath, null, 'com.hzsoft.sidebar');
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
    
    // 检查是否有 Tango ADB 客户端
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
    
    // 检查ADB连接状态
    if (!window.adbClient) {
        alert('请先建立ADB连接，然后再安装APK文件');
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
        
        if (files.length === 0) {
            log('未找到APK文件');
            alert('未在 ' + directory + ' 目录下找到APK文件。\n\n请先将APK文件传到车机的「下载」目录。');
            showProgress(false);
            return;
        }
        
        log('找到 ' + files.length + ' 个APK文件:\n');
        files.forEach((file, index) => {
            const sizeMB = (file.size / 1024 / 1024).toFixed(2);
            log((index + 1) + '. ' + file.name + ' (' + sizeMB + ' MB)');
        });
        
        // 创建选择对话框
        const fileList = files.map((file, index) => {
            const sizeMB = (file.size / 1024 / 1024).toFixed(2);
            return `${index + 1}. ${file.name} (${sizeMB} MB)`;
        }).join('\n');
        
        const selectedIndex = prompt(
            '找到以下APK文件，请输入编号选择要安装的文件:\n\n' + fileList + '\n\n输入编号 (1-' + files.length + '):'
        );
        
        if (selectedIndex !== null) {
            const index = parseInt(selectedIndex) - 1;
            if (index >= 0 && index < files.length) {
                const selectedFile = files[index];
                log('\n选择了: ' + selectedFile.name);
                if (onSelect) {
                    await onSelect(selectedFile);
                }
            } else {
                alert('无效的编号');
            }
        }
    } catch (error) {
        log('扫描失败: ' + error.message);
        alert('扫描目录失败: ' + error.message);
    }
    
    showProgress(false);
};