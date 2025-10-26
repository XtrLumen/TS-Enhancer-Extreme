#
# This file is part of TS-Enhancer-Extreme.
#
# TS-Enhancer-Extreme is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
#
# TS-Enhancer-Extreme is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
# without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
# See the GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License along with TS-Enhancer-Extreme.
# If not, see <https://www.gnu.org/licenses/>.
#
# Copyright (C) 2025 TheGeniusClub (Organization)
# Copyright (C) 2025 XtrLumen (Developer)
#

SKIPUNZIP=1
MIN_RELEASE=10
RELEASE=$(grep_get_prop ro.build.version.release)
[[ "$(grep_get_prop persist.sys.locale)" == *"zh"* || "$(grep_get_prop ro.product.locale)" == *"zh"* ]] && LOCALE="CN" || LOCALE="EN"
operate() {
  [ "$LOCALE" = "$1" ] && {
    shift
    local operation="$1"
    shift
    case "$operation" in
      ui_print)
        ui_print "$@"
        ;;
      functions)
        eval "${1%=*}=\"${1#*=}\""
        ;;
      abort_verify)
        ui_print "***********************************************"
        ui_print "! $@"
        print_cn "! 这个ZIP文件已损坏,请重新下载"
        print_en "! This zip may be corrupted, please try downloading again"
        abort "***********************************************"
        ;;
    esac
  }
}
print_cn() { operate "CN" "ui_print" "$@"; }
print_en() { operate "EN" "ui_print" "$@"; }
abort_cn() { operate "CN" "abort_verify" "$@"; }
abort_en() { operate "EN" "abort_verify" "$@"; }
functions_cn() { operate "CN" "functions" "$@"; }
functions_en() { operate "EN" "functions" "$@"; }
conflictdes_all() { sed -i "s|^description=.*|description=$DES$WAY|" "/data/adb/modules/$MODULE/module.prop"; }
#VARIABLE#
#PUBLIC#
ADB="/data/adb"
SD="$ADB/service.d"
TSCONFIG="$ADB/tricky_store"
TSEECONFIG="$ADB/ts_enhancer_extreme"
#EXTRACT MODULE FILES#
FILES="
bin/*
lib/*
webroot/*
post-fs-data.sh
uninstall.sh
service.apk
service.dex
service.sh
module.prop
banner.png
webui.apk
action.sh
mistylake
"
#POST PROCESS#
NES="
$SD/.tsee_state.sh
$MODPATH/bin/cmd
$MODPATH/bin/tseed
$MODPATH/bin/tseedemo
"
KEYBOX="$TSCONFIG/keybox.xml"
BACKUP="$TSCONFIG/keybox_backup"
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
#CONFLICT CHECK#
MODULESDIR="$ADB/modules"
DETECTED=0
CONFLICT="
Yurikey
xiaocaiye
safetynet-fix
vbmeta-fixer
playintegrity
integrity_box
SukiSU_module
Reset_BootHash
Tricky_store-bm
Hide_Bootloader
ShamikoManager
extreme_hide_root
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
OFSCONFLICT="$RMRFCONFLICT $CONFLICT"
functions_cn DES="此模块与TS-Enhancer-Extreme模块证实冲突,已被添加移除标签,将在"
functions_cn WAY="下一次启动时被移除."
functions_en DES="This module has been confirmed to conflict with the TS-Enhancer-Extreme module. It has been tagged for removal and will be removed "
functions_en WAY="upon the next boot."
APPDETECTED=0
APPCONFLICT="
com.lingqian.appbl
com.topmiaohan.hidebllist
"
##END##

##PRE PROCESS##
#CHECK INTEGRITY#
unzip -o "$ZIPFILE" 'verify.sh' -d "$TMPDIR" >/dev/null
[ -f "$TMPDIR/verify.sh" ] || {
  abort_cn "verify.sh 不存在!"
  abort_en "verify.sh not exists"
}
source "$TMPDIR/verify.sh"
#CHECK ENVIRONMENT#
[ "$BOOTMODE" ] || {
  ui_print "***********************************************"
  print_cn "! 不受支持的安装环境 Recovery"
  print_cn "! 请从 KernelSU, APatch 或 Magisk 应用安装"
  print_en "! Install from recovery is not supported"
  print_en "! Please install from KernelSU, APatch or Magisk app"
  abort "***********************************************"
}
[ "$RELEASE" -lt $MIN_RELEASE ] && {
  ui_print "***********************************************"
  print_cn "! 不受支持的安卓版本 $RELEASE"
  print_cn "! 最低支持的安卓版本 $MIN_RELEASE"
  print_en "! Unsupported android version: $RELEASE"
  print_en "! Minimal supported android version is $MIN_RELEASE"
  abort "***********************************************"
}
if [ "$KSU" ]; then
  print_cn "- 从 KernelSU 应用中安装"
  print_cn "- KernelSU 版本: $KSU_VER"
  print_cn "- KernelSU 版本号: $KSU_KERNEL_VER_CODE (kernel) + $KSU_VER_CODE (ksud)"
  print_en "- Installing from KernelSU app"
  print_en "- KernelSU version: $KSU_VER"
  print_en "- KernelSU version code: $KSU_KERNEL_VER_CODE (kernel) + $KSU_VER_CODE (ksud)"
elif [ "$APATCH" ]; then
  print_cn "- 从 APatch 应用安装"
  print_cn "- APatch 版本: $APATCH_VER"
  print_cn "- APatch 版本号: $APATCH_VER_CODE"
  print_en "- Installing from APatch app"
  print_en "- APatch version: $APATCH_VER"
  print_en "- APatch version code: $APATCH_VER_CODE"
elif [ "$MAGISK_VER" ]; then
  print_cn "- 从 Magisk 应用安装"
  print_cn "- Magisk 版本: $MAGISK_VER"
  print_cn "- Magisk 版本号: $MAGISK_VER_CODE"
  print_en "- Installing from Magisk app"
  print_en "- Magisk version: $MAGISK_VER"
  print_en "- Magisk version code: $MAGISK_VER_CODE"
fi
#PRINT INFORMATION#
print_cn "- 安装模块#TS-Enhancer-Extreme"
print_cn "- 作者#XtrLumen"
print_en "- Install module TS-Enhancer-Extreme"
print_en "- Author XtrLumen"
print_cn "- 本模块完全免费"
print_cn "- 如付费途径获取"
print_cn "- 请直接申请退款"
sleep 1s
#DELETE OLD FILES#
print_cn "- 删除旧版文件"
print_en "- Delete older version files"
rm -f "$SD/.tsee_state.sh"
rm -rf "$ADB/tricky_store_old"
rm -rf "$TSCONFIG/config_backup"
rm -f "$TSEECONFIG/hash.txt"
rm -f "$TSEECONFIG/boothash.txt"
rm -f "$TSEECONFIG/log/service.log"
rm -f "$TSEECONFIG/log/inotifyd.log"
rm -f "$TSEECONFIG/log/dex-service.log"
rm -f "$TSEECONFIG/log/post-fs-data.log"
##END##

##EXTRACT MODULE FILES##
print_cn "- 提取模块文件"
print_en "- Extracting module files"
for FILE in $FILES; do
  extract "$ZIPFILE" "$FILE" "$MODPATH"
done
mkdir -p "$SD"
cp -f "$MODPATH/lib/state.sh" "$SD/.tsee_state.sh"
[[ ! "$APATCH" && ! "$KSU" ]] && {
  pm path com.dergoogler.mmrl.wx > /dev/null 2>&1 || pm path io.github.a13e300.ksuwebui > /dev/null 2>&1 || {
    print_cn "- 安装 WebUI 软件"
    print_en "- install WebUI Sortware"
    pm install "$MODPATH/webui.apk" > /dev/null 2>&1
  }
}
##END##

##POST PROCESS##
print_cn "- 赋予必要权限"
print_en "- Setting permission"
chcon u:object_r:shell_data_file:s0 "$MODPATH/service.apk"
for NE in $NES; do
  chmod +x "$NE"
done
[ -f "$KEYBOX" ] && {
  print_cn "- 备份密钥文件"
  print_en "- Backup keybox file"
  rm -rf "$BACKUP"
  mkdir -p "$BACKUP"
  mv "$KEYBOX" "$BACKUP"
}
mkdir -p "$TSCONFIG"
mkdir -p "$TSEECONFIG/log"
print_cn "- 提取密钥文件"
print_en "- Extract keybox file"
extract "$ZIPFILE" 'keybox.xml' "$TSEECONFIG"
cp -f "$TSEECONFIG/keybox.xml" "$KEYBOX"
[ ! -f "$TSEECONFIG/usr.txt" ] || [ ! -f "$TSEECONFIG/sys.txt" ] && {
  print_cn "- 创建排除列表"
  print_en "- Extract default exclusion list"
  [ ! -f "$TSEECONFIG/sys.txt" ] && {
    touch "$TSEECONFIG/sys.txt"
    echo "$SYS" | awk '
      NF {
          lines[++n] = $0
      }
      END {
          for (i = 1; i <= n; i++) {
              printf "%s", lines[i]
              if (i < n)
                  printf "\n"
          }
      }
    ' > "$TSEECONFIG/sys.txt"
  }
  [ ! -f "$TSEECONFIG/usr.txt" ] && {
    touch "$TSEECONFIG/usr.txt"
    echo "$USR" | awk '
      NF {
          lines[++n] = $0
      }
      END {
          for (i = 1; i <= n; i++) {
              printf "%s", lines[i]
              if (i < n)
                  printf "\n"
          }
      }
    ' > "$TSEECONFIG/usr.txt"
  }
}
[[ "$(grep_get_prop ro.product.brand)" == "OnePlus" ]] && { grep -qx "com.oplus.engineermode" "$TSEECONFIG/sys.txt" || printf "\n%s" "com.oplus.engineermode" >> "$TSEECONFIG/sys.txt"; }
print_cn "- 获取包名添加"
print_en "- Getting package list & adding target"
{ pm list packages -3 | sed 's/^package://' | grep -vFf "$TSEECONFIG/usr.txt" ; cat "$TSEECONFIG/sys.txt"; } > "$TSCONFIG/target.txt"
##END##

##CONFLICT CHECK##
#MODULES#
print_cn "- 检查冲突模块"
print_en "- Checking conflicts module"
if [[ -f "$ADB/ap/modules.img" || -f "$ADB/ksu/modules.img" ]]; then
  for MODULE in $CONFLICT; do
    [ -d "$MODULESDIR/$MODULE" ] && {
      conflictdes_all
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
      [ -f $MODULESDIR/$MODULE/update ] && {
        functions_cn WAY="两次重新启动后被移除."
        functions_en WAY="after two reboots."
      }
      conflictdes_all
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
#APPS#
print_cn "- 检查冲突软件"
print_en "- Checking conflicts software"
for PACKAGE in $APPCONFLICT; do
  pm path $PACKAGE > /dev/null 2>&1 && {
    pm uninstall $PACKAGE > /dev/null 2>&1
    APPDETECTED=$((APPDETECTED + 1))
  }
done
if [ $APPDETECTED -gt 0 ]; then
  print_cn "- 发现$APPDETECTED个冲突软件,已强制卸载"
  print_en "- Detected $APPDETECTED conflicting software, Forced uninstalled"
elif [ $APPDETECTED -eq 0 ]; then
  print_cn "- 未发现冲突软件"
  print_en "- No conflict software found"
fi
##END##

print_cn "- 安装完毕"
print_en "- Install Done"
