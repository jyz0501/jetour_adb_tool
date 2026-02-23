// 应用安装相关功能

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
let downloadAndInstall = async (appName, downloadUrl, savePath) => {
    if (!checkBrowserSupport()) {
        return;
    }
    clear();
    showProgress(true);
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
            log('\n下载完成，正在安装...\n');
            let installOutput = await execShellAndGetOutput("pm install -g -r " + savePath);
            
            if (installOutput.includes('Success')) {
                log('安装成功！');
                alert(appName + " 安装成功！");
            } else {
                log('安装失败: ' + installOutput);
                listDeviceApkFiles('/storage/emulated/0/Download', async (file) => {
                    await installFromDevice(file.path);
                });
            }
        }
    } catch (error) {
        log('下载失败: ' + error.message);
        listDeviceApkFiles('/storage/emulated/0/Download', async (file) => {
            await installFromDevice(file.path);
        });
    }
    
    showProgress(false);
};

// 沙发管家
let sfgj = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    clear();
    showProgress(true);
    log('正在从车机下载沙发管家...\n');
    
    const downloadUrl = 'https://d.pcs.baidu.com/file/c8166e4edq9e7d81c03372cc1eeb9f53?fid=3137622920-250528-500228511666281&rt=pr&sign=FDtAERK-DCb740ccc5511e5e8fedcff06b081203-D37ftFJku9RzrB9i8OsuyVuIG%2Fw%3D&expires=8h&chkbd=0&chkv=0&dp-logid=2300820975970445967&dp-callid=0&dstime=1771868814&r=820712047&vuk=3137622920&origin_appid=15195230&file_type=0&access_token=123.358d7c5c9043c68bc5361310dbb63f5e.Y3PiNU1DD4jrSdzmaMxBL-37Fr2D_vnvsj0CfES.iZEF3Q';
    const savePath = '/storage/emulated/0/Download/sfgj.apk';
    
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
            log('\n下载完成，正在安装...\n');
            let installOutput = await execShellAndGetOutput("pm install -g -r " + savePath);
            
            if (installOutput.includes('Success')) {
                log('安装成功！');
                alert("安装成功！");
            } else {
                log('安装失败: ' + installOutput);
                listDeviceApkFiles('/storage/emulated/0/Download', async (file) => {
                    await installFromDevice(file.path);
                });
            }
        }
    } catch (error) {
        log('下载失败: ' + error.message);
        listDeviceApkFiles('/storage/emulated/0/Download', async (file) => {
            await installFromDevice(file.path);
        });
    }
    
    showProgress(false);
};

// 应用管家
let yygj = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    clear();
    showProgress(true);
    log('正在从车机下载应用管家...\n');
    
    const downloadUrl = 'https://d.pcs.baidu.com/file/9eb20d8a4uede39fa73a7527c8f7cf44?fid=3137622920-250528-377197960018856&rt=pr&sign=FDtAERK-DCb740ccc5511e5e8fedcff06b081203-J3ccEAoM635ckMAK22t%2Byn8Dz3s%3D&expires=8h&chkbd=0&chkv=0&dp-logid=2467307729363477114&dp-callid=0&dstime=1771870478&r=924670668&vuk=3137622920&origin_appid=15195230&file_type=0&access_token=123.358d7c5c9043c68bc5361310dbb63f5e.Y3PiNU1DD4jrSdzmaMxBL-37Fr2D_vnvsj0CfES.iZEF3Q';
    const savePath = '/storage/emulated/0/Download/yygj.apk';
    
    try {
        await exec_shell("setprop persist.sv.enable_adb_install 1");
        
        // 使用车机上的 curl 下载（带进度显示）
        let downloadSuccess = false;
        
        // 启动下载命令
        const downloadCommand = 'curl -sL -o ' + savePath + ' "' + downloadUrl + '"';
        
        // 启动下载
        const downloadPromise = exec_shell(downloadCommand);
        
        // 启动进度监控
        const progressInterval = setInterval(async () => {
            try {
                const sizeResult = await window.adbClient.subprocess.noneProtocol.spawnWaitText([
                    'ls', '-l', savePath
                ]);
                const sizeMatch = sizeResult.match(/\d+\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+(\d+)/);
                if (sizeMatch) {
                    const sizeMB = (parseInt(sizeMatch[1]) / 1024 / 1024).toFixed(2);
                    log('下载中... 已下载 ' + sizeMB + ' MB\r');
                }
            } catch (e) {
                // 文件还不存在
            }
        }, 1000);
        
        try {
            await downloadPromise;
            downloadSuccess = true;
        } finally {
            clearInterval(progressInterval);
        }
        
        if (downloadSuccess) {
            log('\n下载完成，正在安装...\n');
            let installOutput = await execShellAndGetOutput("pm install -g -r " + savePath);
            
            if (installOutput.includes('Success')) {
                log('安装成功！');
                alert("安装成功！");
            } else {
                log('安装失败: ' + installOutput);
                listDeviceApkFiles('/storage/emulated/0/Download', async (file) => {
                    await installFromDevice(file.path);
                });
            }
        }
    } catch (error) {
        log('下载失败: ' + error.message);
        log('请在车机浏览器中手动下载 APK，然后从设备选择安装');
        listDeviceApkFiles('/storage/emulated/0/Download', async (file) => {
            await installFromDevice(file.path);
        });
    }
    
    showProgress(false);
};

// 从设备安装APK
let installFromDevice = async (devicePath) => {
    if (!window.adbClient) {
        alert('请先连接设备');
        return;
    }
    
    clear();
    showProgress(true);
    log('正在安装 ' + devicePath + ' ...\n');
    
    try {
        await exec_shell("setprop persist.sv.enable_adb_install 1");
        let installOutput = await execShellAndGetOutput("pm install -g -r " + devicePath);
        
        if (installOutput.includes('Success')) {
            log('安装成功！');
            alert("安装成功！");
        } else {
            log('安装失败: ' + installOutput);
            alert("安装失败！");
        }
    } catch (error) {
        log('安装失败: ' + error.message);
        alert("安装失败: " + error.message);
    }
    
    showProgress(false);
};

// 权限狗
let qxg = async () => {
    await downloadAndInstall('权限狗', '', '/storage/emulated/0/Download/qxg.apk');
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
    log('正在从车机下载氢桌面...\n');
    
    const downloadUrl = 'https://d.pcs.baidu.com/file/24135b396r213e6e7ab2aaa07babcca9?fid=3137622920-250528-971560898191160&rt=pr&sign=FDtAERK-DCb740ccc5511e5e8fedcff06b081203-wlapdnAGxLZi%2BVsKx%2BKgXVg8RUg%3D&expires=8h&chkbd=0&chkv=0&dp-logid=2695581379901006603&dp-callid=0&dstime=1771872758&r=802407441&vuk=3137622920&origin_appid=15195230&file_type=0&access_token=123.358d7c5c9043c68bc5361310dbb63f5e.Y3PiNU1DD4jrSdzmaMxBL-37Fr2D_vnvsj0CfES.iZEF3Q';
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
            log('\n下载完成，正在安装...\n');
            let installOutput = await execShellAndGetOutput("pm install -g -r " + savePath);
            
            if (installOutput.includes('Success')) {
                log('安装成功！');
                alert("安装成功！");
            } else {
                log('安装失败: ' + installOutput);
                listDeviceApkFiles('/storage/emulated/0/Download', async (file) => {
                    await installFromDevice(file.path);
                });
            }
        }
    } catch (error) {
        log('下载失败: ' + error.message);
        listDeviceApkFiles('/storage/emulated/0/Download', async (file) => {
            await installFromDevice(file.path);
        });
    }
    
    showProgress(false);
};

// 侧边栏
let cdb = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    clear();
    showProgress(true);
    log('正在从车机下载侧边栏...\n');
    
    const downloadUrl = 'https://d.pcs.baidu.com/file/1d9fe9a24sd207d80365953e6b617000?fid=3137622920-250528-6609345292430&rt=pr&sign=FDtAERVK-DCb740ccc5511e5e8fedcff06b081203-YjbTT92j0uci%2FRJzaq8i%2FpN3mmo%3D&expires=8h&chkbd=0&chkv=3&dp-logid=2306754795533280547&dp-callid=0&dstime=1771868874&r=777574612&vuk=3137622920&origin_appid=15195230&file_type=0&access_token=123.358d7c5c9043c68bc5361310dbb63f5e.Y3PiNU1DD4jrSdzmaMxBL-37Fr2D_vnvsj0CfES.iZEF3Q';
    const savePath = '/storage/emulated/0/Download/cdb.apk';
    
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
            log('\n下载完成，正在安装...\n');
            let installOutput = await execShellAndGetOutput("pm install -g -r " + savePath);
            
            if (installOutput.includes('Success')) {
                log('安装成功！');
                alert("安装成功！");
            } else {
                log('安装失败: ' + installOutput);
                listDeviceApkFiles('/storage/emulated/0/Download', async (file) => {
                    await installFromDevice(file.path);
                });
            }
        }
    } catch (error) {
        log('下载失败: ' + error.message);
        listDeviceApkFiles('/storage/emulated/0/Download', async (file) => {
            await installFromDevice(file.path);
        });
    }
    
    showProgress(false);
};

// 启动应用管家
function startAhuiApp() {
    // 检查是否有 Tango ADB 客户端
    if (window.adbClient) {
        clear();
        showProgress(true);
        log('开始启动应用管家...\n');
        try {
            // 使用 Tango ADB 执行启动命令
            window.adbClient.subprocess.noneProtocol.spawnWaitText([
                'monkey', '-p', 'com.yunpan.appmanage', '1'
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
        
        let appName = packageName;
        try {
            const dumpResult = await window.adbClient.subprocess.noneProtocol.spawnWaitText(["dumpsys", "package", packageName]);
            const nameMatch = dumpResult.match(/package\s+([^\s@]+)/);
            if (nameMatch) {
                appName = nameMatch[1];
            }
        } catch (e) {}
        
        var tr = document.createElement("tr");
        
        var tdIndex = document.createElement("td");
        tdIndex.textContent = index;
        tr.appendChild(tdIndex);
        
        var tdName = document.createElement("td");
        tdName.textContent = appName;
        tr.appendChild(tdName);
        
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
    
    try {
        const result = await window.adbClient.subprocess.noneProtocol.spawnWaitText([
            'ls', '-la', directory + '/*.apk'
        ]);
        
        const lines = result.trim().split('\n').filter(line => line.endsWith('.apk'));
        const files = lines.map(line => {
            const parts = line.split(/\s+/);
            const filename = parts[parts.length - 1];
            return {
                name: filename,
                path: directory + '/' + filename,
                size: parts[4]
            };
        });
        
        showProgress(false);
        
        if (files.length === 0) {
            alert('未找到APK文件');
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
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;justify-content:center;align-items:center;';
    
    const content = document.createElement('div');
    content.style.cssText = 'background:#fff;border-radius:8px;padding:20px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;';
    
    let html = '<h3 style="margin-top:0;">选择APK文件</h3>';
    html += '<p style="color:#666;">当前目录: ' + currentDir + '</p>';
    html += '<div style="display:flex;gap:10px;margin-wrap:wrap;">';
    html += '<button onclick="listDeviceApkFiles(\'/storage/emulated/0/Download\', window.currentApkSelectCallback)" style="padding:8px 12px;cursor:pointer;">下载</button>';
    html += '<button onclick="listDeviceApkFiles(\'/storage/emulated/0\', window.currentApkSelectCallback)" style="padding:8px 12px;cursor:pointer;">存储</button>';
    html += '</div>';
    html += '<div style="margin-bottom:15px;">';
    html += '<input type="text" id="custom-apk-path" placeholder="输入其他目录路径" style="width:60%;padding:8px;">';
    html += '<button onclick="var path=document.getElementById(\'custom-apk-path\').value;if(path)listDeviceApkFiles(path, window.currentApkSelectCallback)" style="padding:8px 12px;cursor:pointer;">跳转</button>';
    html += '</div>';
    html += '<div id="apk-file-list" style="max-height:300px;overflow-y:auto;border:1px solid #ddd;border-radius:4px;">';
    
    files.forEach((file, index) => {
        html += '<div onclick="window.selectApkFile(' + index + ')" style="padding:10px;cursor:pointer;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px;" onmouseover="this.style.background=#f5f5f5" onmouseout="this.style.background=#fff">';
        html += '<span style="font-size:20px;">📦</span>';
        html += '<div><div style="font-weight:bold;">' + file.name + '</div>';
        html += '<div style="color:#999;font-size:12px;">' + file.path + '</div></div>';
        html += '</div>';
    });
    
    html += '</div>';
    html += '<div style="margin-top:15px;text-align:right;">';
    html += '<button onclick="document.getElementById(\'apk-picker-modal\').remove()" style="padding:8px 16px;cursor:pointer;margin-right:10px;">取消</button>';
    html += '<button id="confirm-apk-btn" onclick="window.confirmApkSelect()" disabled style="padding:8px 16px;cursor:pointer;background:#28a745;color:#fff;border:none;border-radius:4px;">确定</button>';
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
        document.getElementById('confirm-apk-btn').disabled = false;
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
            qxg,
            qzm,
            cdb,
            startAhuiApp,
            loadPackageList,
            loadApkFile,
            installApkFile
        };
    }
} catch (e) {
    // 浏览器环境，不需要导出
}