#!/usr/bin/env bash
set -e

outDir=$1;

regex="\"name\": \"\([^\",]*\)"
packageName=$(grep -o "$regex" $PWD/package.json | sed "s/$regex/\1/")

# switching directories help webpack to correctly detect change in the dependent workspace
rm -rf $outDir || true
mv $outDir-next $outDir
echo $packageName built successfully!
