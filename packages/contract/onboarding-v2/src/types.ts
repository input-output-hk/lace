import type { ComponentType } from 'react';

import type { State } from '@lace-contract/module';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type {
  HardwareWalletAccount,
  WalletEntity,
  WalletId,
  WalletType,
} from '@lace-contract/wallet-repo';
import type {
  AttemptCreateHardwareWalletPayload,
  DerivationType,
  DeviceDescriptor,
  HardwareDeviceBleFilter,
  HardwareDeviceUsbFilter,
  HardwareIntegrationId,
} from '@lace-lib/util-hw';
import type { UICustomisation } from '@lace-lib/util-render';
import type { BlockchainName } from '@lace-lib/util-store';

export type {
  AttemptCreateHardwareWalletPayload,
  DerivationType,
  DeviceDescriptor,
  HardwareDeviceBleFilter,
  HardwareDeviceUsbFilter,
  HardwareIntegrationId,
  HardwareVendorName,
} from '@lace-lib/util-hw';

/**
 * Payload for the attemptCreateHardwareWallet action. Carries the user-set
 * password so the service-worker side effect can bootstrap the vault master
 * password without reading it from Redux state (LW-14498).
 */
export interface AttemptCreateHardwareWalletActionPayload
  extends AttemptCreateHardwareWalletPayload {
  password: string;
}

/** Advertises that a hardware wallet type supports a specific blockchain. */
export interface HwBlockchainSupport {
  deviceOptionId: HardwareIntegrationId;
  walletType: WalletType;
  blockchainName: BlockchainName;
  /**
   * Who picks the account (index and network) when creating a wallet or adding
   * an account.
   *
   * - `'app'` (default): the UI offers account index selection and the
   *   connector honours the requested index and target networks.
   * - `'device'`: the device dictates the account and network (e.g. an
   *   air-gapped QR account-export where the user chooses on the device); the
   *   UI hides account index selection and the add-account flow validates the
   *   returned accounts against the target networks and existing accounts
   *   instead.
   */
  accountSelection?: 'app' | 'device';
  /**
   * Highest account index (inclusive) the device can derive for this
   * blockchain, when its firmware caps derivation below the app-wide default
   * (e.g. Keystone only derives Cardano accounts #0-#24). Unset means the
   * device imposes no limit and the app-wide default applies.
   */
  maxAccountIndex?: number;
}

export interface HardwareWalletDeviceMetadata {
  id: string;
  name: string;
  models: string[];
  logo?: 'Keystone' | 'Ledger' | 'SeedSigner' | 'Trezor';
}

/** Props for creating a hardware wallet via {@link HwWalletConnector}. */
export interface CreateHardwareWalletProps {
  blockchainName: BlockchainName;
  /** Undefined for air-gapped devices (no USB/BLE); the connector derives identity from the QR account-export. */
  device?: DeviceDescriptor;
  accountIndex: number;
  derivationType?: DerivationType;
}

/** Props for adding an account to an existing hardware wallet via {@link HwWalletConnector}. */
export interface AddHwWalletAccountProps {
  walletId: WalletId;
  blockchainName: BlockchainName;
  /** Undefined for v1 wallets whose IDs lack device info — connector resolves from USB device list. */
  device?: DeviceDescriptor;
  accountIndex: number;
  accountName: string;
  derivationType?: DerivationType;
  targetNetworks: Set<BlockchainNetworkId>;
}

/** Props passed to a blockchain-specific hw account connector addon. */
export interface HwAccountsConnectorProps {
  walletId: WalletId;
  device: DeviceDescriptor;
  accountIndex: number;
  accountName: string;
  derivationType?: DerivationType;
  /**
   * Accounts are built only for these network ids (each must be Lace-supported).
   */
  targetNetworks: Set<BlockchainNetworkId>;
}

/**
 * Blockchain-specific hardware account connector loaded via addon.
 * Retrieves keys from hardware device and creates account-level data.
 * The {@link HwWalletConnector} owns wallet identity and wraps the result
 * into a full wallet entity.
 */
export interface HwAccountConnector {
  blockchainName: BlockchainName;
  connectHardwareAccounts: (
    state: State,
    props: HwAccountsConnectorProps,
  ) => Promise<HardwareWalletAccount[]>;
}

export interface SoftwareOnboardingOption {
  id: string;
  isHwDevice?: false;
}

export interface HardwareOnboardingOption {
  id: HardwareIntegrationId;
  walletType: WalletType;
  isHwDevice: true;
  device: HardwareWalletDeviceMetadata;
  usbFilters?: HardwareDeviceUsbFilter[];
  bleFilters?: HardwareDeviceBleFilter[];
  /** If provided, show derivation type selector in setup step. */
  derivationTypes?: DerivationType[];
  /**
   * Air-gapped device (no USB/BLE transport): onboarding skips the device scan
   * and goes straight to password setup and the QR account-export exchange.
   */
  isAirGapped?: boolean;
}

/** Hardware wallet operations that run in side effects (service worker). */
export interface HwWalletConnector {
  id: HardwareIntegrationId;
  /**
   * Additional onboarding option ids this connector serves, beyond {@link id}.
   * A device that exposes one tile per blockchain (each with its own option id)
   * lists every served option id here so the create-by-id resolvers match it.
   * Optional and defaults to just {@link id}, so connectors serving a single
   * option may omit it.
   */
  optionIds?: HardwareIntegrationId[];
  walletType: WalletType;
  createWallet: (
    state: State,
    props: CreateHardwareWalletProps,
  ) => Promise<WalletEntity>;
  connectAccount: (
    state: State,
    props: AddHwWalletAccountProps,
  ) => Promise<HardwareWalletAccount[]>;
}

export type OnboardingOption =
  | HardwareOnboardingOption
  | SoftwareOnboardingOption;

export type OnboardingStartWalletDropdownUICustomisation = UICustomisation<{
  WalletDropdown: ComponentType;
}>;

export type OnboardingConfig = {
  redirectToOnboardingWhenLastWalletRemoved: boolean;
};
