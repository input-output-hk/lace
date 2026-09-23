import type { AccountId } from '@lace-contract/wallet-repo';

// =====================================================================
// cNIGHT DUST designation index.
// =====================================================================
// A read model answering "does this account have a DUST designation, and
// where does it point?". The answer lives at the dust-generator script
// address, not in the account's own UTxO set, so no amount of account
// syncing surfaces it — a side-effect has to scan the script address and
// match each inline `DustMappingDatum` against the account's stake key.
//
// Refreshed ON DEMAND (`refreshRequested`) and once a designation
// transaction confirms, never polled: the script address holds thousands
// of UTxOs on mainnet, and a designation only changes when this wallet
// changes it.
//
// The index is transient — deliberately not persisted. A stale "not
// designated" is the dangerous answer (it invites a second designate for
// an account that already has one), and a snapshot restored from disk has
// no way to know how far behind the chain it is.
// =====================================================================

export type NightDesignationRegistration = {
  /** The registration UTxO at the dust-generator script address. */
  txId: string;
  outputIndex: number;
  /**
   * 32-byte Midnight coin public key the designation points DUST
   * generation at, read from the registration's inline datum.
   */
  dustPubkeyHex: string;
};

export type NightDesignationSnapshot = {
  /** Absent when the account holds no designation on this network. */
  registration?: NightDesignationRegistration;
  /**
   * Whether the validator's own reward account is registered on-chain, or
   * `undefined` when the probe could not answer.
   *
   * Changing a designation withdraws from it to re-authorise the script, and
   * Conway rejects a withdrawal — even a zero one — from an unregistered
   * reward account. Registering it is an operator action, so `false` means
   * "designations can be created and removed here, but not changed" until
   * that lands.
   *
   * `undefined` is UNKNOWN and is never a synonym for `false`: the provider
   * answers a never-seen reward account with a registered-`false` result, so
   * a failed probe is transport, which a retry clears. Reporting it as `false`
   * would tell the user to stop generating and designate again — two
   * transactions, two fees and a DUST generation gap. Consumers must test
   * `=== false` / `!== true` explicitly rather than reading it as a boolean.
   */
  scriptStakeCredentialRegistered: boolean | undefined;
};

export type NightDesignationIndexEntry = {
  /** The last completed read; absent until the first refresh succeeds. */
  snapshot?: NightDesignationSnapshot;
  refreshing: boolean;
  /** Set when the last refresh failed; cleared by the next success. */
  failed: boolean;
  /**
   * A designation transaction submitted from this wallet that the chain has
   * not shown yet, by transaction id.
   *
   * While this is set `snapshot` describes the state BEFORE that transaction
   * and cannot be read as the account's designation: the script address only
   * answers for what has confirmed. No scan clears it — only the side-effect
   * watching that transaction's activity does, once it settles.
   */
  settling?: { txId: string };
};

export type NightDesignationIndexSliceState = {
  /**
   * Keyed by account, which per ADR 11 is network-specific — so an entry
   * can never describe the wrong network, and switching networks selects a
   * different set of accounts rather than invalidating these.
   */
  byAccount: Partial<Record<AccountId, NightDesignationIndexEntry>>;
};
