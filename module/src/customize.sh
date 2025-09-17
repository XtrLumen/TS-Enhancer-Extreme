SKIPUNZIP=1
DEBUG=false
MIN_SDK=29
[[ "$(getprop persist.sys.locale)" == *"zh"* || "$(getprop ro.product.locale)" == *"zh"* ]] && LOCALE="CN" || LOCALE="EN"
operate() {
  if [ "$LOCALE" = "$1" ]; then
    shift
    local operation="$1"
    shift
    if [ "$operation" = "echo" ]; then
      if [ "$1" = "-n" ]; then
        shift
        echo -n "$@"
      else
        echo "$@"
      fi
    elif [ "$operation" = "functions" ]; then
      eval "${1%=*}=\"${1#*=}\""
    elif [ "$operation" = "abort_verify" ]; then
      abort_verify "$@"
    fi
  fi
}
print_cn() { operate "CN" "echo" "$@"; }
print_en() { operate "EN" "echo" "$@"; }
abort_cn() { operate "CN" "abort_verify" "$@"; }
abort_en() { operate "EN" "abort_verify" "$@"; }
functions_cn() { operate "CN" "functions" "$@"; }
functions_en() { operate "EN" "functions" "$@"; }
conflictdes_all() { sed -i "s|^description=.*|description=$1|" "/data/adb/modules/$MODULE/module.prop"; }

unzip -o "$ZIPFILE" 'verify.sh' -d "$TMPDIR" >/dev/null
if [ ! -f "$TMPDIR/verify.sh" ]; then
  ui_print "***********************************************"
  print_cn "! 无法提取 verify.sh!"
  print_cn "! 这个ZIP文件已损坏,请重新下载"
  print_en "! Unable to extract verify.sh!"
  print_en "! This zip may be corrupted, please try downloading again"
  abort "***********************************************"
fi
source "$TMPDIR/verify.sh"
extract "$ZIPFILE" 'verify.sh' "$TMPDIR_FOR_VERIFY"
extract "$ZIPFILE" 'customize.sh' "$TMPDIR_FOR_VERIFY"

print_cn "- 安装模块#TS-Enhancer-Extreme"
print_cn "- 作者#XtrLumen"
print_en "- Install module TS-Enhancer-Extreme"
print_en "- Author XtrLumen"

print_cn "- 本模块完全免费"
print_cn "- 如付费途径获取"
print_cn "- 请直接申请退款"
sleep 1s

if [ "$API" -lt $MIN_SDK ]; then
  ui_print "***********************************************"
  print_cn "! 当前的安卓版本过低 $API"
  print_cn "! 最低支持的安卓版本是 $MIN_SDK"
  print_en "! Unsupported sdk: $API"
  print_en "! Minimal supported sdk is $MIN_SDK"
  abort "***********************************************"
fi

print_cn "- 提取模块文件"
print_en "- Extracting module files"
set -x
FILES="
libraries/*
binaries/*
webroot/*
post-fs-data.sh
uninstall.sh
service.apk
service.dex
service.sh
module.prop
banner.png
machikado
mazoku
"
for FILE in $FILES; do
  extract "$ZIPFILE" "$FILE" "$MODPATH"
done
set +x

if [ ! "$APATCH" ] && [ ! "$KSU" ]; then
  extract "$ZIPFILE" 'action.sh' "$MODPATH"
  if ! { pm path com.dergoogler.mmrl.wx > /dev/null 2>&1 || pm path io.github.a13e300.ksuwebui > /dev/null 2>&1; }; then
    print_cn "- 安装 WebUI 软件"
    print_en "- install WebUI Sortware"
    extract "$ZIPFILE" 'webui.apk' "$MODPATH"
    pm install "$MODPATH/webui.apk" > /dev/null 2>&1
  fi
fi

ADB="/data/adb"
SD="$ADB/service.d"
TSCONFIG="$ADB/tricky_store"
TSEECONFIG="$ADB/ts_enhancer_extreme"

print_cn "- 删除旧版文件"
print_en "- Delete older version files"
rm -f "$SD/.tsee_state.sh"
rm -rf "$ADB/tricky_store_old"
rm -f "$TSEECONFIG/hash.txt"
rm -f "$TSEECONFIG/boothash.txt"
rm -f "$TSEECONFIG/log/service.log"
rm -f "$TSEECONFIG/log/inotifyd.log"
rm -f "$TSEECONFIG/log/dex-service.log"
rm -f "$TSEECONFIG/log/post-fs-data.log"

mkdir -p "$SD"
cat "$MODPATH/libraries/state.sh" > "$SD/.tsee_state.sh"

print_cn "- 赋予必要权限"
print_en "- Setting permission"
chcon u:object_r:shell_data_file:s0 "$MODPATH/service.apk"
chmod +x "$MODPATH/binaries/tseed"
chmod +x "$MODPATH/binaries/cmd"
chmod +x "$SD/.tsee_state.sh"

BACKUP1="$ADB/tsconfig_backup"
BACKUP2="$TSCONFIG/config_backup"

if [ -d "$TSCONFIG" ]; then
  print_cn "- 备份配置目录"
  print_en "- Backup configuration directory"
  rm -rf "$BACKUP2"
  mv "$TSCONFIG" "$BACKUP1"
  mkdir -p "$TSCONFIG"
  mv "$BACKUP1" "$BACKUP2"
  cat "$BACKUP2/tee_status" > "$TSCONFIG/tee_status"
else
  print_cn "- 配置目录不存在,跳过备份"
  print_en "- Config directory does not exist, skip backup"
fi

print_cn "- 创建配置目录"
print_en "- Creating configuration directory"
mkdir -p "$TSEECONFIG"
mkdir -p "$TSEECONFIG/log"
touch "$TSCONFIG/target.txt"

SYS="
com.android.vending
com.google.android.gsf
com.google.android.gms
"
USR="
me.bmax.apatch
com.android.patch
me.garfieldhan.apatch.next
"
if [ ! -f "$TSEECONFIG/usr.txt" ] || [ ! -f "$TSEECONFIG/sys.txt" ]; then
  print_cn "- 创建排除列表"
  print_en "- Extract default exclusion list"
  touch "$TSEECONFIG/usr.txt"
  echo "$SYS" | awk 'NF { lines[++n]=$0 } END { for (i=1;i<=n;i++) { printf "%s", lines[i]; if (i<n) printf "\n" } }' > "$TSEECONFIG/sys.txt"
  touch "$TSEECONFIG/sys.txt"
  echo "$USR" | awk 'NF { lines[++n]=$0 } END { for (i=1;i<=n;i++) { printf "%s", lines[i]; if (i<n) printf "\n" } }' > "$TSEECONFIG/usr.txt"
fi
if [[ "$(getprop ro.product.brand)" == "OnePlus" ]]; then
  grep -qx "com.oplus.engineermode" "$TSEECONFIG/sys.txt" || printf "\n%s" "com.oplus.engineermode" >> "$TSEECONFIG/sys.txt"
fi

print_cn "- 提取密钥文件"
print_en "- Extract Google signature keybox"
extract "$ZIPFILE" 'keybox.xml' "$TSEECONFIG"
cp "$TSEECONFIG/keybox.xml" "$TSCONFIG/keybox.xml"

print_cn "- 获取包名添加"
print_en "- Getting package list & adding target"
{ pm list packages -3 | sed 's/^package://' | grep -vFf "$TSEECONFIG/usr.txt"; cat "$TSEECONFIG/sys.txt"; } > "$TSCONFIG/target.txt"

print_cn "- 检查冲突模块"
print_en "- Checking conflicts module"
KSUOFSIMG="$ADB/ksu/modules.img"
APOFSIMG="$ADB/ap/modules.img"
MODULESDIR="$ADB/modules"
DETECTED=0
CONFLICT="
Yurikey
safetynet-fix
vbmeta-fixer
integrity_box
SukiSU_module
Reset_BootHash
Tricky_store-bm
Hide_Bootloader
ShamikoManager
Tricky_Store-xiaoyi
tricky_store_assistant
extreme_hide_bootloader
wjw_hiderootauxiliarymod
"
RMRFDETECTED=0
RMRFCONFLICT="
TA_utl
.TA_utl
"
OFSDETECTED=0
OFSCONFLICT="
$RMRFCONFLICT $CONFLICT
"
{ [ -f "$APOFSIMG" ] || [ -f "$KSUOFSIMG" ]; } && OVERLAYFS="TRUE"
functions_cn WAY="下一次启动时被移除."
functions_en WAY="upon the next boot."
functions_cn DES="此模块与TS-Enhancer-Extreme模块证实冲突,已被添加移除标签,将在"
functions_en DES="This module has been confirmed to conflict with the TS-Enhancer-Extreme module. It has been tagged for removal and will be removed "
if [ ! "$OVERLAYFS" = "TRUE" ]; then
  for MODULE in $CONFLICT; do
    [ -d "$MODULESDIR/$MODULE" ] && {
      conflictdes_all "$DES$WAY"
      touch "$MODULESDIR/$MODULE/update"
      touch "$MODULESDIR/$MODULE/disable"
      touch "$MODULESDIR/$MODULE/remove"
      rm -f "$MODULESUPDATEDIR/uninstall.sh"
      rm -f "$MODULESDIR/$MODULE/uninstall.sh"
      DETECTED=$((DETECTED + 1))
    }
  done
  for RMRFMODULE in $RMRFCONFLICT; do
    [ -d "$MODULESDIR/$RMRFMODULE" ] && {
      (cd "$MODULESDIR/$RMRFMODULE"; ./uninstall.sh)
      rm -rf "$MODULESDIR/$RMRFMODULE"
      RMRFDETECTED=$((RMRFDETECTED + 1))
    }
  done
else
  for MODULE in $OFSCONFLICT; do
    [ -d "$MODULESDIR/$MODULE" ] && {
      if [ -f $MODULESDIR/$MODULE/update ]; then
        functions_cn WAY="两次重新启动后被移除."
        functions_en WAY="after two reboots."
      fi
      conflictdes_all "$DES$WAY"
      touch "$MODULESDIR/$MODULE/update"
      touch "$MODULESDIR/$MODULE/disable"
      touch "$MODULESDIR/$MODULE/remove"
      OFSDETECTED=$((OFSDETECTED + 1))
    }
  done
fi

if [ $OFSDETECTED -gt 0 ]; then
  print_cn "- 发现$OFSDETECTED个冲突模块,已添加移除标签与提示"
  print_en "- Detected $OFSDETECTED conflicting modules, Added removal tags and notification"
elif [ $DETECTED -gt 0 ] && [ $RMRFDETECTED -gt 0 ]; then
  print_cn "- 发现$DETECTED个普通冲突模块,已添加移除标签与提示"
  print_cn "- 发现$RMRFDETECTED个隐藏冲突模块,已强制卸载"
  print_en "- Detected $DETECTED conflicting modules, Added removal tags and notification"
  print_en "- Detected $RMRFDETECTED hidden conflicting modules, Force uninstall"
elif [ $DETECTED -gt 0 ] && [ $RMRFDETECTED -eq 0 ]; then
  print_cn "- 发现$DETECTED个普通冲突模块,已添加移除标签与提示"
  print_en "- Detected $DETECTED conflicting modules, Added removal tags and notification"
elif [ $DETECTED -eq 0 ] && [ $RMRFDETECTED -gt 0 ]; then
  print_cn "- 发现$RMRFDETECTED个隐藏冲突模块,已强制卸载"
  print_en "- Detected $RMRFDETECTED hidden conflicting modules, Force uninstall"
elif [ $DETECTED -eq 0 ] && [ $RMRFDETECTED -eq 0 ]; then
  print_cn "- 未发现冲突模块"
  print_en "- No conflict module found"
fi

print_cn "- 检查冲突软件"
print_en "- Checking conflicts software"
APPDETECTED=0
APPCONFLICT="
com.lingqian.appbl
com.topmiaohan.hidebllist
"
for PACKAGE in $APPCONFLICT; do
  if pm path $PACKAGE > /dev/null 2>&1; then
    pm uninstall $PACKAGE > /dev/null 2>&1
    APPDETECTED=$((APPDETECTED + 1))
  fi
done
if [ $APPDETECTED -gt 0 ]; then
  print_cn "- 发现$APPDETECTED个冲突软件,已强制卸载"
  print_en "- Detected $APPDETECTED conflicting software, Forced uninstalled"
elif [ $APPDETECTED -eq 0 ]; then
  print_cn "- 未发现冲突软件"
  print_en "- No conflict software found"
fi

print_cn "- 安装完毕"
print_en "- Install Done"