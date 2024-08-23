import React from 'react';
import type { Preview } from '@storybook/react';
import '../src/ui/app/components/styles.css';
import 'focus-visible/dist/focus-visible';

import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { theme } from '../src/ui/theme';
import { Scrollbars } from '../src/ui/app/components/scrollbar';
import { OutsideHandlesProvider } from '../src/features/outside-handles-provider';

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

const cardanoCoin = {
  id: '1',
  name: 'Cardano',
  decimals: 6,
  symbol: 'tAda'
};

export const decorators = [
  (Story, { parameters: { colorMode, ...props } }) => (
    <OutsideHandlesProvider
      environmentName='Preprod'
      getCustomSubmitApiForNetwork={
        () => ({
          status: true,
          url: 'https://cardano-preprod.blockfrost.io/api/v0'
        })
      }
      cardanoCoin={cardanoCoin}
      sendEventToPostHog={noop}
      theme="light"
      fiatCurrency="USD"
      currentChain={{ networkId: 0, networkMagic: 0 }}
      isAnalyticsOptIn={false}
      walletAddress=""
      inMemoryWallet={mock}
      walletManager={mock}
      walletRepository={mock}
      transformedCardano={{
        balance: '0',
        fiatBalance: '0',
        id: '0',
        logo: '',
        name: '',
        price: '0',
        ticker: '',
        variation: '',
      }}
      handleAnalyticsChoice={noop}
      createWallet={noop}
      getMnemonic={noop}
      deleteWallet={noop}
      setFiatCurrency={noop}
      setTheme={noop}
      withSignTxConfirmation={noop}
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
    </OutsideHandlesProvider>
  ),
];

export default preview;
