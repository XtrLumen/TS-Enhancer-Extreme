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

cd ${0%/*}
source "./script/util_functions.sh"
$TSEEBIN/tseed --rootdetect
check

invoke "移除冲突模块" "--conflictmodcheck"
[ -f "$SD/$D" ] || {
  logp "I" "复制状态检测脚本到自启文件夹"
  mkdir -p "$SD"
  cp -f "$TSEEMODDIR/sh/state.sh" "$SD/$D"
  chmod +x "$SD/$D"
}