import { WalletType } from '@lace-contract/wallet-repo';

import { withDeviceHint } from './device-hint';

import type { AccountXpubSource } from './scan-active-accounts';
import type { SideEffect } from '../..';
import type { PendingHwDestination } from '../slice';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { CardanoBip32AccountProps } from '@lace-contract/cardano-context';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { HwAccountConnector } from '@lace-contract/onboarding-v2';
import type {
  AnyWallet,
  HardwareWalletAccount,
} from '@lace-contract/wallet-repo';

type Dependencies = Parameters<SideEffect>[2];

/**
 * Addon key per hardware family with a per-index account export. The
 * air-gapped families have no entry — their accounts come from the paired QR
 * payload, there is no device round-trip to export another index — so an
 * air-gapped source scans account 0 only, exactly like a script wallet.
 *
 * Loaded optimistically rather than declared as contract dependencies: the
 * vault modules are feature-flag gated, and depending on their contracts would
 * stop the migration module loading whenever a vault flag is off (the
 * earnRewardsStoreContract lesson). An absent addon degrades to account 0.
 */
const CONNECTOR_ADDON_BY_WALLET_TYPE: Partial<
  Record<
    WalletType,
    | 'addons.loadLedgerHwAccountConnector'
    | 'addons.loadTrezorHwAccountConnector'
  >
> = {
  [WalletType.HardwareLedger]: 'addons.loadLedgerHwAccountConnector',
  [WalletType.HardwareTrezor]: 'addons.loadTrezorHwAccountConnector',
};

export type DeviceAccountSource = {
  xpubForIndex: AccountXpubSource;
  /**
   * The full account entities a probe produced (cached — no second device
   * round-trip), for merging into the source wallet entry so the signer
   * factory can sign for them at sweep time.
   */
  accountsForIndex: (accountIndex: number) => HardwareWalletAccount[];
  /**
   * The exact indexes to probe, when they are known up front (a loaded wallet
   * lists them). Absent for a device probe, which has to walk indexes because
   * only the device knows what exists.
   */
  knownAccountIndexes?: number[];
};

/**
 * Builds a device-backed account prober for a hardware source. Each first
 * probe of an index is an on-device xpub export (one approval per index,
 * device settings permitting). Returns undefined when the family has no
 * per-index export or no connector serves the blockchain, which limits the
 * scan to account 0.
 */
/**
 * An account source backed by a LOADED wallet's own account entities: xpubs
 * are read off the wallet, never a device — so a loaded hardware source scans
 * the accounts the user already added without any per-index device ceremony.
 * Indices beyond the loaded set resolve undefined (an unused probe), and
 * nothing is persisted: every account this serves is already on the wallet.
 */
export const makeLoadedWalletAccountSource = (
  wallet: AnyWallet,
  targetNetworkId: BlockchainNetworkId,
): DeviceAccountSource | undefined => {
  const byIndex = new Map(
    wallet.accounts
      .filter(
        account =>
          account.blockchainName === 'Cardano' &&
          account.blockchainNetworkId === targetNetworkId,
      )
      .map(account => [
        (account.blockchainSpecific as { accountIndex?: number })
          ?.accountIndex ?? 0,
        (
          account.blockchainSpecific as {
            extendedAccountPublicKey?: Bip32PublicKeyHex;
          }
        )?.extendedAccountPublicKey,
      ]),
  );
  // Probe exactly the loaded indexes, in order. Walking indexes with a gap
  // stop would drop a wallet holding #0 and #2: index 1 does not exist, and
  // one absent index ended the scan with #2's funds left behind.
  const knownAccountIndexes = [...byIndex.keys()]
    .filter(index => index >= 1)
    .sort((a, b) => a - b);
  // Nothing loaded beyond account 0: no probe loop to run at all, so the
  // scan takes its synchronous account-0-only path.
  if (knownAccountIndexes.length === 0) return undefined;
  return {
    xpubForIndex: async accountIndex => byIndex.get(accountIndex),
    accountsForIndex: () => [],
    knownAccountIndexes,
  };
};

export const makeDeviceAccountSource = async (
  {
    wallet,
    hwSource,
    targetNetworkId,
  }: {
    wallet: AnyWallet;
    hwSource: PendingHwDestination;
    targetNetworkId: BlockchainNetworkId;
  },
  dependencies: Pick<Dependencies, '__getState' | 'loadModules'>,
): Promise<DeviceAccountSource | undefined> => {
  const addonKey = CONNECTOR_ADDON_BY_WALLET_TYPE[wallet.type];
  const { device } = hwSource;
  if (!addonKey || !device) return undefined;
  const connectors = (
    ((await dependencies.loadModules(addonKey)) ?? []) as HwAccountConnector[][]
  ).flat();
  const connector = connectors.find(
    candidate => candidate.blockchainName === hwSource.blockchainName,
  );
  if (!connector) return undefined;

  const cache = new Map<number, HardwareWalletAccount[]>();
  const probe = async (
    accountIndex: number,
  ): Promise<HardwareWalletAccount[]> => {
    const cached = cache.get(accountIndex);
    if (cached) return cached;
    // Tagged as the device's on the way out: the only call here that talks to
    // hardware, so the only place that can say so (see `withDeviceHint`).
    // Hint-only tagging — the factory serves three callers, and only the
    // destination probe wants a fallback for failures no category names.
    const accounts = await connector
      .connectHardwareAccounts(dependencies.__getState(), {
        device,
        accountIndex,
        accountName: `Account #${accountIndex}`,
        derivationType: hwSource.derivationType,
        walletId: wallet.walletId,
        targetNetworks: new Set([targetNetworkId]),
      })
      .catch((error: unknown) => {
        throw withDeviceHint(error);
      });
    cache.set(accountIndex, accounts);
    return accounts;
  };

  return {
    /**
     * One export per index, and what that costs the user depends on the device's
     * settings — which is why nothing here or upstream should promise a prompt.
     *
     * Ledger's Shelley app (`policyForGetExtendedPublicKey`) reaches `ALLOW()`
     * for an ordinary Shelley account path — `1852'/1815'/N'`, which is what
     * this asks for — and returns the key with no confirmation, deliberately:
     * "do not bother the user with confirmation --- required by LedgerLive to
     * improve UX". It DOES confirm when the device is in expert mode
     * (`PROMPT_IF(app_mode_expert())`), for a Byron-prefix path, or when the
     * account index is unreasonable. Trezor confirms more readily.
     *
     * So the reliable cost is a device round-trip: `getXpub` opens a transport
     * and closes it in a `finally` per call. Treat a confirmation as possible,
     * never as guaranteed.
     */
    xpubForIndex: async accountIndex => {
      const [account] = await probe(accountIndex);
      const xpub = (
        account?.blockchainSpecific as CardanoBip32AccountProps | undefined
      )?.extendedAccountPublicKey;
      if (!xpub) {
        throw new Error(
          `Device exported no account xpub for index ${accountIndex}`,
        );
      }
      return xpub;
    },
    accountsForIndex: accountIndex => cache.get(accountIndex) ?? [],
  };
};
