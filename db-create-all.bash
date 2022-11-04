#!/usr/bin/bash

for path in db/*; do
  gamecode=$(basename "$path")

  [[ "$gamecode" =~ ^_ ]] && continue

  if [[ -d "$path/config" ]]; then
    echo "Creating database for '$gamecode' ..."
    (cd "$path" && sequelize-cli db:create)
    echo ""
  fi
done
