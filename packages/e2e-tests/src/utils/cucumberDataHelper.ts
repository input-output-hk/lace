import { DataTable } from '@cucumber/cucumber';
import ConfirmTransactionPage from '../elements/dappConnector/confirmTransactionPage';
import { getTestWallet } from '../support/walletConfiguration';

export const dataTableAsStringArray = (options: DataTable): string[] => options.raw().map((array) => array[0]);

const subtractFeeFromCucumberListElement = async (entry: string) => {
  const fee = Number((await ConfirmTransactionPage.transactionFeeValueAda.getText()).split(' ')[0]);
  const [amount, currency] = entry.split(' ');
  const amountIncludingFee = (Number(amount) - fee).toFixed(2);
  return `${amountIncludingFee} ${currency}`;
};

const shortenAddressFromCucumberListElement = (wallet: string) => {
  const [addressLabel, walletValue, source] = wallet.split(' ');
  const fullAddress = String(getTestWallet(walletValue).accounts[0].address);
  return `${addressLabel} ${fullAddress.slice(0, 8)}...${fullAddress.slice(-8)} ${source}`;
};

export const parseDAppCucumberAssetList = async (assetsList: string[]): Promise<string[]> =>
  await Promise.all(
    assetsList.map(async (asset) => {
      if (asset.includes('- FEE')) {
        return await subtractFeeFromCucumberListElement(asset);
      } else if (asset.includes('Address')) {
        return shortenAddressFromCucumberListElement(asset);
      }
      return asset;
    })
  );
