#!/bin/bash

# 获取提交次数
COMMIT_COUNT=$(git rev-list --count HEAD)

# 将提交次数转为字符串，不足3位前面补0
PADDED_COUNT=$(printf "%03d" "$COMMIT_COUNT")

# 第一位作为主版本号，第二位作为次版本号，剩余作为修订号
MAJOR="${PADDED_COUNT:0:1}"
MINOR="${PADDED_COUNT:1:1}"
PATCH="${PADDED_COUNT:2}"

# 生成版本号
VERSION="v${MAJOR}.${MINOR}.${PATCH}"

# 更新 index.html 文件中的版本号
sed -i '' "s/<span id=\"app-version\">.*<\/span>/<span id=\"app-version\">${VERSION}<\/span>/" index.html

# 输出结果
echo "提交次数: ${COMMIT_COUNT}"
echo "版本号已更新为: ${VERSION}"
