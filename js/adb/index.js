// ADB 主入口
// 参考 Tango ADB 的架构设计

class Adb {
    /**
     * 静态方法：打开 ADB 连接
     * @param {string} transportType - 传输类型
     * @returns {Promise<AdbDevice>}
     */
    static async open(transportType) {
        let transport;

        switch (transportType) {
            case 'WebUSB':
                transport = await WebUsbTransport.requestDevice();
                await transport.open();
                break;
            default:
                throw new Error('Unsupported transport type: ' + transportType);
        }

        const device = new AdbDevice(transport);
        return device;
    }
}

// 导出 ADB 类
try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Adb;
    }
} catch (e) {
    // 浏览器环境
    window.Adb = Adb;
}
