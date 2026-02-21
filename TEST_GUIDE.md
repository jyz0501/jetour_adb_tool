# ADB 连接测试指南

## 快速测试步骤

### 方案一：使用 CDN 测试页面（推荐，无需安装）

1. **打开测试页面**
   ```
   在浏览器中直接打开：test-cdn.html
   ```

2. **点击"连接设备"按钮**
   - 浏览器会弹出设备选择对话框
   - 选择你的 Android 设备
   - 在设备上点击"允许 USB 调试"

3. **测试功能**
   - 点击"获取设备信息" - 查看设备型号、Android 版本等
   - 点击"测试 Shell 命令" - 执行多条 ADB 命令
   - 点击"断开连接" - 断开设备连接

4. **查看日志**
   - 页面底部的日志区域会显示所有操作记录
   - 绿色表示成功，红色表示错误

### 方案二：使用构建版本（需要 npm）

如果你想测试完整的集成版本：

1. **安装依赖**
   ```bash
   cd /Users/alun/Downloads/jetour_adb_tool_副本
   npm install --registry=https://registry.npmmirror.com
   ```

2. **构建项目**
   ```bash
   npm run build
   ```

3. **更新 HTML**
   编辑 `index.html`，注释掉自研实现，添加新实现：
   ```html
   <!-- 注释掉自研实现 -->
   <!-- <script src="js/adb/transport.js"></script> -->
   <!-- <script src="js/adb/message.js"></script> -->
   <!-- <script src="js/adb/device.js"></script> -->
   <!-- <script src="js/adb/index.js"></script> -->

   <!-- 使用新实现 -->
   <script src="dist/adb-bundle.js"></script>
   ```

4. **打开页面**
   ```
   在浏览器中打开：index.html
   ```

## 测试清单

- [ ] 浏览器支持 WebUSB（Chrome/Edge）
- [ ] 设备已开启 USB 调试模式
- [ ] 使用支持 ADB 的数据线连接设备
- [ ] 能够成功连接设备
- [ ] 能够获取设备信息（型号、版本等）
- [ ] 能够执行 Shell 命令
- [ ] 能够正常断开连接

## 常见问题

### Q1: 点击"连接设备"没有反应
**A:** 检查以下几点：
1. 是否使用 Chrome/Edge 浏览器
2. 数据线是否支持 ADB（尝试使用原装数据线）
3. 设备是否开启 USB 调试（设置 → 开发者选项 → USB 调试）
4. 是否在设备上允许了 USB 调试授权

### Q2: 连接时提示"找不到兼容设备"
**A:**
1. 重新插拔数据线
2. 尝试设备上的其他 USB 接口
3. 确认设备已开启 USB 调试模式
4. 检查是否有其他程序占用了 ADB 通道

### Q3: 能够连接但无法执行命令
**A:**
1. 检查设备是否允许了 USB 调试（连接时在设备上确认）
2. 刷新页面重新连接
3. 检查浏览器控制台是否有错误信息

### Q4: CDN 版本无法加载
**A:** 可能是网络问题，尝试：
1. 更换网络环境
2. 使用本地构建版本
3. 更换 CDN 地址（见 `USE_CDN_VERSION.md`）

### Q5: 测试成功后如何集成到主项目？
**A:** 参考以下步骤：
1. 更新 `js/device.js` 中的连接逻辑
2. 更新 `js/apps.js` 中的应用安装函数
3. 更新 `js/system.js` 中的系统工具函数
4. 具体示例见 `ADB_IMPL_README.md`

## 测试成功标志

如果看到以下内容，说明测试成功：

```
✓ 页面加载完成
✓ 浏览器支持 WebUSB
✓ 模块加载成功
✓ 设备选择成功
✓ 设备连接成功！
✓ 设备信息获取成功
✓ 所有命令执行完成
```

## 预期输出示例

### 设备信息
```
序列号：1234567890ABCDEF
设备型号：Jetour Car Android
Android 版本：11
```

### Shell 命令输出
```
执行: getprop ro.product.manufacturer
  结果: Jetour

执行: getprop ro.product.model
  结果: Car-Android

执行: getprop ro.build.version.release
  结果: 11

执行: getprop ro.build.version.sdk
  结果: 30
```

## 性能测试

可以测试以下功能：

1. **连续执行多个命令**
   - 执行 10 条命令，测试响应时间
   - 检查是否有延迟或卡顿

2. **长时间连接稳定性**
   - 连接后保持 5-10 分钟
   - 查看是否自动断开

3. **多次连接/断开**
   - 连接 → 断开 → 连接 → 断开
   - 测试是否能够重复连接

## 反馈问题

如果遇到问题，请提供以下信息：

1. 浏览器版本（Chrome/Edge）
2. 设备型号和 Android 版本
3. 详细的错误信息（日志输出）
4. 浏览器控制台错误（F12 → Console）

## 下一步

测试成功后，你可以：

1. 将 CDN 版本集成到 `index.html`
2. 使用 npm 构建完整版本
3. 更新业务代码使用新的 API
4. 添加更多功能（文件传输、应用管理等）

祝测试顺利！🎉
