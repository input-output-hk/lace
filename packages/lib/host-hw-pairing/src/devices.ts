import { WalletType } from '@lace-contract/wallet-repo';
import { HardwareIntegrationId } from '@lace-lib/util-hw';

import type {
  HardwareOnboardingOption,
  HardwareWalletDeviceMetadata,
  OnboardingOption,
} from '@lace-contract/onboarding-v2';
import type { HwDevice, HwPairBlockchain } from '@lace-contract/vault';

// The four devices the host can pair. Each tile's id IS the `HwDevice` the
// dispatch carries; `walletType` mirrors the monolith vault-* onboarding options.
// Models stay empty so the tile shows only the logo (Ledger/Trezor parity).
type HardwareDeviceTile = {
  device: HwDevice;
  walletType: WalletType;
  name: string;
  logo: 'Keystone' | 'Ledger' | 'SeedSigner' | 'Trezor';
};

const HARDWARE_DEVICE_TILES: readonly HardwareDeviceTile[] = [
  {
    device: 'ledger',
    walletType: WalletType.HardwareLedger,
    name: 'LEDGER',
    logo: 'Ledger',
  },
  {
    device: 'trezor',
    walletType: WalletType.HardwareTrezor,
    name: 'TREZOR',
    logo: 'Trezor',
  },
  {
    device: 'seed-signer',
    walletType: WalletType.HardwareSeedSigner,
    name: 'Seed Signer',
    logo: 'SeedSigner',
  },
  {
    device: 'keystone',
    walletType: WalletType.HardwareKeystone,
    name: 'Keystone',
    logo: 'Keystone',
  },
];

/** The device step's tiles. Shaped as `HardwareWalletDeviceMetadata` — the
 * blockchain-agnostic descriptor the onboarding options already carry — so a
 * picker renders it directly, with no presentation type in this package. */
export const SUPPORTED_DEVICES: HardwareWalletDeviceMetadata[] =
  HARDWARE_DEVICE_TILES.map(
    ({ device, name, logo }): HardwareWalletDeviceMetadata => ({
      id: device,
      name,
      models: [],
      logo,
    }),
  );

export const HARDWARE_ONBOARDING_OPTIONS: OnboardingOption[] =
  HARDWARE_DEVICE_TILES.map(
    ({ device, walletType, name, logo }): HardwareOnboardingOption => ({
      id: HardwareIntegrationId(device),
      walletType,
      isHwDevice: true,
      device: { id: device, name, models: [], logo },
    }),
  );

export const isHwDevice = (id: string): id is HwDevice =>
  id === 'keystone' ||
  id === 'ledger' ||
  id === 'seed-signer' ||
  id === 'trezor';

/** One (device, blockchain) pairing the host can run, named by the per-blockchain
 * option id the picker's blockchain step renders as a tile. */
type HwPairingChoice = {
  optionId: HardwareIntegrationId;
  device: HwDevice;
  blockchain: HwPairBlockchain;
};

/**
 * Which blockchains each device can be paired for. All four devices serve both
 * Cardano and Bitcoin, so the table is a flat fan — but it is a TABLE, not a
 * derived truth: the host's pairing modes are what actually decide, and a device
 * that gained or lost a chain there must be reflected here.
 *
 * The option ids mirror the monolith's per-blockchain ids (`{device}` for
 * Cardano, `{device}-bitcoin` for Bitcoin, `vault-*` module const.ts), which the
 * shared picker template turns into `hardware-wallet-device-select-{optionId}`
 * test ids. In the monolith these come from the `loadHwBlockchainSupport` addons
 * each vault-* module contributes; a guest holds no such modules, so the table
 * is hardcoded here beside the tile list it belongs to.
 */
const HW_PAIRING_CHOICES: readonly HwPairingChoice[] =
  HARDWARE_DEVICE_TILES.flatMap(({ device }): HwPairingChoice[] => [
    {
      optionId: HardwareIntegrationId(device),
      device,
      blockchain: 'Cardano',
    },
    {
      optionId: HardwareIntegrationId(`${device}-bitcoin`),
      device,
      blockchain: 'Bitcoin',
    },
  ]);

/** The pairings offered for `device` — the blockchain step's tiles. */
export const hwPairingChoicesFor = (
  device: HwDevice,
): readonly HwPairingChoice[] =>
  HW_PAIRING_CHOICES.filter(choice => choice.device === device);

/** The pairing an option id names, or undefined for an id from no tile. */
export const hwPairingChoiceOf = (
  optionId: string,
): HwPairingChoice | undefined =>
  HW_PAIRING_CHOICES.find(choice => choice.optionId === optionId);
