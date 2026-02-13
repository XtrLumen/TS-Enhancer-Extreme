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
source "./lib/util_functions.sh"
check

logs "I" "启动后台服务"
$TSEEBIN/tseed --tseectl -start
initwait
[[ $($TSEEBIN/tseed --tseectl -state) == "true" ]] || logs "E" "服务启动失败"
invoke "更新目标文件" "--packagelistupdate"
invoke "卸载冲突软件" "--conflictappcheck"
invoke "同步安全补丁级别到属性" "--securitypatchpropsync"
invoke "伪装引导程序状态为锁定" "--passpropstate"
invoke "修正已验证启动哈希属性" "--passvbhash"