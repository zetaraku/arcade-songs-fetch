#!/usr/bin/bash

timestamp=$1

if [[ -z "$timestamp" ]]; then
  read -p "Enter the backup timestamp: " timestamp
fi

for path in data/*; do
  gamecode=$(basename "$path")

  (
    cd "$path" || exit

    if [[ ! -f "backup/$timestamp.sql" ]]; then
      echo "No backup found for '$gamecode'"
      exit 1
    fi

    if [[ -f "db.sqlite3" ]]; then
      echo "Cannot restore '$gamecode' (Database already exists.)"
      exit 2
    fi

    echo -n "Restoring '$gamecode' ..."
    sqlite3 "db.sqlite3" < "backup/$timestamp.sql"
    echo " OK"
  )
done
