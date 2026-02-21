// ADB 消息类
// 处理 ADB 协议的消息格式

class AdbMessage {
    /**
     * 创建 ADB 消息
     * @param {string} cmd - 命令
     * @param {number} arg0 - 参数0
     * @param {number} arg1 - 参数1
     * @param {ArrayBuffer|string} data - 数据
     */
    constructor(cmd, arg0, arg1, data = null) {
        if (cmd.length !== 4) {
            throw new Error('Invalid command: ' + cmd);
        }

        this.cmd = cmd;
        this.arg0 = arg0;
        this.arg1 = arg1;
        this.data = data;
        this.length = 0;

        if (data) {
            if (typeof data === 'string') {
                const encoder = new TextEncoder();
                this.data = encoder.encode(data).buffer;
            } else if (ArrayBuffer.isView(data)) {
                this.data = data.buffer;
            }
            this.length = this.data.byteLength;
        }
    }

    /**
     * 计算校验和
     * @param {DataView} dataView - 数据视图
     * @returns {number} 校验和
     */
    static checksum(dataView) {
        let sum = 0;
        for (let i = 0; i < dataView.byteLength; i++) {
            sum += dataView.getUint8(i);
        }
        return sum & 0xffffffff;
    }

    /**
     * 发送消息
     * @param {AdbTransport} transport - 传输对象
     * @returns {Promise}
     */
    async send(transport) {
        const header = new ArrayBuffer(24);
        const cmd = AdbMessage.encodeCommand(this.cmd);
        const magic = cmd ^ 0xffffffff;
        const checksum = this.length > 0 ? AdbMessage.checksum(new DataView(this.data)) : 0;

        const view = new DataView(header);
        view.setUint32(0, cmd, true);      // command
        view.setUint32(4, this.arg0, true); // arg0
        view.setUint32(8, this.arg1, true); // arg1
        view.setUint32(12, this.length, true); // length
        view.setUint32(16, checksum, true); // checksum
        view.setUint32(20, magic, true);   // magic

        console.log('Sending ADB message:', this.cmd, 'arg0:', this.arg0, 'arg1:', this.arg1, 'length:', this.length);
        
        // 发送头部
        await transport.send(header);
        console.log('Header sent');

        // 发送数据
        if (this.length > 0) {
            await transport.send(this.data);
            console.log('Data sent, length:', this.length);
        }
        
        console.log('ADB message sent successfully');
    }

    /**
     * 接收消息
     * @param {AdbTransport} transport - 传输对象
     * @returns {Promise<AdbMessage>}
     */
    static async receive(transport) {
        // 接收头部
        console.log('Waiting for ADB message header...');
        const header = await transport.receive(24);
        const view = new DataView(header);

        const cmd = view.getUint32(0, true);
        const arg0 = view.getUint32(4, true);
        const arg1 = view.getUint32(8, true);
        const length = view.getUint32(12, true);
        const checksum = view.getUint32(16, true);
        const magic = view.getUint32(20, true);

        console.log('Received header - cmd:', cmd, 'arg0:', arg0, 'arg1:', arg1, 'length:', length);

        // 验证 magic
        if ((cmd ^ magic) !== 0xffffffff) {
            throw new Error('Magic mismatch');
        }

        const cmdString = AdbMessage.decodeCommand(cmd);
        console.log('Received ADB command:', cmdString);

        // 接收数据
        let data = null;
        if (length > 0) {
            console.log('Receiving data, length:', length);
            data = await transport.receive(length);

            // 验证校验和
            const calculatedChecksum = AdbMessage.checksum(new DataView(data));
            if (calculatedChecksum !== checksum) {
                throw new Error('Checksum mismatch');
            }
            console.log('Data received successfully');
        }

        return new AdbMessage(cmdString, arg0, arg1, data);
    }

    /**
     * 编码命令
     * @param {string} cmd - 命令字符串
     * @returns {number} 编码后的命令
     */
    static encodeCommand(cmd) {
        let result = 0;
        for (let i = 0; i < 4; i++) {
            result = (result << 8) | cmd.charCodeAt(i);
        }
        return result;
    }

    /**
     * 解码命令
     * @param {number} cmd - 编码后的命令
     * @returns {string} 解码后的命令字符串
     */
    static decodeCommand(cmd) {
        let result = '';
        for (let i = 0; i < 4; i++) {
            result += String.fromCharCode((cmd >> (8 * (3 - i))) & 0xff);
        }
        return result;
    }
}

// 导出消息类
try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = AdbMessage;
    }
} catch (e) {
    // 浏览器环境
    window.AdbMessage = AdbMessage;
}
