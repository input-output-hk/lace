import React from 'react';
import type { Preview } from '@storybook/react';
import '../src/ui/app/components/styles.css';
import 'focus-visible/dist/focus-visible';
import { ThemeColorScheme, ThemeProvider, colorSchemaDecorator } from '@input-output-hk/lace-ui-toolkit';

import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { theme } from '../src/ui/theme';
import { Scrollbars } from 'react-custom-scrollbars-2';
import { OutsideHandlesProvider } from '../src/features/outside-handles-provider';
import {
  CommonOutsideHandlesProvider,
  NetworkConnectionStates,
} from '../src/features/common-outside-handles-provider';
import { WalletType } from '@cardano-sdk/web-extension';
import './index.scss';

const noop = (async () => {}) as any;
const mock = {} as any;

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  loaders: [],
};

export const decorators = [
  (Story, { parameters: { colorMode, ...props } }) => (
    <OutsideHandlesProvider
      collateralFee={BigInt(200)}
      isInitializingCollateral={false}
      initializeCollateralTx={noop}
      submitCollateralTx={noop}
      addAccount={noop}
      removeDapp={noop}
      connectedDapps={[]}
      isAnalyticsOptIn={false}
      handleAnalyticsChoice={noop}
      createWallet={noop}
      deleteWallet={noop}
      fiatCurrency="USD"
      setFiatCurrency={noop}
      theme="light"
      setTheme={noop}
      currentChain={{ networkId: 0, networkMagic: 0 }}
      cardanoPrice={0.3}
      walletManager={mock}
      walletRepository={mock}
      switchNetwork={noop}
      environmentName="Preprod"
      availableChains={['Mainnet', 'Preprod']}
      enableCustomNode={noop}
      getCustomSubmitApiForNetwork={() => ({
        status: true,
        url: 'https://cardano-preprod.blockfrost.io/api/v0',
      })}
      defaultSubmitApi={''}
      isValidURL={() => true}
      setAvatar={noop}
      buildDelegation={noop}
      signAndSubmitTransaction={noop}
      secretsUtil={{
        clearSecrets: noop,
        password: { input: noop, value: 'pw' },
        setPassword: noop,
        passwordConfirmation: { input: noop, value: 'pw' },
        repeatedPassword: { input: noop, value: '' },
        setPasswordConfirmation: noop,
        setPasswordConfirmationRepeat: noop,
      }}
      delegationTxFee="200"
      delegationStoreDelegationTxBuilder={noop}
      collateralTxBuilder={noop}
      setSelectedStakePool={noop}
      isBuildingTx={false}
      stakingError={''}
      getStakePoolInfo={noop}
      resetDelegationState={noop}
      hasNoFunds={false}
      switchWalletMode={noop}
      openExternalLink={noop}
      walletAddresses={['']}
      eraSummaries={[
        {
          parameters: {
            epochLength: 20,
            slotLength: 20000 as any,
          },
          start: {
            slot: 1,
            time: new Date(),
          },
        },
      ]}
      transactions={[]}
      getTxInputsValueAndAddress={noop}
      certificateInspectorFactory={noop}
      connectHW={noop}
      createHardwareWalletRevamped={noop}
      saveHardwareWallet={noop}
      removeWallet={noop}
      setDeletingWallet={noop}
    >
      <CommonOutsideHandlesProvider
        cardanoCoin={{ symbol: 'ADA', decimals: 6, name: 'cardano', id: '1' }}
        walletType={WalletType.InMemory}
        openHWFlow={noop}
        inMemoryWallet={mock}
        sendEventToPostHog={noop}
        handleResolver={noop}
        withSignTxConfirmation={noop}
        useNetworkError={noop}
        networkConnection={NetworkConnectionStates.CONNNECTED}
      >
        <ChakraProvider
          theme={extendTheme({
            ...theme,
            config: { initialColorMode: colorMode },
          })}
        >
          <Scrollbars
            id="scroll"
            style={{ width: '100vw', height: '100vh' }}
            autoHide
          >
            {Story({ args: { colorMode, ...props } })}
          </Scrollbars>
        </ChakraProvider>
      </CommonOutsideHandlesProvider>
    </OutsideHandlesProvider>
  ),
  (Story, args) => {
    const { decorators: { theme } = {} } = args.parameters;
    return (
      <ThemeProvider colorScheme={theme ?? ThemeColorScheme.Light}>
        <Story />
      </ThemeProvider>
    );
  }
];

export default preview;
