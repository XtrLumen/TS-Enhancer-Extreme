rm -rf /data/adb/ts_enhancer_extreme/
rm -f /data/adb/service.d/.tsee_state.sh
find /data/adb/service.d -empty -delete
rm -f /data/adb/modules/tricky_store/action.sh
if [ -d /data/adb/tricky_store ]; then
  mv /data/adb/tricky_store/config_backup /data/adb/tsconfig_backup
  rm -rf /data/adb/tricky_store/
  mv /data/adb/tsconfig_backup /data/adb/tricky_store
  if [ ! -f /data/adb/tricky_store/keybox.xml ]; then
    cat /data/adb/ts_enhancer_extreme/keybox.xml > /data/adb/tricky_store/keybox.xml
  fi
fi