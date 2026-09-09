


COMMIT_COUNT=$(git rev-list --count HEAD)


PADDED_COUNT=$(printf "%03d" "$COMMIT_COUNT")


MAJOR="${PADDED_COUNT:0:1}"
MINOR="${PADDED_COUNT:1:1}"
PATCH="${PADDED_COUNT:2}"


VERSION="v${MAJOR}.${MINOR}.${PATCH}"


sed -i '' "s/<span id=\"app-version\">.*<\/span>/<span id=\"app-version\">${VERSION}<\/span>/" index.html


echo "提交次数: ${COMMIT_COUNT}"
echo "版本号已更新为: ${VERSION}"
