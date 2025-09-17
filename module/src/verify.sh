TMPDIR_FOR_VERIFY="$TMPDIR/.vunzip"
mkdir -p "$TMPDIR_FOR_VERIFY"

abort_verify() {
  echo "***********************************************"
  echo "! $1"
  print_cn "! 这个ZIP文件已损坏,请重新下载"
  print_en "! This zip may be corrupted, please try downloading again"
  abort "***********************************************"
}

extract() {
  unpack() {
    local zip=$1
    local file=$2
    local dir=$3
    unzip -o "$zip" "$file" -d "$dir" >&2
    file_path="$dir/$file"
    if [ ! -f "$file_path" ]; then
      abort_cn "$file 不存在!"
      abort_en "$file not exists"
    fi
    unzip -o "$zip" "$file.sha256" -d "$TMPDIR_FOR_VERIFY" >&2
    hash_path="$TMPDIR_FOR_VERIFY/$file.sha256"
    if [ ! -f "$hash_path" ]; then
      abort_cn "$file.sha256 不存在!"
      abort_en "$file.sha256 not exists"
    fi
    if ! (echo "$(cat "$hash_path")  $file_path" | sha256sum -c -s -); then
      abort_cn "$file 被篡改!"
      abort_en "Failed to verify $file"
    fi
    print_cn "- $file 未篡改"
    print_en "- Verified $file" >&1
  }
  if [[ "$2" == */\* ]]; then
    for files in $(unzip -l "$1" "$2" | awk 'NR>3 {print $4}' | grep -v '\.sha256$' | grep -v '/$' | grep -v '^$'); do
      unpack "$1" "$files" "$3"
    done
  else
    unpack "$1" "$2" "$3"
  fi
}