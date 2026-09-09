


let jcwlxz = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    if (!window.adbClient) {
        alert('未连接到设备，请先点击"开始连接"按钮连接设备');
        return;
    }

    
    let shellCommands = [
        "sh",           
        "su",           
        "iptables -F",  
        "iptables -t nat -F", 
        "iptables -P INPUT ACCEPT",  
        "iptables -P OUTPUT ACCEPT", 
        "iptables -P FORWARD ACCEPT" 
    ];
    clear();
    showProgress(true);

    try {
        
        for (let i = 0; i < shellCommands.length; i++) {
            const command = shellCommands[i];
            log(`执行命令 [${i+1}/${shellCommands.length}]: ${command}`);
            await exec_shell(command);
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        alert("网络重置成功");
    } catch (error) {
        log("操作失败: " + error);
        alert("操作失败，请检查设备是否已root，并断开重新尝试。");
    }
    showProgress(false);
};


let jcazxz = async () => {
    if (!checkBrowserSupport()) {
        return;
    }
    if (!window.adbClient) {
        alert('未连接到设备，请先点击"开始连接"按钮连接设备');
        return;
    }
    let shellCommands = [
        "sh", 
        "su", 
        "setprop persist.sys.installed_enable true" 
    ];
    clear();
    showProgress(true);
    try {
        
        for (let i = 0; i < shellCommands.length; i++) {
            const command = shellCommands[i];
            log(`执行命令 [${i+1}/${shellCommands.length}]: ${command}`);
            await exec_shell(command);
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        alert("系统属性设置成功");
    } catch (error) {
        log("操作失败: " + error);
        alert("操作失败，请检查设备是否已root，并断开重新尝试。");
    }
    showProgress(false);
};


try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            jcwlxz,
            jcazxz
        };
    }
} catch (e) {
    
}