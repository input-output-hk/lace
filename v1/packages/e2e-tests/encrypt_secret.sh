#!/bin/sh

FILE_LOCATION=./src/support
DECRYPTED_FILE="$FILE_LOCATION/walletConfiguration.ts"

if [ -z "${WALLET_1_PASSWORD}" ]; then
  echo "WALLET_1_PASSWORD environment variable is not set, aborting"
  exit 1
fi

gpg --symmetric --cipher-algo AES256 --batch --passphrase "$WALLET_1_PASSWORD" $DECRYPTED_FILE
