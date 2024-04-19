import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Wallet } from '@lace/cardano';
import { AddressTagTranslations, renderAddressTag } from '@ui/utils';

const address = Wallet.Cardano.PaymentAddress(
  'addr_test1qq585l3hyxgj3nas2v3xymd23vvartfhceme6gv98aaeg9muzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q2g7k3g'
);

const translations: AddressTagTranslations = {
  own: 'own',
  foreign: 'foreign'
};

describe('rendering correct tags for addresses', () => {
  test('should tag own addresses', async () => {
    const ownAddresses = [address];
    const { findByTestId } = render(renderAddressTag(address, translations, ownAddresses));
    expect(await findByTestId('address-tag')).toContainHTML(translations.own);
  });

  test('should tag foreign addresses', async () => {
    const { findByTestId } = render(renderAddressTag(address, translations));
    expect(await findByTestId('address-tag')).toContainHTML(translations.foreign);
  });

  test('should tag address book addresses', async () => {
    const addressName = 'test';
    const addressToNameMap = new Map<string, string>([[address, addressName]]);
    const { findByTestId } = render(renderAddressTag(address, translations, [], addressToNameMap));
    expect(await findByTestId('address-tag')).toContainHTML(`${translations.foreign}/${addressName}`);
  });
});
