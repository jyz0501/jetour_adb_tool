// ADB 传输层抽象
// 参考 Tango ADB 的架构设计

class AdbTransport {
    /**
     * 打开传输连接
     */
    async open() {
        throw new Error('open() must be implemented');
    }

    /**
     * 关闭传输连接
     */
    async close() {
        throw new Error('close() must be implemented');
    }

    /**
     * 发送数据
     * @param {ArrayBuffer} data - 要发送的数据
     */
    async send(data) {
        throw new Error('send() must be implemented');
    }

    /**
     * 接收数据
     * @param {number} length - 要接收的数据长度
     * @returns {ArrayBuffer} 接收到的数据
     */
    async receive(length) {
        throw new Error('receive() must be implemented');
    }

    /**
     * 重置传输
     */
    async reset() {
        throw new Error('reset() must be implemented');
    }
}

// WebUSB 传输实现
class WebUsbTransport extends AdbTransport {
    constructor(device) {
        super();
        this.device = device;
        this.epIn = null;
        this.epOut = null;
        this._interfaceNumber = null;
    }

    /**
     * 静态方法：请求 WebUSB 设备
     */
    static async requestDevice() {
        const filters = [
            { classCode: 255, subclassCode: 66, protocolCode: 1 }, // ADB
            { classCode: 255, subclassCode: 66, protocolCode: 3 }  // Fastboot
        ];

        try {
            const device = await navigator.usb.requestDevice({ filters });
            return new WebUsbTransport(device);
        } catch (error) {
            if (error.name === 'NotFoundError') {
                throw new Error('No device selected');
            }
            throw error;
        }
    }

    async open() {
        if (!this.device) {
            throw new Error('No device');
        }

        try {
            // 打开设备
            console.log('Opening USB device...');
            await this.device.open();
            console.log('USB device opened');
            
            // 选择配置
            if (this.device.configuration === null) {
                console.log('Selecting configuration 1...');
                await this.device.selectConfiguration(1);
            }

            // 找到 ADB 接口
            console.log('Looking for ADB interface...');
            const match = this._findAdbInterface();
            if (!match) {
                console.error('ADB interface not found. Available interfaces:');
                for (const config of this.device.configurations) {
                    for (const iface of config.interfaces) {
                        console.error(`  Interface ${iface.interfaceNumber}: class ${iface.interfaceClass}, subclass ${iface.interfaceSubclass}, protocol ${iface.interfaceProtocol}`);
                    }
                }
                throw new Error('ADB interface not found');
            }
            console.log('Found ADB interface:', match);

            // 声明接口
            console.log('Claiming interface...');
            try {
                await this.device.claimInterface(match.interfaceNumber);
                this._interfaceNumber = match.interfaceNumber;
            } catch (claimError) {
                console.error('Failed to claim interface:', claimError);
                if (claimError.message && claimError.message.includes('Unable to claim interface')) {
                    console.error('Interface is likely in use by another application (e.g., adb server, Android Studio)');
                    console.error('Please close other USB debugging applications and run "adb kill-server" in terminal');
                }
                throw claimError;
            }

            // 选择备用接口
            await this.device.selectAlternateInterface(match.interfaceNumber, match.alternateSetting);

            // 获取端点
            this.epIn = this._getEndpoint(match.endpoints, 'in');
            this.epOut = this._getEndpoint(match.endpoints, 'out');

            if (!this.epIn || !this.epOut) {
                throw new Error('ADB endpoints not found');
            }

            console.log('WebUSB transport opened successfully. Endpoints:', this.epIn, this.epOut);
        } catch (error) {
            console.error('Error opening WebUSB transport:', error);
            throw error;
        }
    }

    async close() {
        if (this.device) {
            try {
                await this.device.close();
                console.log('WebUSB transport closed');
            } catch (error) {
                console.error('Error closing WebUSB transport:', error);
            }
        }
    }

    async send(data) {
        if (!this.epOut) {
            throw new Error('Transport not initialized');
        }

        try {
            console.log('Sending data, endpoint:', this.epOut, 'length:', data.byteLength);
            const result = await this.device.transferOut(this.epOut, data);
            console.log('Send result:', result);
        } catch (error) {
            console.error('Error sending data:', error);
            console.error('Endpoint out:', this.epOut);
            console.error('Device state:', this.device.opened, this.device.configuration);
            
            // 尝试重新打开设备
            if (!this.device.opened) {
                console.log('Device not opened, trying to reopen...');
                try {
                    await this.device.open();
                    await this.device.claimInterface(this._interfaceNumber);
                } catch (reopenError) {
                    console.error('Failed to reopen device:', reopenError);
                }
            }
            throw error;
        }
    }

    async receive(length) {
        if (!this.epIn) {
            throw new Error('Transport not initialized');
        }

        try {
            const result = await this.device.transferIn(this.epIn, length);
            return result.data.buffer;
        } catch (error) {
            console.error('Error receiving data:', error);
            throw error;
        }
    }

    async reset() {
        if (this.device) {
            try {
                await this.device.reset();
                console.log('Device reset');
            } catch (error) {
                console.error('Error resetting device:', error);
            }
        }
    }

    // 私有方法：查找 ADB 接口
    _findAdbInterface() {
        // 首先尝试查找标准 ADB 接口 (class 255, subclass 66, protocol 1)
        for (const configuration of this.device.configurations) {
            for (const iface of configuration.interfaces) {
                for (const alternate of iface.alternates) {
                    console.log(`Interface ${iface.interfaceNumber}: class=${alternate.interfaceClass}, subclass=${alternate.interfaceSubclass}, protocol=${alternate.interfaceProtocol}`);
                    if (alternate.interfaceClass === 255 &&
                        alternate.interfaceSubclass === 66 &&
                        alternate.interfaceProtocol === 1) {
                        console.log('Found standard ADB interface');
                        return {
                            interfaceNumber: iface.interfaceNumber,
                            alternateSetting: alternate.alternateSetting,
                            endpoints: alternate.endpoints
                        };
                    }
                }
            }
        }
        
        // 备用：尝试查找批量传输接口
        console.log('Standard ADB interface not found, trying bulk transfer interfaces...');
        for (const configuration of this.device.configurations) {
            for (const iface of configuration.interfaces) {
                for (const alternate of iface.alternates) {
                    // 查找有批量端点的接口
                    const hasBulkIn = alternate.endpoints.some(e => e.type === 'bulk' && e.direction === 'in');
                    const hasBulkOut = alternate.endpoints.some(e => e.type === 'bulk' && e.direction === 'out');
                    
                    if (hasBulkIn && hasBulkOut) {
                        console.log('Found bulk transfer interface as fallback');
                        return {
                            interfaceNumber: iface.interfaceNumber,
                            alternateSetting: alternate.alternateSetting,
                            endpoints: alternate.endpoints
                        };
                    }
                }
            }
        }
        
        return null;
    }

    // 私有方法：获取端点
    _getEndpoint(endpoints, direction) {
        for (const endpoint of endpoints) {
            if (endpoint.direction === direction) {
                return endpoint.endpointNumber;
            }
        }
        return null;
    }
}

// TCP 传输实现（用于无线调试）
// 注意：浏览器不支持直接TCP连接
// 此类仅保留用于兼容性，实际使用中通过USB连接设备后，使用 AdbDevice.tcpip() 开启无线调试端口
// 开启后的端口可供其他工具（如命令行 adb）使用，但浏览器无法直接连接
class TcpTransport extends AdbTransport {
    constructor(host, port) {
        super();
        this.host = host;
        this.port = port;
    }

    async open() {
        // 浏览器无法直接建立TCP连接
        throw new Error('浏览器不支持直接TCP连接。\n\n如需使用无线ADB：\n1. 先使用USB连接设备\n2. 通过"有线连接"连接设备\n3. 使用系统工具中的"无线ADB"功能开启端口\n4. 之后可使用命令行 adb connect <IP>:5555 连接');
    }

    async close() {
        if (this.writer) {
            try {
                await this.writer.close();
            } catch (error) {
                console.error('Error closing writer:', error);
            }
        }
        if (this.reader) {
            try {
                await this.reader.cancel();
            } catch (error) {
                console.error('Error canceling reader:', error);
            }
        }
        if (this.ws) {
            this.ws.close();
        }
        console.log('TCP transport closed');
    }

    async send(data) {
        if (!this.writer) {
            throw new Error('Transport not initialized');
        }

        try {
            await this.writer.write(data);
        } catch (error) {
            console.error('Error sending data:', error);
            throw error;
        }
    }

    async receive(length) {
        if (!this.reader) {
            throw new Error('Transport not initialized');
        }

        try {
            const { value, done } = await this.reader.read();
            if (done) {
                throw new Error('Connection closed');
            }
            return value.buffer;
        } catch (error) {
            console.error('Error receiving data:', error);
            throw error;
        }
    }

    async reset() {
        // TCP 传输重置
        await this.close();
        await this.open();
    }
}

// 导出传输类
try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            AdbTransport,
            WebUsbTransport,
            TcpTransport
        };
    }
} catch (e) {
    // 浏览器环境
    window.AdbTransport = AdbTransport;
    window.WebUsbTransport = WebUsbTransport;
    window.TcpTransport = TcpTransport;
}
