# 捷途大伦哥ADB工具

**在线访问**: https://jyz0501.github.io/jetour_adb_tool/

> ⚠️ **免责声明**：本工具仅供个人学习测试使用，请勿用于商业用途。使用本工具造成的任何后果由使用者自行承担。

> 💬 **交流学习**：欢迎提交 PR 交流学习，请联系抖音 @大伦哥的CDM

一个基于WebUSB的ADB工具，用于在浏览器中管理Android设备，支持应用安装等功能。

## 功能特性

### 1. 设备连接
- 有线USB连接（通过WebUSB）
- 设备状态显示
- 无线ADB端口开启

### 2. 一键安装
- 应用管家
- 侧边栏
- 氢桌面
- 沙发管家
- 权限狗
- 虚拟返回键
- 一键清理
- 无障碍管理器
- 返回菜单键

### 3. 应用管理
- 选择APK文件
- 安装本地APK
- 查看已安装应用列表
- 启动/停止/卸载应用

### 4. 快捷启动
- 启动应用管家
- 启动氢桌面
- 启动设置
- 启动侧边栏

### 5. 命令执行
- 手动执行ADB shell命令

## 项目结构
```
jetour_adb_tool/
├── index.html              # 主页面
├── css/
│   └── style.css           # 样式文件
├── js/
│   ├── utils.js            # 工具函数
│   ├── device.js           # 设备管理
│   ├── apps.js             # 应用安装
│   ├── system.js           # 系统工具
│   └── main.js             # 主入口
├── ya-webadb-2.5.2/        # Tango ADB库
└── README.md               # 说明文档
```

## 技术栈
- **前端**：HTML5, CSS3, JavaScript
- **ADB**：Tango ADB (ya-webadb 2.5.2)
- **USB通信**：WebUSB API

## 使用说明

### 环境要求
- **浏览器**：Microsoft Edge 或 Google Chrome
- **设备**：Android设备
- **连接**：USB数据线

### 连接步骤
1. 使用Edge/Chrome浏览器访问工具页面
2. 点击"有线连接"按钮
3. 在设备上允许USB调试
4. 连接成功后即可使用各项功能

### 常见问题
1. **连接失败**：尝试拔插数据线，或运行 `adb kill-server`
2. **浏览器不支持**：使用Edge或Chrome浏览器
3. **权限问题**：确保设备已开启USB调试模式
4. **root权限**：部分系统工具需要root权限

## 注意事项
1. 使用USB数据线连接设备
2. 首次连接需在设备上允许USB调试
3. 部分功能需要设备root权限
4. 使用过程中请保持设备连接稳定

## 许可证

MIT License
