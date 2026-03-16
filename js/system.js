// 系统工具相关功能

// 解除网络防火墙
let jcwlxz = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    if (!window.adbClient) {
        alert('未连接到设备，请先点击"开始连接"按钮连接设备');
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
    if (!window.adbClient) {
        alert('未连接到设备，请先点击"开始连接"按钮连接设备');
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
            jcwlxz,
            jcazxz
        };
    }
} catch (e) {
    // 浏览器环境，不需要导出
}