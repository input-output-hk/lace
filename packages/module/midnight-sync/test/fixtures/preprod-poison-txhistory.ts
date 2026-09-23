// Real `unshieldedTxHistory` blob captured from a Lace 2.0.6 -> 2.1.0 upgrade that
// bricked a Midnight account on preprod (LW-15118).
//
// Written by @midnight-ntwrk/wallet-sdk-unshielded-wallet@2.1.0, whose
// InMemoryTransactionHistoryStorage.serialize() encodes the history Map via
// Effect Schema.Map -> an array of [hash, entry] TUPLES with FLAT
// createdUtxos/spentUtxos. The 2.1.0 app bundles @3.0.0, which expects an array
// of OBJECTS with a nested `unshielded` domain, so restore() throws a ParseError.
//
// This is the exact decoded string passed to InMemoryTransactionHistoryStorage.restore
// (i.e. HexBytes.toUTF8(serializedState.unshieldedTxHistory)). Transaction data only
// (hashes, values, addresses) -- contains no keys or secrets.

export const PREPROD_POISON_TX_HISTORY =
  '[["07d29d4face3876b15c96afdd75dffff0cfc8190668ac4040ace60441409dd48",{"id":10753,"hash":"07d29d4face3876b15c96afdd75dffff0cfc8190668ac4040ace60441409dd48","protocolVersion":22000,"identifiers":["001fa449e94ac44a568c4d521f605b0bbcf3e100f595fcddb8b0d068f2d6e8761c","00f4bb682e9d26ff5d92ad1c921fb28fc4422bc8ba51bda4b188242f778724a587"],"timestamp":"2026-04-02T06:44:42.000Z","fees":"1","status":"SUCCESS","createdUtxos":[{"value":"1000000000","owner":"mn_addr_preprod1nqhdatus5d6tvye57q854kdrs6ur2ytsl8yaygzfsdy2e3tvtmeshrjlk2","tokenType":"0000000000000000000000000000000000000000000000000000000000000000","intentHash":"642ba871c0073fa4f966e82479a4595087f5380c1f726d5af3eda3057faa3d70","outputIndex":0},{"value":"1000000000","owner":"mn_addr_preprod1nqhdatus5d6tvye57q854kdrs6ur2ytsl8yaygzfsdy2e3tvtmeshrjlk2","tokenType":"0000000000000000000000000000000000000000000000000000000000000000","intentHash":"95730d4d7571656503609e61c22c9e8b4b636e27bcc11772110a56ca5d61989a","outputIndex":0}],"spentUtxos":[{"value":"1000000000","owner":"mn_addr_preprod1nqhdatus5d6tvye57q854kdrs6ur2ytsl8yaygzfsdy2e3tvtmeshrjlk2","tokenType":"0000000000000000000000000000000000000000000000000000000000000000","intentHash":"1e92b3ba408f749147fce16fc3d9f626e8548d6abc280add493f06a664ebe8dc","outputIndex":0},{"value":"1000000","owner":"mn_addr_preprod1nqhdatus5d6tvye57q854kdrs6ur2ytsl8yaygzfsdy2e3tvtmeshrjlk2","tokenType":"0000000000000000000000000000000000000000000000000000000000000000","intentHash":"ddf40c3bb0bda42481e8d6c8183bb0fb7d4cb5925dcea7f386d262a0e3f077e8","outputIndex":0},{"value":"999000000","owner":"mn_addr_preprod1nqhdatus5d6tvye57q854kdrs6ur2ytsl8yaygzfsdy2e3tvtmeshrjlk2","tokenType":"0000000000000000000000000000000000000000000000000000000000000000","intentHash":"651c407785f4223be66234210533bc05e48add89e97dcd0bd2ef4f708bd06a0e","outputIndex":1}]}]]';
