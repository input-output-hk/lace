// =====================================================================
// Min-lovelace floor on the cNIGHT script output — hard floor.
// =====================================================================
// `buildNightDesignationTxBlueprint` computes the script output's
// min-utxo coin dynamically via `computeMinimumCoinQuantity` from
// `@cardano-sdk/tx-construction`, using the protocol's
// `coinsPerUtxoByte` parameter and the actual output shape (script
// address + one DUST-mapping NFT + inline DustMappingDatum). That
// dynamic value is what production txs use, so this constant is
// NOT the production value — it's a HARD FLOOR the builder never
// drops below.
//
// Why keep the floor at all:
//
//   - Cross-implementation byte equivalence with the reference dApp
//     (midnightntwrk/midnight-cnight-to-dust-dapp,
//     `src/config/transactionConstants.ts:8`). The dApp pins this
//     same number; matching it keeps Carbon's script outputs
//     byte-comparable to the dApp's, so the Midnight indexer
//     scanning the script address can recognise both
//     interchangeably.
//   - Robustness if `coinsPerUtxoByte` ever drops on a network —
//     the dynamic minimum would also drop, but the dApp's pin
//     wouldn't move. Holding the floor here keeps us aligned.
//
// The validator itself does NOT enforce a specific lovelace
// amount on the script output — it checks address, NFT presence /
// identity, and datum shape, but the coin field just has to clear
// the protocol min-utxo. So going above is always safe.
// =====================================================================
export const LOVELACE_FOR_REGISTRATION = 1_586_080n;
