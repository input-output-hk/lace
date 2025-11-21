#!/bin/bash

EXTENSION_DIR=../../apps/browser-extension-wallet
EXTENSION_BUILD_DIR="$EXTENSION_DIR/dist"
SAFARI_EXTENSION_OUTPUT_RELATIVE_PATH=./wallet-extension-safari-build
SAFARI_BUILT_EXTENSION_DIR="$SAFARI_EXTENSION_OUTPUT_RELATIVE_PATH/extension-build"
SAFARI_DEBUG_BUILD_PATH="$SAFARI_BUILT_EXTENSION_DIR/Build/Products/Release"

if [ ! -d $EXTENSION_BUILD_DIR ]; then
  echo "Could not find web extension build. Please build extension first"
  exit
fi

xcrun safari-web-extension-converter $EXTENSION_BUILD_DIR --no-prompt --copy-resources --no-open --project-location $SAFARI_EXTENSION_OUTPUT_RELATIVE_PATH --bundle-identifier io.lace.Lace

cd "$SAFARI_EXTENSION_OUTPUT_RELATIVE_PATH/Lace"

xcodebuild -configuration Release -scheme "Lace (macOS)" -derivedDataPath $SAFARI_BUILT_EXTENSION_DIR
