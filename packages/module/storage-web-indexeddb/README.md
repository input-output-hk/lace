# @lace-module/storage-web-indexeddb

Data storage system for web, backed by raw IndexedDB (one database, one
key-value object store). Used by `lace-extension-guest`.

Uses `@lace-contract/storage` store classes by passing the storage-api-adapter which abstracts
over the API interaction. Provides the store dependencies required to fulfill the storage contract.
