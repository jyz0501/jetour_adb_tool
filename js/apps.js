// 应用安装相关功能

// 检查浏览器支持
function checkBrowserSupport() {
    const isSupported = checkWebUSBSupport();
    if (!isSupported || !navigator.usb) {
        alert('检测到您的浏览器不支持，请根据顶部的 "警告提示" 更换指定浏览器使用。');
        return false;
    }
    return true;
}

// 一键安装应用 - 虚拟返回键
let xnfhj = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    if (!window.adbDevice) {
        alert("未连接到设备");
        return;
    }
    clear();
    let toast = document.getElementById('downloading-toast');
    toast.style.opacity = '1';
    toast.style.display = 'block';
    try {
        let downUrl = "https://gjx.ahcjzs.com/apk/xnfhj.apk";
        let fileBlob = await fetchWithProgress(downUrl, (progressEvent) => {
            const percentComplete = ((progressEvent.loaded / progressEvent.total) * 100).toFixed(2);
            updateDownloadProgressText(percentComplete);
        });
        if (!fileBlob) throw new Error('下载失败！！！');
        let filePath = "/data/local/tmp/xnfhj.apk";
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);
        await push(filePath, fileBlob);
        log('正在安装 虚拟返回键 ...');
        let installOutput = await execShellAndGetOutput("pm install -g -r " + filePath);
        if (installOutput.includes('Success')) {
            log('安装成功！');
            alert("安装成功！");
        } else {
            throw new Error('安装失败');
        }
    } catch (error) {
        log('安装失败！！！');
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);
        alert("安装失败！！！");
    }
};

// 一键安装应用 - 一键清理
let yjql = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    if (!window.adbDevice) {
        alert("未连接到设备");
        return;
    }
    clear();
    let toast = document.getElementById('downloading-toast');
    toast.style.opacity = '1';
    toast.style.display = 'block';
    try {
        let downUrl = "https://gjx.ahcjzs.com/apk/yjqldzb.apk";
        let fileBlob = await fetchWithProgress(downUrl, (progressEvent) => {
            const percentComplete = ((progressEvent.loaded / progressEvent.total) * 100).toFixed(2);
            updateDownloadProgressText(percentComplete);
        });
        if (!fileBlob) throw new Error('下载失败！！！');
        let filePath = "/data/local/tmp/yjqldzb.apk";
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);
        await push(filePath, fileBlob);
        log('正在安装 一键清理_定制版 ...');
        let installOutput = await execShellAndGetOutput("pm install -g -r " + filePath);
        if (installOutput.includes('Success')) {
            log('安装成功！');
            alert("安装成功！");
        } else {
            log('定制版安装失败！即将安装通用版 ...');
            toast.style.opacity = '1';
            toast.style.display = 'block';
            updateDownloadProgressText('0.00');
            downUrl = "https://gjx.ahcjzs.com/apk/yjql.apk";
            fileBlob = await fetchWithProgress(downUrl, (progressEvent) => {
                const percentComplete = ((progressEvent.loaded / progressEvent.total) * 100).toFixed(2);
                updateDownloadProgressText(percentComplete);
            });
            if (!fileBlob) throw new Error('下载失败！！！');
            filePath = "/data/local/tmp/yjql.apk";
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.style.display = 'none';
            }, 500);
            await push(filePath, fileBlob);
            log('正在安装 一键清理_通用版 ...');
            installOutput = await execShellAndGetOutput("pm install -g -r " + filePath);
            if (installOutput.includes('Success')) {
                log('安装成功！');
                alert("安装成功！");
            } else {
                log('一键清理_两个版本均安装失败！');
                toast.style.opacity = '0';
                setTimeout(() => {
                    toast.style.display = 'none';
                }, 500);
                alert("一键清理_两个版本均安装失败！");
            }
        }
    } catch (error) {
        log('安装失败！！！');
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);
        alert("安装失败！！！");
    }
};

// 一键安装应用 - 沙发管家HD
let sfgj = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    if (!window.adbDevice) {
        alert("未连接到设备");
        return;
    }
    clear();
    let toast = document.getElementById('downloading-toast');
    toast.style.opacity = '1';
    toast.style.display = 'block';
    try {
        // 使用本地APK文件
        let response = await fetch('apk/沙发管家4.9.54.apk');
        let fileBlob = await response.blob();
        if (!fileBlob) throw new Error('读取文件失败！！！');
        
        let filePath = "/data/local/tmp/sfgj.apk";
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);
        await push(filePath, fileBlob);
        log('正在安装 沙发管家HD ...');
        let installOutput = await execShellAndGetOutput("pm install -g -r " + filePath);
        if (installOutput.includes('Success')) {
            log('安装成功！');
            alert("安装成功！");
        } else {
            throw new Error('安装失败');
        }
    } catch (error) {
        log('安装失败！！！');
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);
        alert("安装失败！！！");
    }
};

// 一键安装应用 - 大伦应用管家
let yygj = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    clear();
    let toast = document.getElementById('downloading-toast');
    toast.style.opacity = '1';
    toast.style.display = 'block';
    try {
        // 使用本地APK文件
        let response = await fetch('apk/应用管家1.8.3.apk');
        let fileBlob = await response.blob();
        if (!(fileBlob instanceof Blob)) throw new Error('读取文件失败！！！');
        let filePath = "/data/local/tmp/ahyygj.apk";
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);
        await exec_shell("setprop persist.sv.enable_adb_install 1");
        await push(filePath, fileBlob);
        log('正在安装 大伦应用管家 ...');
        let installOutput = await execShellAndGetOutput("pm install -g -r " + filePath);
        if (installOutput.includes('Success')) {
            log('安装成功！');
            // 暂时注释掉tcpip功能，因为新的adbDevice可能还没有实现这个方法
            // await adbDevice.tcpip(5555);
            // log('无线ADB已激活，端口号: 5555');
            alert("安装成功！");
        } else {
            log('安装失败！');
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.style.display = 'none';
            }, 500);
            alert("安装失败！");
        }
    } catch (error) {
        log('安装失败！！！');
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);
        alert("安装失败！！！");
    }
};

// 一键安装应用 - 权限狗
let qxg = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    if (!window.adbDevice) {
        alert("未连接到设备");
        return;
    }
    clear();
    let toast = document.getElementById('downloading-toast');
    toast.style.opacity = '1';
    toast.style.display = 'block';
    try {
        let downUrl = "https://gjx.ahcjzs.com/apk/qxg.apk";
        let fileBlob = await fetchWithProgress(downUrl, (progressEvent) => {
            const percentComplete = ((progressEvent.loaded / progressEvent.total) * 100).toFixed(2);
            updateDownloadProgressText(percentComplete);
        });
        if (!fileBlob) throw new Error('下载失败！！！');
        let filePath = "/data/local/tmp/qxg.apk";
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);
        await push(filePath, fileBlob);
        log('正在安装 权限狗 ...');
        let installOutput = await execShellAndGetOutput("pm install -g -r " + filePath);
        if (installOutput.includes('Success')) {
            log('安装成功！');
            alert("安装成功！");
        } else {
            throw new Error('安装失败');
        }
    } catch (error) {
        log('安装失败！！！');
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);
        alert("安装失败！！！");
    }
};

// 一键安装应用 - 无障碍管理器
let wzagl = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    if (!window.adbDevice) {
        alert("未连接到设备");
        return;
    }
    clear();
    let toast = document.getElementById('downloading-toast');
    toast.style.opacity = '1';
    toast.style.display = 'block';
    try {
        let downUrl = "https://gjx.ahcjzs.com/apk/wzagl.apk";
        let fileBlob = await fetchWithProgress(downUrl, (progressEvent) => {
            const percentComplete = ((progressEvent.loaded / progressEvent.total) * 100).toFixed(2);
            updateDownloadProgressText(percentComplete);
        });
        if (!fileBlob) throw new Error('下载失败！！！');
        let filePath = "/data/local/tmp/wzagl.apk";
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);
        await push(filePath, fileBlob);
        log('正在安装 无障碍管理器 ...');
        let installOutput = await execShellAndGetOutput("pm install -g -r " + filePath);
        if (installOutput.includes('Success')) {
            log('安装成功！');
            alert("安装成功！");
        } else {
            throw new Error('安装失败');
        }
    } catch (error) {
        log('安装失败！！！');
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);
        alert("安装失败！！！");
    }
};

// 一键安装应用 - 返回菜单键
let fhcdj = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    if (!window.adbDevice) {
        alert("未连接到设备");
        return;
    }
    clear();
    let toast = document.getElementById('downloading-toast');
    toast.style.opacity = '1';
    toast.style.display = 'block';
    try {
        let downUrl = "https://gjx.ahcjzs.com/apk/fhcdj.apk";
        let fileBlob = await fetchWithProgress(downUrl, (progressEvent) => {
            const percentComplete = ((progressEvent.loaded / progressEvent.total) * 100).toFixed(2);
            updateDownloadProgressText(percentComplete);
        });
        if (!fileBlob) throw new Error('下载失败！！！');
        let filePath = "/data/local/tmp/fhcdj.apk";
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);
        await push(filePath, fileBlob);
        log('正在安装 返回菜单键 ...');
        let installOutput = await execShellAndGetOutput("pm install -g -r " + filePath);
        if (installOutput.includes('Success')) {
            log('安装成功！');
            alert("安装成功！");
        } else {
            throw new Error('安装失败');
        }
    } catch (error) {
        log('安装失败！！！');
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);
        alert("安装失败！！！");
    }
};

// 一键安装应用 - 氢桌面
let qzm = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    if (!window.adbDevice) {
        alert("未连接到设备");
        return;
    }
    clear();
    let toast = document.getElementById('downloading-toast');
    toast.style.opacity = '1';
    toast.style.display = 'block';
    try {
        // 使用本地APK文件
        let response = await fetch('apk/氢桌面.apk');
        let fileBlob = await response.blob();
        if (!fileBlob) throw new Error('读取文件失败！！！');
        let filePath = "/data/local/tmp/qzm.apk";
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);
        await push(filePath, fileBlob);
        log('正在安装 氢桌面 ...');
        let installOutput = await execShellAndGetOutput("pm install -g -r " + filePath);
        if (installOutput.includes('Success')) {
            log('安装成功！');
            alert("安装成功！");
        } else {
            throw new Error('安装失败');
        }
    } catch (error) {
        log('安装失败！！！');
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);
        alert("安装失败！！！");
    }
};

// 一键安装应用 - 侧边栏
let cdb = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    clear();
    let toast = document.getElementById('downloading-toast');
    toast.style.opacity = '1';
    toast.style.display = 'block';
    try {
        // 使用本地APK文件
        let response = await fetch('apk/侧边栏1.0.apk');
        let fileBlob = await response.blob();
        if (!fileBlob) throw new Error('读取文件失败！！！');
        let filePath = "/data/local/tmp/cdb.apk";
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);
        await push(filePath, fileBlob);
        log('正在安装 侧边栏 ...');
        let installOutput = await execShellAndGetOutput("pm install -g -r " + filePath);
        if (installOutput.includes('Success')) {
            log('安装成功！');
            alert("安装成功！");
        } else {
            throw new Error('安装失败');
        }
    } catch (error) {
        log('安装失败！！！');
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500);
        alert("安装失败！！！");
    }
};

// 启动阿辉应用管家
function startAhuiApp() {
    if (!window.adbDevice) {
        alert("未连接到设备");
        return;
    }
    exec_shell('pm list packages | grep com.ahcjzsdzb && am start -n com.ahcjzsdzb/com.yunpan.appmanage.ui.HomeActivity || ' +
               'pm list packages | grep com.ahcjzs && am start -n com.ahcjzs/com.yunpan.appmanage.ui.HomeActivity');
}

// 刷新应用列表
let loadPackageList = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    if (!window.adbDevice) {
        alert("未连接到设备");
        return;
    }
    // 弹出确认对话框
    const confirmed = confirm("是否查看应用列表？");
    if (!confirmed) {
        return; // 用户点击了取消，不执行操作
    }
    clear();
    showProgress(true);
    var packageContent = "";
    try {
        let shell = await window.adbDevice.shell("pm list packages -3"); // 显示第三方应用
        let r = await shell.receive();
        while (r.data != null) {
            let decoder = new TextDecoder('utf-8');
            packageContent += decoder.decode(r.data);
            r = await shell.receive();
        }
        await shell.close();
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
    if (!window.adbDevice) {
        alert("未连接到设备");
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
            const remotePath = `/data/local/tmp/upload_${Date.now()}_${i}.apk`;
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
    } catch (error) {
        console.error("批量安装出错:", error);
        log("❌ 批量安装过程中发生错误，请查看控制台。");
        alert("安装过程中出错，请查看日志。");
    } finally {
        showProgress(false);
    }
};

// 导出函数
try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            xnfhj,
            yjql,
            sfgj,
            yygj,
            qxg,
            wzagl,
            fhcdj,
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