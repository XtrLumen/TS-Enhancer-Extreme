cd ${0%/*}
source "../ts_enhancer_extreme/libraries/util_functions.sh"

echo_cn -n "- 调用包名列表更新参数..."
echo_en -n "- Invoke the PackageListUpdate parameter..."
[ "$APATCH" = "true" ] || PARAMETER="-a"
$TSEEBIN/tseed --packagelistupdate $PARAMETER
detect