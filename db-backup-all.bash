#!/usr/bin/bash

timestamp=$(date +"%Y%m%d%H%M%S")

for path in data/*; do
  gamecode=$(basename "$path")

  [[ "$gamecode" =~ ^_ ]] && continue

  if [[ -f "$path/db.sqlite3" ]]; then
    echo "Backing up '$gamecode' ..."
    (
      cd "$path" || exit
      mkdir -p backup/
      sqlite3 db.sqlite3 ".dump" > "backup/$timestamp.sql"
    )
  fi
done
