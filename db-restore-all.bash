#!/usr/bin/bash

timestamp=$1

if [ -z "$timestamp" ]; then
  echo "Usage: $0 <timestamp>"
  exit 1
fi

for path in data/*; do
  gamecode=$(basename $path)

  (
    cd "$path"

    if [ -f "db.sqlite3" ]; then
      echo "Cannot restore '$gamecode' (Database already exists.)"
      exit 1
    fi

    if [ -f "backup/$timestamp.sql" ]; then
      echo -n "Restoring '$gamecode' ..."
      sqlite3 "db.sqlite3" < "backup/$timestamp.sql"
      echo " OK"
    fi
  )
done
