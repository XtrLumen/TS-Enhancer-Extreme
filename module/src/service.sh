cd ${0%/*}
source "./libraries/util_functions.sh"
check

##INVOKE PARAMETERS##
invoke "调用后台服务启动参数" "--tseectl -start"
initwait
invoke "调用补丁时间同步参数" "--securitypatchpropsync"
invoke "调用冲突模块排除参数" "--conflictmodcheck -b"
invoke "调用包名列表更新参数" "--packagelistupdate"
invoke "调用冲突软件排除参数" "--conflictappcheck"
invoke "调用引导属性修正参数" "--passpropstate"
invoke "调用安全启动修正参数" "--passvbhash"
##END##