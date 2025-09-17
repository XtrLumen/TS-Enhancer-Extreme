##MULTILINGUAL FUNCTIONS##
[[ "$(getprop persist.sys.locale)" == *"zh"* || "$(getprop ro.product.locale)" == *"zh"* ]] && LOCALE="CN" || LOCALE="EN"
echo_all() {
if [ "$LOCALE" = "$1" ]; then
  shift
  if [ "$1" = "-n" ]; then
    shift
    echo -n "$@"
  else
    echo "$@"
  fi
fi
}
echo_cn() { echo_all "CN" "$@"; }
echo_en() { echo_all "EN" "$@"; }
##END##

##VARIABLE##
TS="tricky_store"
TSEE="ts_enhancer_extreme"
S="service.sh"
D=".tsee_state.sh"
P="post-fs-data.sh"

ADB="/data/adb"

MODULESDIR="$ADB/modules"
TSEECONFIG="$ADB/$TSEE"
SD="$ADB/service.d"

TSEEMODDIR="$MODULESDIR/$TSEE"
TSMODDIR="$MODULESDIR/$TS"

MULTIPLETYPE="$TSEECONFIG/multiple.txt"
KERNELTYPE="$TSEECONFIG/kernel.txt"
TSEELOG="$TSEECONFIG/log/log.log"
TSEEBIN="$TSEEMODDIR/binaries"
TYPE="$TSEECONFIG/root.txt"

ORIGIN=$(basename "$0")
##END##

##OTHER FUNCTIONS##
logout() { echo "$(date "+%m-%d %H:%M:%S.$(date +%3N)")  $$  $$ I System.out: [TSEE]$1" >> "$TSEELOG"; }
logc() { logout "<CLI>$1"; }
logs() { logout "<Service>$1"; }
logd() { logout "<Service.D>$1"; }
logp() { logout "<Post-Fs-Data>$1"; }
call() {
"$1" "$2"
if $TSEEBIN/tseed $3; then
  "$1" "完毕"
else
  "$1" "失败"
fi
}
invoke() {
if [[ "$ORIGIN" == *"$S"* ]]; then
  call "logs" "$1" "$2"
elif [[ "$ORIGIN" == *"$P"* ]]; then
  call "logp" "$1" "$2"
elif [[ "$ORIGIN" == *"$D"* ]]; then
  call "logd" "$1" "$2"
fi
}
check() {
if [ "$(cat "$TYPE")" = "Multiple" ] || [ ! -d "$TSMODDIR" ] || [ -f "$TSMODDIR/disable" ]; then
  if [[ "$ORIGIN" == *"$P"* ]]; then
    logp "环境异常,拦截执行"
    rm -f "$TSMODDIR/action.sh"
    mv "$TSEEMODDIR/webroot" "$TSEEMODDIR/.webroot"
    mv "$TSEEMODDIR/action.sh" "$TSEEMODDIR/.action.sh"
  elif [[ "$ORIGIN" == *"$S"* ]]; then
    exit
  fi
else
  if [[ "$ORIGIN" == *"$P"* ]]; then
    logp "环境正常,继续执行"
    mv "$TSEEMODDIR/.webroot" "$TSEEMODDIR/webroot"
    mv "$TSEEMODDIR/.action.sh" "$TSEEMODDIR/action.sh"
    ln -sf "$TSEEMODDIR/libraries/action.sh" "$TSMODDIR/action.sh"
  fi
fi
}
detect() {
if [ $? -eq 0 ]; then
  echo_cn "完毕"
  echo_en "Complete"
else
  echo_cn "失败"
  echo_en "Failed"
fi
}
initwait() { resetprop -w sys.boot_completed 0; }
##END##

if [[ "$ORIGIN" == *"$P"* ]]; then
  rm -f "$MULTIPLETYPE"
  rm -f "$KERNELTYPE"
  rm -f "$TSEELOG"
  rm -f "$TYPE"
else
  ROOT=$(cat "$TYPE")
fi