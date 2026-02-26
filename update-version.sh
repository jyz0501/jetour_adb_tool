#!/bin/bash

# 获取提交次数
COMMIT_COUNT=$(git rev-list --count HEAD)

# 生成版本号
VERSION="v1.${COMMIT_COUNT}.0"

# 更新 index.html 文件中的版本号
sed -i '' "s/<span id=\"app-version\" style=\"font-size: 12px; color: #999;\">.*<\/span>/<span id=\"app-version\" style=\"font-size: 12px; color: #999;\">${VERSION}<\/span>/" index.html

# 输出结果
echo "版本号已更新为: ${VERSION}"
