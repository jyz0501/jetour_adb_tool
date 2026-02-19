// ADB 设备类
// 参考 Tango ADB 的设备管理设计

class AdbDevice {
    /**
     * 创建 ADB 设备
     * @param {AdbTransport} transport - 传输对象
     */
    constructor(transport) {
        this.transport = transport;
        this.maxPayload = 4096;
        this.banner = '';
        this.mode = '';
        this.connected = false;
    }

    /**
     * 连接到设备
     * @param {string} banner - 连接横幅
     * @param {Function} authCallback - 认证回调
     * @returns {Promise<AdbDevice>}
     */
    async connect(banner = 'host::web', authCallback = null) {
        try {
            // 发送连接消息
            const message = new AdbMessage('CNXN', 0x01000000, this.maxPayload, banner);
            await message.send(this.transport);

            // 处理响应
            let response = await AdbMessage.receive(this.transport);

            // 处理认证
            while (response.cmd === 'AUTH') {
                if (authCallback) {
                    authCallback(response.arg0, response.data);
                }
                // 认证类型：
                // 1 = 令牌认证
                // 2 = RSA 公钥认证
                if (response.arg0 === 1) {
                    // 令牌认证
                    log('Token authentication required');
                    // 这里需要实现令牌认证逻辑
                    throw new Error('Token authentication required');
                } else if (response.arg0 === 2) {
                    // RSA 公钥认证
                    log('RSA public key authentication required');
                    // 这里需要实现 RSA 公钥认证逻辑
                    throw new Error('RSA public key authentication required');
                } else {
                    throw new Error('Unknown authentication type: ' + response.arg0);
                }
            }

            if (response.cmd !== 'CNXN') {
                throw new Error('Failed to connect: ' + response.cmd);
            }

            // 解析响应
            this.maxPayload = response.arg1;
            if (response.data) {
                const decoder = new TextDecoder('utf-8');
                this.banner = decoder.decode(response.data);
                const parts = this.banner.split(':');
                this.mode = parts[0];
            }

            this.connected = true;
            console.log('ADB device connected successfully:', this.banner);
            return this;

        } catch (error) {
            console.error('Error connecting to ADB device:', error);
            throw error;
        }
    }

    /**
     * 断开连接
     */
    async disconnect() {
        try {
            if (this.connected) {
                await this.transport.close();
                this.connected = false;
                console.log('ADB device disconnected');
            }
        } catch (error) {
            console.error('Error disconnecting from ADB device:', error);
        }
    }

    /**
     * 打开服务流
     * @param {string} service - 服务名称
     * @returns {Promise<AdbStream>}
     */
    async open(service) {
        return AdbStream.open(this, service);
    }

    /**
     * 执行 shell 命令
     * @param {string} command - 命令
     * @returns {Promise<AdbStream>}
     */
    async shell(command) {
        return this.open('shell:' + command);
    }

    /**
     * 开启 TCP/IP
     * @param {number} port - 端口
     * @returns {Promise<AdbStream>}
     */
    async tcpip(port) {
        return this.open('tcpip:' + port);
    }

    /**
     * 同步操作
     * @returns {Promise<AdbStream>}
     */
    async sync() {
        return this.open('sync:');
    }

    /**
     * 重启设备
     * @param {string} command - 重启命令
     * @returns {Promise<AdbStream>}
     */
    async reboot(command = '') {
        return this.open('reboot:' + command);
    }

    /**
     * 安装应用
     * @param {string} apkPath - APK 文件路径
     * @param {boolean} reinstall - 是否重新安装
     * @param {boolean} grantPermissions - 是否自动授予权限
     * @returns {Promise<AdbStream>}
     */
    async install(apkPath, reinstall = false, grantPermissions = false) {
        let command = 'install';
        if (reinstall) {
            command += ' -r';
        }
        if (grantPermissions) {
            command += ' -g';
        }
        return this.shell(`${command} ${apkPath}`);
    }

    /**
     * 卸载应用
     * @param {string} packageName - 包名
     * @param {boolean} keepData - 是否保留数据
     * @returns {Promise<AdbStream>}
     */
    async uninstall(packageName, keepData = false) {
        let command = 'uninstall';
        if (keepData) {
            command += ' -k';
        }
        return this.shell(`${command} ${packageName}`);
    }

    /**
     * 启动 Activity
     * @param {string} component - 组件名 (包名/类名)
     * @param {string} action - 动作
     * @param {string} data - 数据 URI
     * @returns {Promise<AdbStream>}
     */
    async startActivity(component, action = '', data = '') {
        let command = 'am start';
        if (action) {
            command += ` -a ${action}`;
        }
        if (data) {
            command += ` -d ${data}`;
        }
        command += ` ${component}`;
        return this.shell(command);
    }

    /**
     * 停止应用
     * @param {string} packageName - 包名
     * @returns {Promise<AdbStream>}
     */
    async forceStop(packageName) {
        return this.shell(`am force-stop ${packageName}`);
    }

    /**
     * 列出已安装的应用
     * @param {boolean} system - 是否包含系统应用
     * @returns {Promise<AdbStream>}
     */
    async listPackages(system = false) {
        let command = 'pm list packages';
        if (!system) {
            command += ' -3';
        }
        return this.shell(command);
    }

    /**
     * 推送文件
     * @param {string} remotePath - 远程路径
     * @param {ArrayBuffer} data - 文件数据
     * @param {number} mode - 文件模式
     * @returns {Promise}
     */
    async push(remotePath, data, mode = 0o644) {
        const sync = await this.sync();
        try {
            // 实现推送逻辑
            // 这里需要实现完整的 sync 协议
            throw new Error('Push not implemented yet');
        } finally {
            await sync.close();
        }
    }

    /**
     * 拉取文件
     * @param {string} remotePath - 远程路径
     * @returns {Promise<ArrayBuffer>}
     */
    async pull(remotePath) {
        const sync = await this.sync();
        try {
            // 实现拉取逻辑
            // 这里需要实现完整的 sync 协议
            throw new Error('Pull not implemented yet');
        } finally {
            await sync.close();
        }
    }
}

// ADB 流类
class AdbStream {
    /**
     * 创建 ADB 流
     * @param {AdbDevice} device - 设备
     * @param {number} localId - 本地 ID
     * @param {number} remoteId - 远程 ID
     */
    constructor(device, localId, remoteId) {
        this.device = device;
        this.localId = localId;
        this.remoteId = remoteId;
        this.closed = false;
    }

    /**
     * 打开流
     * @param {AdbDevice} device - 设备
     * @param {string} service - 服务名称
     * @returns {Promise<AdbStream>}
     */
    static async open(device, service) {
        const localId = AdbStream.nextId++;
        let remoteId = 0;

        const message = new AdbMessage('OPEN', localId, remoteId, service);
        await message.send(device.transport);

        let response = await AdbMessage.receive(device.transport);
        while (response.arg1 !== localId) {
            response = await AdbMessage.receive(device.transport);
        }

        if (response.cmd !== 'OKAY') {
            throw new Error('Open failed: ' + response.cmd);
        }

        remoteId = response.arg0;
        return new AdbStream(device, localId, remoteId);
    }

    /**
     * 关闭流
     */
    async close() {
        if (!this.closed) {
            this.closed = true;
            const message = new AdbMessage('CLSE', this.localId, this.remoteId);
            await message.send(this.device.transport);
        }
    }

    /**
     * 发送数据
     * @param {ArrayBuffer|string} data - 数据
     */
    async send(data) {
        if (this.closed) {
            throw new Error('Stream closed');
        }

        const message = new AdbMessage('WRTE', this.localId, this.remoteId, data);
        await message.send(this.device.transport);

        // 等待确认
        let response = await AdbMessage.receive(this.device.transport);
        while (response.arg0 !== this.remoteId || response.arg1 !== this.localId) {
            response = await AdbMessage.receive(this.device.transport);
        }

        if (response.cmd !== 'OKAY') {
            throw new Error('Send failed: ' + response.cmd);
        }
    }

    /**
     * 接收数据
     * @returns {Promise<ArrayBuffer>}
     */
    async receive() {
        if (this.closed) {
            throw new Error('Stream closed');
        }

        let response = await AdbMessage.receive(this.device.transport);
        while (response.arg0 !== this.remoteId || response.arg1 !== this.localId) {
            response = await AdbMessage.receive(this.device.transport);
        }

        if (response.cmd === 'CLSE') {
            this.closed = true;
            return null;
        }

        if (response.cmd !== 'WRTE') {
            throw new Error('Receive failed: ' + response.cmd);
        }

        // 发送确认
        const message = new AdbMessage('OKAY', this.localId, this.remoteId);
        await message.send(this.device.transport);

        return response.data;
    }
}

// 流 ID 计数器
AdbStream.nextId = 1;

// 导出类
try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            AdbDevice,
            AdbStream
        };
    }
} catch (e) {
    // 浏览器环境
    window.AdbDevice = AdbDevice;
    window.AdbStream = AdbStream;
}
