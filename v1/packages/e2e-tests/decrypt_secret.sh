#!/bin/sh

FILE_LOCATION=./src/support
ENCRYPTED_FILE="$FILE_LOCATION/walletConfiguration.ts.gpg"
DECRYPTED_FILE="$FILE_LOCATION/walletConfiguration.ts"

if [ -z "${WALLET_1_PASSWORD}" ]; then
  echo "WALLET_1_PASSWORD environment variable is not set, aborting"
  exit 1
fi

# Decrypt the file
# --batch to prevent interactive command
# --yes to assume "yes" for questions
gpg --quiet --batch --yes --decrypt --passphrase="$WALLET_1_PASSWORD" --output $DECRYPTED_FILE $ENCRYPTED_FILE
