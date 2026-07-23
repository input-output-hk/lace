import type {
  DerivationType,
  HardwareIntegrationId,
  HardwareOnboardingOption,
  HwBlockchainSupport,
  OnboardingOption,
} from './types';
import type { WalletType } from '@lace-contract/wallet-repo';
import type { BlockchainName } from '@lace-lib/util-store';

export const isHardwareOption = (
  option: OnboardingOption,
): option is HardwareOnboardingOption => option.isHwDevice === true;

type HwBlockchainSupportMatcher =
  | { optionId: HardwareIntegrationId }
  | { walletType: WalletType; blockchainName: BlockchainName };

const findHwBlockchainSupport = (
  hwBlockchainSupport: HwBlockchainSupport[][] | undefined,
  matcher: HwBlockchainSupportMatcher,
): HwBlockchainSupport | undefined =>
  hwBlockchainSupport
    ?.flat()
    .find(support =>
      'optionId' in matcher
        ? support.deviceOptionId === matcher.optionId
        : support.walletType === matcher.walletType &&
          support.blockchainName === matcher.blockchainName,
    );

/**
 * Resolves the blockchain a hardware onboarding option creates, from the loaded
 * hw-blockchain-support entries keyed by deviceOptionId. Returns undefined when
 * no entry matches so callers never silently guess a blockchain; the explicit
 * blockchain selection step is the source of truth for multi-blockchain
 * devices.
 */
export const getBlockchainNameForOptionId = (
  hwBlockchainSupport: HwBlockchainSupport[][] | undefined,
  optionId: HardwareIntegrationId,
): BlockchainName | undefined =>
  findHwBlockchainSupport(hwBlockchainSupport, { optionId })?.blockchainName;

/**
 * True when the matched hw-blockchain-support entry declares that the device
 * dictates account selection (accountSelection: 'device'). Matches by
 * onboarding option id or by walletType + blockchainName, depending on what
 * the caller has at hand. Defaults to false (app-side selection) when no
 * entry matches or the flag is unset.
 */
export const isDeviceAccountSelection = (
  hwBlockchainSupport: HwBlockchainSupport[][] | undefined,
  matcher: HwBlockchainSupportMatcher,
): boolean =>
  findHwBlockchainSupport(hwBlockchainSupport, matcher)?.accountSelection ===
  'device';

/**
 * Device-imposed highest account index (inclusive) from the matched
 * hw-blockchain-support entry. Undefined when no entry matches or the device
 * declares no limit, so callers fall back to the app-wide default.
 */
export const getMaxHwAccountIndex = (
  hwBlockchainSupport: HwBlockchainSupport[][] | undefined,
  matcher: HwBlockchainSupportMatcher,
): number | undefined =>
  findHwBlockchainSupport(hwBlockchainSupport, matcher)?.maxAccountIndex;

/**
 * Restricts a device's derivation-type choices to Cardano setups. Derivation
 * scheme selection (Icarus vs Ledger derivation on Trezor) is a Cardano key
 * derivation concept, so setups for any other blockchain receive undefined
 * regardless of what the device declares and never surface the picker.
 */
export const getDerivationTypesForBlockchain = (
  blockchainName: BlockchainName,
  derivationTypes: DerivationType[] | undefined,
): DerivationType[] | undefined =>
  blockchainName === 'Cardano' ? derivationTypes : undefined;

/**
 * Lists the blockchains a hardware wallet type supports, each paired with its
 * per-blockchain onboarding option id, from the loaded hw-blockchain-support
 * entries. Drives the blockchain selection step: the user's choice maps
 * deterministically to one entry, fixing both the option id and the blockchain.
 */
export const getHwBlockchainSupportForWalletType = (
  hwBlockchainSupport: HwBlockchainSupport[][] | undefined,
  walletType: WalletType,
): Array<{ blockchainName: BlockchainName; optionId: HardwareIntegrationId }> =>
  (hwBlockchainSupport?.flat() ?? [])
    .filter(support => support.walletType === walletType)
    .map(support => ({
      blockchainName: support.blockchainName,
      optionId: support.deviceOptionId,
    }));
