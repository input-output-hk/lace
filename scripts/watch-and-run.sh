#!/usr/bin/env bash
set -e

# coma separated paths e.g. src,lib
watchList=$1
script=$2
watchArgs=()

for i in $(echo "$watchList" | sed 's/,/ /g'); do
  watchArgs+=" --watch $i"
done

nodemon -q -e ts,tsx ${watchArgs[@]} -x $script
