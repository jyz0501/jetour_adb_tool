// 系统工具相关功能

// 检查浏览器支持
function checkBrowserSupport() {
    const isSupported = checkWebUSBSupport();
    if (!isSupported || !navigator.usb) {
        alert('检测到您的浏览器不支持，请根据顶部的 "警告提示" 更换指定浏览器使用。');
        return false;
    }
    return true;
}

// 开关无线ADB
let wifiAdb = async (enable) => {
    if (!checkBrowserSupport()) {
        return;
    }
    if (!window.adbDevice) {
        alert("未连接到设备");
        return;
    }
    // 弹出确认对话框
    const confirmed = confirm("是否开启无线端口？");
    if (!confirmed) {
        return; // 用户点击了取消，则不执行操作
    }
    let port = document.getElementById('tcpip').value;
    if (!enable) {
        port = -1;
    }
    if (!port) {
        alert("需要填写端口号");
        return;
    }
    clear();
    showProgress(true);
    try {
        const tcpipStream = await window.adbDevice.tcpip(port);
        await tcpipStream.close();
        log('tcpip at ' + port);
        alert('无线ADB已开启，端口号: ' + port);
    } catch (error) {
        log(error);
        alert("端口开启失败，请断开重新尝试。");
    }
    showProgress(false);
};

// 激活大伦车机助手
let jhyygj = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    if (!window.adbDevice) {
        alert("未连接到设备");
        return;
    }
    let shellForceStop = "am force-stop com.ahcjzs";
    let port = 5555;
    clear();
    showProgress(true);
    try {
        // 先停止指定应用
        await exec_shell(shellForceStop);
        const tcpipStream = await window.adbDevice.tcpip(port);
        await tcpipStream.close();
        log('tcpip at ' + port);
        alert("激活成功");
    } catch (error) {
        log(error);
        alert("激活失败，请断开重新尝试。");
    }
    showProgress(false);
};

// 解除网络防火墙
let jcwlxz = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    if (!window.adbDevice) {
        alert("未连接到设备");
        return;
    }

    //依次执行的 7 条命令
    let shellCommands = [
        "sh",           // 启动 shell
        "su",           // 请求超级用户 (root) 权限
        "iptables -F",  // 清除 INPUT, OUTPUT, FORWARD 链的规则
        "iptables -t nat -F", // 清除 nat 表的所有链规则
        "iptables -P INPUT ACCEPT",  // 设置 INPUT 链默认策略为 ACCEPT
        "iptables -P OUTPUT ACCEPT", // 设置 OUTPUT 链默认策略为 ACCEPT
        "iptables -P FORWARD ACCEPT" // 设置 FORWARD 链默认策略为 ACCEPT
    ];
    clear();
    showProgress(true);

    try {
        //依次执行每一条命令
        for (let i = 0; i < shellCommands.length; i++) {
            const command = shellCommands[i];
            log(`执行命令 [${i+1}/${shellCommands.length}]: ${command}`);
            await exec_shell(command);
            // 可选：添加短暂延迟
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        alert("网络重置成功");
    } catch (error) {
        log("操作失败: " + error);
        alert("操作失败，请检查设备是否已root，并断开重新尝试。");
    }
    showProgress(false);
};

// 解除安装限制
let jcazxz = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    if (!window.adbDevice) {
        alert("未连接到设备");
        return;
    }
    let shellCommands = [
        "sh", // 启动 shell
        "su", // 请求超级用户 (root) 权限
        "setprop persist.sys.installed_enable true" // 设置系统属性
    ];
    clear();
    showProgress(true);
    try {
        // 依次执行每一条命令
        for (let i = 0; i < shellCommands.length; i++) {
            const command = shellCommands[i];
            log(`执行命令 [${i+1}/${shellCommands.length}]: ${command}`);
            await exec_shell(command);
            // 保留原有的短暂延迟
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        alert("系统属性设置成功");
    } catch (error) {
        log("操作失败: " + error);
        alert("操作失败，请检查设备是否已root，并断开重新尝试。");
    }
    showProgress(false);
};

// 导出函数
try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            wifiAdb,
            jhyygj,
            jcwlxz,
            jcazxz
        };
    }
} catch (e) {
    // 浏览器环境，不需要导出
}