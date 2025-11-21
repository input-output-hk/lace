import * as React from 'react';
import { I18nextProvider } from 'react-i18next';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Wallet } from '@lace/cardano';
import { i18n } from '../../../../../lib/i18n';
import { buildMockProviders } from '../../../../../utils/mocks/context-providers';
import { WalletUsedAddressesDrawer } from '../WalletUsedAddressesDrawer';
import { from } from 'rxjs';

const createRenderer = async ({ inMemoryWallet }: { inMemoryWallet: Wallet.ObservableWallet }) => {
  const { MockProviders } = await buildMockProviders({
    walletStore: {
      inMemoryWallet
    }
  });

  return () => (
    <MockProviders>
      <I18nextProvider i18n={i18n}>
        <WalletUsedAddressesDrawer />
      </I18nextProvider>
    </MockProviders>
  );
};

const createAddress = (index: number, isUsed: boolean) => ({
  address: `addr${index}`,
  isUsed,
  index
});

describe.skip('<WalletUsedAddressesDrawer />', () => {
  test('display used addresses', async () => {
    const addresses = [createAddress(0, false), createAddress(1, true)];

    const addresses$ = from([addresses]);

    const inMemoryWallet = {
      addresses$
    } as unknown as Wallet.ObservableWallet;

    const Renderer = await createRenderer({ inMemoryWallet });

    const { findByTestId, queryByTestId } = render(<Renderer />);

    const [unusedAddr, usedAddr] = addresses;

    const usedAddrElem = await findByTestId(`used-address-list-item-${usedAddr.address}`);
    expect(usedAddrElem).toBeInTheDocument();

    const unusedAddrElem = await queryByTestId(`used-address-list-item-${unusedAddr.address}`);
    expect(unusedAddrElem).toBeNull();
  });
});
