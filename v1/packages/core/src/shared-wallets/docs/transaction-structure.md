# Transaction JSON Structure

## Problem

Shared wallet transactions would be coordinated by moving a JSON file between cosigners in a sequential format.
This JSON file would contain all the necessary information to broadcast, sign and eventually submit a transaction.

## Solution

This schema defines the structure of a transaction JSON file.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "description": "The transaction structure for shared wallet",
  "properties": {
    "version": {
      "type": "string",
      "description": "The version of the schema you are using",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "createdAt": {
          "type": "string",
          "format": "date-time",
          "description": "The date and time the transaction was created"
        },
        "note": {
          "type": "string",
          "description": "A note about the transaction"
        },
        "createdBy": {
          "type": "string",
          "description": "The public key of the creator of the transaction"
        },
        "chainId": {
          "type": "string",
          "description": "The CIP34 formatted chainId the transaction should be submitted to",
          "pattern": "^cip34:[01]-\\w+$"
        }
      },
      "required": ["createdAt", "createdBy", "chainId"]
    },
    "transaction": {
      "type": "object",
      "properties": {
        "cborHex": {
          "type": "string",
          "description": "This contains the CBOR for the transaction"
        }
      },
      "required": ["cborHex"]
    }
  },
  "required": ["version", "metadata", "transaction"],
  "additionalProperties": false
}
```

## Example

```js
const multsigTxData = {
  version: '1.0.0',
  metadata: {
    createdAt: '2023-09-29T14:00:00Z',
    note: 'Shared account transaction',
    createdBy: 'acct_shared_xvk1z8kc04y...',
    chainId: 'cip34:0-1',
  },
  transaction: {
    cborHex: '84a30081825820a0b16c2044cfa596ab3274fae8879d4c98d1dcd0539a95a96...',
  },
};
```
