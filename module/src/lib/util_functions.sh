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

##VARIABLE##
#ALIAS#
TS="tricky_store"
TSEE="ts_enhancer_extreme"
S="service.sh"
D=".tsee_state.sh"
P="post-fs-data.sh"
#ZERO LEVEL#
ADB="/data/adb"
#ONE LEVEL#
MODULESDIR="$ADB/modules"
TSEECONFIG="$ADB/$TSEE"
SD="$ADB/service.d"
#TWO LEVEL#
TSEEMODDIR="$MODULESDIR/$TSEE"
TSMODDIR="$MODULESDIR/$TS"
#THREE LEVEL#
MULTIPLETYPE="$TSEECONFIG/multiple.txt"
KERNELTYPE="$TSEECONFIG/kernel.txt"
TSEELOG="$TSEECONFIG/log/log.log"
TSEEBIN="$TSEEMODDIR/bin"
TYPE="$TSEECONFIG/root.txt"
#OTHER#
ORIGIN=$(basename "$0")
##END##

##FUNCTIONS##
#MULTILINGUAL#
[[ "$(getprop persist.sys.locale)" == *"zh"* || "$(getprop ro.product.locale)" == *"zh"* ]] && LOCALE="CN" || LOCALE="EN"
println() {
  [ "$LOCALE" = "$1" ] && {
    shift
    if [ "$1" = "-n" ]; then
      shift
      echo -n "$@"
    else
      echo "$@"
    fi
  }
}
echo_cn() { println "CN" "$@"; }
echo_en() { println "EN" "$@"; }
#OTHER#
logout() { echo "$(date "+%m-%d %H:%M:%S.$(date +%3N)")  $$  $$ $1 System.out: [TSEE]$2" >> "$TSEELOG"; }
logs() { logout "$1" "<Service>$2"; }
logd() { logout "$1" "<Service.D>$2"; }
logp() { logout "$1" "<Post-Fs-Data>$2"; }
invoke() {
  case "$ORIGIN" in
    *"$S"*)
      class="logs"
      ;;
    *"$P"*)
      class="logp"
      ;;
    *"$D"*)
      class="logd"
      ;;
  esac
  "$class" "I" "$1"
  if $TSEEBIN/tseed $2; then
    "$class" "I" "完毕"
  else
    "$class" "W" "失败"
  fi
}
check() {
  if [ "$(cat "$TYPE")" = "Multiple" ] || [ ! -d "$TSMODDIR" ] || [ -f "$TSMODDIR/disable" ] || sed -n '5p' "$TSMODDIR/module.prop" | grep -q -F "Enginex0"; then
    case "$ORIGIN" in
      *"$P"*)
        logp "E" "环境异常,拦截执行"
        rm -f "$TSMODDIR/action.sh"
        mv "$TSEEMODDIR/webroot" "$TSEEMODDIR/.webroot"
        mv "$TSEEMODDIR/action.sh" "$TSEEMODDIR/.action.sh"
        ;;
      *"$S"*)
        exit
        ;;
    esac
  else
    [[ "$ORIGIN" == *"$P"* ]] && {
      logp "I" "环境正常,继续执行"
      mv "$TSEEMODDIR/.webroot" "$TSEEMODDIR/webroot"
      ln -sf "$TSEEMODDIR/lib/action.sh" "$TSMODDIR/action.sh"
      if [[ ! "$APATCH" && ! "$KSU" ]]; then
        mv "$TSEEMODDIR/.action.sh" "$TSEEMODDIR/action.sh"
      else
        mv "$TSEEMODDIR/action.sh" "$TSEEMODDIR/.action.sh"
      fi
    }
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
initwait() {
  until [ $(getprop sys.boot_completed) -eq 1 ]; do
    sleep 1s
  done
}
##END##

[[ "$ORIGIN" == *"$P"* ]] && {
  rm -f "$MULTIPLETYPE"
  rm -f "$KERNELTYPE"
  rm -f "$TSEELOG"
  rm -f "$TYPE"
}