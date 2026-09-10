/**
 * @vitest-environment jsdom
 */
import { WalletType } from '@lace-contract/wallet-repo';
import { HardwareIntegrationId } from '@lace-lib/util-hw';
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOnboardingHardwareWallet } from '../../../src/pages/OnboardingHardwareWallet/useOnboardingHardwareWallet';

import type {
  HardwareOnboardingOption,
  HwBlockchainSupport,
} from '@lace-contract/onboarding-v2';
import type { StackRoutes, StackScreenProps } from '@lace-lib/navigation';
import type { DeviceDescriptor } from '@lace-lib/util-hw';
import type { BlockchainName } from '@lace-lib/util-store';

type PickerProps = {
  onDeviceMatched: (
    option: HardwareOnboardingOption,
    device: DeviceDescriptor,
  ) => void;
  onAirGappedSelected: (option: HardwareOnboardingOption) => void;
};

const mocks = vi.hoisted(() => ({
  useLoadModules: vi.fn(),
  trackEvent: vi.fn(),
  pickerProps: { current: undefined as PickerProps | undefined },
  pickerHandleConnect: vi.fn(),
  pickerHandleSelectDevice: vi.fn(),
}));

vi.mock('../../../src/hooks', () => ({
  useLoadModules: mocks.useLoadModules,
}));

vi.mock('@lace-contract/analytics', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAnalytics: () => ({ trackEvent: mocks.trackEvent }),
}));

vi.mock('@lace-contract/i18n', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@lace-lib/navigation', () => ({
  StackRoutes: { OnboardingDesktopLogin: 'OnboardingDesktopLogin' },
}));

vi.mock('@lace-lib/ui-toolkit', () => ({
  useTheme: () => ({ theme: {} }),
}));

vi.mock('@lace-lib/util-hw/extension-ui', async importOriginal => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useHwWalletDevicePicker: (props: PickerProps) => {
      mocks.pickerProps.current = props;
      return {
        supportedDevices: [],
        handleConnect: mocks.pickerHandleConnect,
        handleSelectDevice: mocks.pickerHandleSelectDevice,
        isConnecting: false,
        error: null,
      };
    },
  };
});

const CARDANO_OPTION_ID = HardwareIntegrationId('seed-signer');
const BITCOIN_OPTION_ID = HardwareIntegrationId('seed-signer-bitcoin');
const LEDGER_OPTION_ID = HardwareIntegrationId('ledger');

const usbDevice: DeviceDescriptor = {
  kind: 'usb',
  vendorId: 0x2c97,
  productId: 0x0001,
  serialNumber: null,
};

const ledgerOption: HardwareOnboardingOption = {
  id: LEDGER_OPTION_ID,
  walletType: WalletType.HardwareLedger,
  isHwDevice: true,
  device: { id: 'ledger', name: 'Ledger', models: ['Nano X'] },
  derivationTypes: ['ICARUS', 'LEDGER'],
};

const seedSignerOption: HardwareOnboardingOption = {
  id: CARDANO_OPTION_ID,
  walletType: WalletType.HardwareSeedSigner,
  isHwDevice: true,
  device: { id: 'seed-signer', name: 'SeedSigner', models: ['SeedSigner'] },
  isAirGapped: true,
};

const ledgerSupport: HwBlockchainSupport[][] = [
  [
    {
      deviceOptionId: LEDGER_OPTION_ID,
      walletType: WalletType.HardwareLedger,
      blockchainName: 'Cardano' as BlockchainName,
    },
  ],
];

const seedSignerSupport: HwBlockchainSupport[][] = [
  [
    {
      deviceOptionId: CARDANO_OPTION_ID,
      walletType: WalletType.HardwareSeedSigner,
      blockchainName: 'Cardano' as BlockchainName,
    },
    {
      deviceOptionId: BITCOIN_OPTION_ID,
      walletType: WalletType.HardwareSeedSigner,
      blockchainName: 'Bitcoin' as BlockchainName,
      accountSelection: 'device',
    },
  ],
];

const renderWallet = (support: HwBlockchainSupport[][] | undefined) => {
  mocks.useLoadModules.mockImplementation((name: string) =>
    name === 'addons.loadHwBlockchainSupport' ? support : undefined,
  );
  const navigation = { navigate: vi.fn(), goBack: vi.fn() };
  const rendered = renderHook(() =>
    useOnboardingHardwareWallet({
      navigation,
    } as unknown as StackScreenProps<StackRoutes.OnboardingHardware>),
  );
  return { navigation, ...rendered };
};

describe('useOnboardingHardwareWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pickerProps.current = undefined;
  });

  describe('USB-matched devices', () => {
    it('proceeds to setup with the single supported blockchain and the device', () => {
      const { navigation } = renderWallet(ledgerSupport);

      act(() => {
        mocks.pickerProps.current?.onDeviceMatched(ledgerOption, usbDevice);
      });

      expect(navigation.navigate).toHaveBeenCalledWith(
        'OnboardingDesktopLogin',
        {
          hardwareSetup: {
            optionId: LEDGER_OPTION_ID,
            blockchainName: 'Cardano',
            walletType: WalletType.HardwareLedger,
            device: usbDevice,
            derivationTypes: ['ICARUS', 'LEDGER'],
          },
        },
      );
    });

    it('shows the blockchain chooser when several blockchains are supported and keeps the device', () => {
      const { navigation, result } = renderWallet(seedSignerSupport);
      const usbSeedSignerOption = { ...seedSignerOption, isAirGapped: false };

      act(() => {
        mocks.pickerProps.current?.onDeviceMatched(
          usbSeedSignerOption,
          usbDevice,
        );
      });

      expect(navigation.navigate).not.toHaveBeenCalled();
      expect(
        result.current.supportedDevices.map(device => device.name),
      ).toEqual(['Cardano', 'Bitcoin']);

      act(() => {
        result.current.onSelectDevice(BITCOIN_OPTION_ID);
      });

      expect(navigation.navigate).toHaveBeenCalledWith(
        'OnboardingDesktopLogin',
        {
          hardwareSetup: {
            optionId: BITCOIN_OPTION_ID,
            blockchainName: 'Bitcoin',
            walletType: WalletType.HardwareSeedSigner,
            device: usbDevice,
            derivationTypes: undefined,
          },
        },
      );
    });

    it('does not proceed while the blockchain support addons are still loading', () => {
      const { navigation } = renderWallet(undefined);

      act(() => {
        mocks.pickerProps.current?.onDeviceMatched(ledgerOption, usbDevice);
      });

      expect(navigation.navigate).not.toHaveBeenCalled();
    });

    it('does not start a scan while the blockchain support addons are still loading', () => {
      const { result } = renderWallet(undefined);

      act(() => {
        result.current.onConnect();
        result.current.onSelectDevice('ledger');
      });

      expect(mocks.pickerHandleConnect).not.toHaveBeenCalled();
      expect(mocks.pickerHandleSelectDevice).not.toHaveBeenCalled();
    });

    it('starts a scan once the blockchain support addons resolved', () => {
      const { result } = renderWallet(ledgerSupport);

      act(() => {
        result.current.onConnect();
        result.current.onSelectDevice('ledger');
      });

      expect(mocks.pickerHandleConnect).toHaveBeenCalledTimes(1);
      expect(mocks.pickerHandleSelectDevice).toHaveBeenCalledWith('ledger');
    });
  });

  describe('air-gapped devices', () => {
    it('shows the blockchain chooser and proceeds without a device', () => {
      const { navigation, result } = renderWallet(seedSignerSupport);

      act(() => {
        mocks.pickerProps.current?.onAirGappedSelected(seedSignerOption);
      });

      expect(navigation.navigate).not.toHaveBeenCalled();

      act(() => {
        result.current.onSelectDevice(CARDANO_OPTION_ID);
      });

      expect(navigation.navigate).toHaveBeenCalledWith(
        'OnboardingDesktopLogin',
        {
          hardwareSetup: {
            optionId: CARDANO_OPTION_ID,
            blockchainName: 'Cardano',
            walletType: WalletType.HardwareSeedSigner,
            device: undefined,
            derivationTypes: undefined,
          },
        },
      );
    });

    it('proceeds directly when only one blockchain is supported', () => {
      const { navigation } = renderWallet(ledgerSupport);

      act(() => {
        mocks.pickerProps.current?.onAirGappedSelected({
          ...ledgerOption,
          isAirGapped: true,
        });
      });

      expect(navigation.navigate).toHaveBeenCalledWith(
        'OnboardingDesktopLogin',
        {
          hardwareSetup: {
            optionId: LEDGER_OPTION_ID,
            blockchainName: 'Cardano',
            walletType: WalletType.HardwareLedger,
            device: undefined,
            derivationTypes: ['ICARUS', 'LEDGER'],
          },
        },
      );
    });
  });
});
