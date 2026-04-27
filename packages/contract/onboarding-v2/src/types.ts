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
  DerivationType,
  DeviceDescriptor,
  HardwareDeviceUsbFilter,
  HardwareIntegrationId,
} from '@lace-lib/util-hw';
import type { UICustomisation } from '@lace-lib/util-render';
import type { BlockchainName } from '@lace-lib/util-store';

export type {
  AttemptCreateHardwareWalletPayload,
  DerivationType,
  DeviceDescriptor,
  HardwareDeviceUsbFilter,
  HardwareIntegrationId,
} from '@lace-lib/util-hw';

/** Advertises that a hardware wallet type supports a specific blockchain. */
export interface HwBlockchainSupport {
  deviceOptionId: HardwareIntegrationId;
  walletType: WalletType;
  blockchainName: BlockchainName;
}

export interface HardwareWalletDeviceMetadata {
  id: string;
  name: string;
  models: string[];
  logo?: 'Ledger' | 'Trezor';
}

/** Props for creating a hardware wallet via {@link HwWalletConnector}. */
export interface CreateHardwareWalletProps {
  blockchainName: BlockchainName;
  device: DeviceDescriptor;
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
  /** If provided, show derivation type selector in setup step. */
  derivationTypes?: DerivationType[];
}

/** Hardware wallet operations that run in side effects (service worker). */
export interface HwWalletConnector {
  id: HardwareIntegrationId;
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
