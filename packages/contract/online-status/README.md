# @lace-contract/online-status

Tracks device online/offline status in redux so any module can react to
connectivity changes via `selectIsOffline`.

This package contains:

- Redux slice with `isOffline` flag and `selectIsOffline` selector.
- `onlineStatusStoreContract` that registers the slice in the app's redux
  store.

The slice is populated by the UI layer, not by a side-effect — apps own
platform-specific connectivity detection and dispatch `setOffline` actions
themselves (browser extension reads `navigator.onLine`, mobile reads
`@react-native-community/netinfo`). MV3 service workers cannot reliably read
the inspected page's `navigator.onLine`, so detection must live where the UI
runs.
