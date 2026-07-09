import type { Cardano } from '@cardano-sdk/core';
import type { Bip32Ed25519, Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { LedgerKeyAgent } from '@cardano-sdk/hardware-ledger';
import type { KeyPurpose } from '@cardano-sdk/key-management';
import type { DeviceDescriptor } from '@lace-lib/util-hw';
import type { Logger } from 'ts-log';

/**
 * Per-platform Cardano-Ledger transport. Web addons construct WebUSB-backed
 * implementations; mobile addons construct BLE-backed ones. Encapsulates the
 * `CommunicationType.Web` SDK quirk on mobile (the Cardano SDK has no
 * dedicated BLE communication type, so both impls pass `Web` internally) so
 * cross-platform signing/onboarding code stays free of transport details.
 */
export interface LedgerCardanoTransport {
  /** Fetch the extended account public key from the device. Used during onboarding. */
  getXpub: (
    descriptor: DeviceDescriptor,
    accountIndex: number,
  ) => Promise<Bip32PublicKeyHex>;

  /**
   * Build a {@link LedgerKeyAgent} bound to the given device. Used by signers,
   * which already know the account's xpub and want to skip the onboarding
   * round-trip {@link LedgerKeyAgent.createWithDevice} would do.
   */
  createKeyAgent: (
    props: LedgerCardanoKeyAgentProps,
    dependencies: LedgerCardanoKeyAgentDependencies,
  ) => Promise<LedgerKeyAgent>;
}

export interface LedgerCardanoKeyAgentProps {
  descriptor: DeviceDescriptor;
  accountIndex: number;
  chainId: Cardano.ChainId;
  extendedAccountPublicKey: Bip32PublicKeyHex;
  purpose?: KeyPurpose;
}

export interface LedgerCardanoKeyAgentDependencies {
  bip32Ed25519: Bip32Ed25519;
  logger: Logger;
}
