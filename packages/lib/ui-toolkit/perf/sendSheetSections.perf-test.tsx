/**
 * Send-form section render costs: the pieces SendSheet composes on every
 * platform's send flow. The sections are plain components (the Sheet wrapper
 * belongs to the template), so they are measured standalone — with the REAL
 * formatRawToLocale per asset row via the util-render fidelity mock.
 */
import type React from 'react';

import { fireEvent, screen } from '@testing-library/react-native';
import noop from 'lodash/noop';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { measureRenders } from 'reassure';

import {
  AssetsSection,
  FeeSection,
  RecipientInput,
  SummarySection,
  useTheme,
} from '../src';

import {
  makeAssetInputValues,
  makeAssetsToSend,
  makeFeeEntries,
} from './fixtures/sendSheet';
import { expectMounted, PerfProviders } from './testUtils';

const ACCOUNT_ID = 'account-0' as React.ComponentProps<
  typeof RecipientInput
>['values']['selectedAccountId'];

/**
 * Typing/pasting the destination address: a CONTROLLED CustomTextInput with
 * animated label and CTA buttons, so every keystroke re-renders the section.
 * Chunks approximate typing; the last one is a full pasted address.
 */
const RecipientHarness = () => {
  const { theme } = useTheme();
  const [address, setAddress] = useState('');
  return (
    <RecipientInput
      copies={{ recipientLabel: 'Recipient address' }}
      values={{ addressSelected: address, selectedAccountId: ACCOUNT_ID }}
      utils={{ recipientErrorMessage: undefined, theme }}
      actions={{
        onContactsPress: noop,
        onQrCodePress: noop,
        onRecipientAddressChange: setAddress,
      }}
      testIdPrefix="perf-send"
    />
  );
};

test('RecipientInput — type + paste address (5 commits)', async () => {
  const scenario = async () => {
    const input = screen.getByTestId('perf-send-recipient-address-value');
    for (const text of [
      'a',
      'ad',
      'add',
      'addr',
      'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5v3nw',
    ]) {
      fireEvent.changeText(input, text);
    }
  };
  await measureRenders(<RecipientHarness />, {
    scenario,
    wrapper: PerfProviders,
  });
});

const ASSET_ROWS = 3;
const assetsToSend = makeAssetsToSend(ASSET_ROWS);

const assetsCopies = {
  addButtonLabel: 'Add asset',
  assetErrors: [] as (string | undefined)[],
  assetsTitle: 'You will send',
  balanceLabel: 'Balance:',
  maxButtonLabel: 'Max',
};
const assetsActions = {
  handleInputBlur: noop,
  handleInputChange: noop,
  onAddAssetPress: noop,
  onMaxAmountPress: noop,
  onRemoveAsset: noop,
};
const shouldShowMaxButton = () => true;
const shouldShowRemoveAsset = () => true;

const AssetsHarness = ({ withTick = false }: { withTick?: boolean }) => {
  const { theme } = useTheme();
  const [tick, setTick] = useState(0);
  return (
    <View>
      {withTick && (
        <Pressable
          testID="perf-amount-tick"
          onPress={() => {
            setTick(previous => previous + 1);
          }}
        />
      )}
      <AssetsSection
        copies={assetsCopies}
        values={{
          assetsToSend,
          assetInputValues: makeAssetInputValues(ASSET_ROWS, tick),
          selectedAccountId: ACCOUNT_ID,
        }}
        utils={{
          isAddAssetButtonEnabled: true,
          shouldShowMaxButton,
          shouldShowRemoveAsset,
          theme,
        }}
        actions={assetsActions}
      />
    </View>
  );
};

test('AssetsSection — 3 asset rows, initial render', async () => {
  await measureRenders(<AssetsHarness />, {
    scenario: expectMounted('send-amount-0'),
    wrapper: PerfProviders,
  });
});

/**
 * Amount-edit tick: the send flow keeps assetInputValues in the store, so
 * every edit feeds the section a NEW array — all rows re-render and re-run
 * formatRawToLocale on their balances.
 */
test('AssetsSection — amount values update (×2)', async () => {
  const scenario = async () => {
    await expectMounted('send-amount-0')();
    fireEvent.press(screen.getByTestId('perf-amount-tick'));
    fireEvent.press(screen.getByTestId('perf-amount-tick'));
  };
  await measureRenders(<AssetsHarness withTick />, {
    scenario,
    wrapper: PerfProviders,
  });
});

test('FeeSection — options + custom fee, initial render', async () => {
  await measureRenders(
    <FeeSection
      copies={{ customFeeLabel: 'Custom fee (sats/vB)' }}
      values={{
        customFeeRate: '1.2',
        feeOptions: ['Low', 'Average', 'Fast', 'Custom'],
        // 'Custom' is the only option that mounts the CustomTextInput branch.
        feeRateOption: 'Custom',
      }}
      actions={{ onCustomFeeChange: noop, onFeeOptionChange: noop }}
    />,
    {
      // 'Custom' is what mounts the fee input; asserting it keeps a future
      // fixture change from quietly measuring the dropdown alone.
      scenario: expectMounted('input-value'),
      wrapper: PerfProviders,
    },
  );
});

test('SummarySection — estimated fee, initial render', async () => {
  await measureRenders(
    <SummarySection
      copies={{ estimatedFeeLabel: 'Estimated fee' }}
      values={{ estimatedFee: makeFeeEntries() }}
      utils={{ shouldShowFiatConversion: true, txBuildError: undefined }}
      testIdPrefix="perf-send"
    />,
    {
      scenario: expectMounted(
        'perf-send-estimated-fee-amount-and-short-name-0',
      ),
      wrapper: PerfProviders,
    },
  );
});
