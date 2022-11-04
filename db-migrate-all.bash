#!/usr/bin/bash

for path in db/*; do
  gamecode=$(basename "$path")

  [[ "$gamecode" =~ ^_ ]] && continue

  if [[ -d "$path/config" ]]; then
    echo "Migrating '$gamecode' ..."
    (cd "$path" && sequelize-cli db:migrate)
    echo ""
  fi
done
