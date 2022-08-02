#!/usr/bin/bash

for path in db/*; do
  if [ -d "$path/config" ]; then
    echo "Migrating '$(basename "$path")' ..."
    (cd "$path" && sequelize-cli db:migrate)
  fi
done
