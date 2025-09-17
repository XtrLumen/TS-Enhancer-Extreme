cd ${0%/*}
source "./libraries/util_functions.sh"
invoke "调用运行环境检查参数" "--rootdetect"
check

if [ ! -f "$SD/$D" ]; then
  logp "复制状态检测脚本至执行文件夹"
  mkdir -p "$SD"
  cat "$TSEEMODDIR/libraries/state.sh" > "$SD/$D"
  chmod +x "$SD/$D"
fi