import { Cardano, Serialization } from '@cardano-sdk/core';

const cred = (hash: string): Cardano.Credential => ({
  type: Cardano.CredentialType.KeyHash,
  hash: hash as never,
});

const baseAddress = (
  paymentHash: string,
  stakeHash: string,
): Cardano.PaymentAddress =>
  Cardano.BaseAddress.fromCredentials(
    Cardano.NetworkId.Testnet,
    cred(paymentHash),
    cred(stakeHash),
  )
    .toAddress()
    .toBech32() as Cardano.PaymentAddress;

const txId32 = (byte: string) => byte.repeat(32) as Cardano.TransactionId;

/** A wallet-owned address. */
export const WALLET_ADDRESS = baseAddress('aa'.repeat(28), 'bb'.repeat(28));

/** An address the wallet does not own. */
export const FOREIGN_ADDRESS = baseAddress('cc'.repeat(28), 'dd'.repeat(28));

/** The collateral input {@link CASE_B_TX} spends. */
export const OWN_COLLATERAL: Cardano.TxIn = { txId: txId32('ab'), index: 0 };

/** {@link OWN_COLLATERAL} as an ownership-authority entry. */
export const OWN_COLLATERAL_UTXO: Cardano.Utxo = [
  { ...OWN_COLLATERAL, address: WALLET_ADDRESS },
  { address: WALLET_ADDRESS, value: { coins: 5_000_000n } },
] as Cardano.Utxo;

/**
 * A case-(b) transaction: its only collateral input is {@link OWN_COLLATERAL}
 * and its collateral return pays {@link FOREIGN_ADDRESS}. The rule must block
 * it whenever {@link OWN_COLLATERAL_UTXO} is in the ownership authority.
 *
 * Only meaningful under `node`: the Cardano SDK's bech32 and CBOR paths fail
 * cross-realm `Uint8Array` checks under `jsdom`, so a jsdom suite cannot
 * decode a transaction at all. Every importer of this module runs under node.
 */
export const CASE_B_TX = Serialization.Transaction.fromCore({
  id: txId32('ef'),
  body: {
    inputs: [{ txId: txId32('cd'), index: 0 }],
    outputs: [{ address: WALLET_ADDRESS, value: { coins: 1_000_000n } }],
    fee: 170_000n,
    collaterals: [OWN_COLLATERAL],
    collateralReturn: {
      address: FOREIGN_ADDRESS,
      value: { coins: 5_000_000n },
    },
  },
  witness: { signatures: new Map() },
} as Cardano.Tx).toCbor();

/**
 * A real, decodable, collateral-free transaction: the rule allows it, so it
 * proves delegation to the wrapped signer without the ownership evaluation
 * getting in the way. The positive control for {@link CASE_B_TX}.
 */
export const NO_COLLATERAL_TX = Serialization.Transaction.fromCore({
  id: txId32('01'),
  body: {
    inputs: [{ txId: txId32('cd'), index: 0 }],
    outputs: [{ address: WALLET_ADDRESS, value: { coins: 1_000_000n } }],
    fee: 170_000n,
  },
  witness: { signatures: new Map() },
} as Cardano.Tx).toCbor();
