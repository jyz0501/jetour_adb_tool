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
    let stageColor = '';
    
    if (stage === 'download') {
        stageText = '下载中';
        stageColor = '#3498db';
    } else if (stage === 'install') {
        stageText = '安装中';
        stageColor = '#27ae60';
    }
    
    content.innerHTML = `
        <h3 style="margin-top: 0; color: ${stageColor};">${stageText}</h3>
        <p style="margin: 20px 0;">${message}</p>
        <div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid ${stageColor}; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    `;
    
    blockingModal.appendChild(content);
    document.body.appendChild(blockingModal);
}

function updateBlockingModal(message, stage = 'download') {
    if (!blockingModal) {
        return;
    }
    
    let stageText = '';
    let stageColor = '';
    
    if (stage === 'download') {
        stageText = '下载中';
        stageColor = '#3498db';
    } else if (stage === 'install') {
        stageText = '安装中';
        stageColor = '#27ae60';
    }
    
    const content = blockingModal.querySelector('div');
    if (content) {
        content.innerHTML = `
            <h3 style="margin-top: 0; color: ${stageColor};">${stageText}</h3>
            <p style="margin: 20px 0;">${message}</p>
            <div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid ${stageColor}; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        `;
    }
}

function removeBlockingModal() {
    if (blockingModal) {
        document.body.removeChild(blockingModal);
        blockingModal = null;
    }
}

// 下载并安装应用
async function downloadAndInstall(url, backupUrl, packageName, appName, progressCallback) {
    showBlockingModal(`正在下载${appName}，请稍候...`, 'download');
    
    try {
        // 首先尝试主链接
        let downloadUrl = url;
        let response = await fetch(downloadUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/octet-stream'
            }
        });
        
        // 如果主链接失败，尝试备用链接
        if (!response.ok) {
            log(`${appName}主链接下载失败，尝试备用链接...`);
            downloadUrl = backupUrl;
            response = await fetch(downloadUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/octet-stream'
                }
            });
            
            // 如果备用链接也失败，显示错误信息
            if (!response.ok) {
                log(`错误: ${appName}下载失败，主链接和备用链接都无法访问`);
                alert('安装失败，请检查网络连接或手动下载安装');
                removeBlockingModal();
                return false;
            }
        }
        
        const totalSize = parseInt(response.headers.get('content-length') || '0');
        const reader = response.body.getReader();
        let receivedSize = 0;
        let chunks = [];
        
        // 下载到本地内存
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            receivedSize += value.length;
            chunks.push(value);
            
            // 计算进度
            const progress = totalSize > 0 ? (receivedSize / totalSize) * 100 : 0;
            if (progressCallback) {
                progressCallback(progress);
            }
            
            // 更新弹窗
            updateBlockingModal(`正在下载${appName}，请稍候... ${Math.round(progress)}%`, 'download');
        }
        
        // 合并所有 chunks
        const blob = new Blob(chunks);
        
        // 推送文件到车机
        updateBlockingModal(`正在推送${appName}到车机，请稍候...`, 'install');
        log(`正在推送${appName}到车机...`);
        
        const tempFilePath = '/data/local/tmp/' + appName + '.apk';
        
        // 使用 adb.push 方法推送文件
        try {
            await adb.push(blob, tempFilePath);
            log(`成功: ${appName}推送成功`);
        } catch (pushError) {
            log(`错误: ${appName}推送失败: ${pushError.message}`);
            alert('推送失败，请检查设备连接');
            removeBlockingModal();
            return false;
        }
        
        // 安装应用
        updateBlockingModal(`正在安装${appName}，请稍候...`, 'install');
        log(`开始安装${appName}...`);
        
        const result = await adb.shell(`pm install -r ${tempFilePath}`);
        
        if (result.includes('Success')) {
            log(`成功: ${appName}安装成功`);
            
            // 安装完成后删除安装文件
            await adb.shell(`rm ${tempFilePath}`);
            log(`已删除${appName}安装文件`);
            
            removeBlockingModal();
            alert(`${appName}安装成功！`);
            return true;
        } else {
            log(`错误: ${appName}安装失败: ${result}`);
            alert('安装失败，请检查网络连接或手动下载安装');
            removeBlockingModal();
            return false;
        }
    } catch (error) {
        log(`错误: ${appName}下载失败: ${error.message}`);
        alert('安装失败，请检查网络连接或手动下载安装');
        removeBlockingModal();
        return false;
    }
}

// 安装应用管家
async function installYingyongGuanjia() {
    const url = 'https://file.vju.cc/%E5%BA%94%E7%94%A8%E7%AE%A1%E5%AE%B6/%E5%8E%86%E5%8F%B2%E7%89%88%E6%9C%AC/%E5%BA%94%E7%94%A8%E7%AE%A1%E5%AE%B6v1.8.3%28%E6%AD%A3%E5%BC%8F%E7%89%88%29%E5%85%AC%E7%AD%BE%E7%89%88.apk';
    const backupUrl = 'http://a14472357.328657.xyz/a14472357/应用管家1.8.3.apk';
    await downloadAndInstall(url, backupUrl, 'com.vju.yingyongguanjia', '应用管家');
}

// 安装侧边栏
async function installCebianlan() {
    const url = 'http://a14472357.328657.xyz/a14472357/侧边栏_1.0.apk';
    const backupUrl = 'https://file.vju.cc/%E4%BE%A7%E8%BE%B9%E6%A0%8F/%E4%BE%A7%E8%BE%B9%E6%A0%8F_1.0.apk';
    await downloadAndInstall(url, backupUrl, 'com.example.cebianlan', '侧边栏');
}

// 安装沙发管家
async function installShafaGuanjia() {
    const url = 'http://a14472357.328657.xyz/a14472357/沙发管家4.9.54.apk';
    const backupUrl = 'https://file.vju.cc/%E6%B2%99%E5%8F%8B%E7%AE%A1%E5%AE%B6/%E6%B2%99%E5%8F%8B%E7%AE%A1%E5%AE%B64.9.54.apk';
    await downloadAndInstall(url, backupUrl, 'com.muzhiwan', '沙发管家');
}

// 安装布丁UI
async function installBudingUI() {
    const url = 'https://file.vju.cc/%E5%B8%83%E4%B8%81UI%E6%A1%8C%E9%9D%A2/%E5%B8%83%E4%B8%81UI_2.2.3.apk';
    const backupUrl = 'http://a14472357.328657.xyz/a14472357/布丁UI_2.2.3.apk';
    await downloadAndInstall(url, backupUrl, 'com.buding.ui', '布丁UI');
}

// 安装哨兵监控
async function installShaobing() {
    const url = 'http://a14472357.328657.xyz/a14472357/哨兵监控v1.1.8.apk';
    const backupUrl = '';
    await downloadAndInstall(url, backupUrl, 'com.shaobing.monitor', '哨兵监控');
}

// 安装小横条
async function installXiaohengtiao() {
    const url = 'http://a14472357.328657.xyz/a14472357/Gesture_1.6.4.apk';
    const backupUrl = 'http://a14472357.a.328657.xyz/a14472357/小横条_2.0.0.apk';
    await downloadAndInstall(url, backupUrl, 'com.gesture', '小横条');
}

// 启动应用
async function startApp(packageName, activityName, appName) {
    try {
        log(`正在启动${appName}...`);
        const result = await adb.shell(`am start -n ${packageName}/${activityName}`);
        if (result.includes('Starting')) {
            log(`成功: ${appName}启动成功`);
        } else {
            log(`错误: ${appName}启动失败: ${result}`);
        }
    } catch (error) {
        log(`错误: ${appName}启动失败: ${error.message}`);
    }
}

// 启动应用管家
async function startYingyongGuanjia() {
    await startApp('com.vju.yingyongguanjia', 'com.vju.yingyongguanjia.MainActivity', '应用管家');
}

// 启动侧边栏
async function startCebianlan() {
    await startApp('com.example.cebianlan', 'com.example.cebianlan.MainActivity', '侧边栏');
}

// 启动沙发管家
async function startShafaGuanjia() {
    await startApp('com.muzhiwan', 'com.muzhiwan.MainActivity', '沙发管家');
}

// 本地下载
function downloadToLocal(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 下载蓝牙遥控
function downloadLanyaYaokong() {
    const url = 'http://a14472357.328657.xyz/a14472357/蓝牙遥控2.0.9.apk';
    downloadToLocal(url, '蓝牙遥控2.0.9.apk');
}

// 下载蓝牙遥控（备用）
function downloadLanyaYaokongBackup() {
    const url = 'http://a14472357.a.328657.xyz/a14472357/蓝牙遥控2.0.9.apk';
    downloadToLocal(url, '蓝牙遥控2.0.9.apk');
}