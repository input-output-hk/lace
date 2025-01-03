/* eslint-disable no-console */
import { Then } from '@wdio/cucumber-framework';
import { AssetInput } from '../elements/newTransaction/assetInput';
import testContext from '../utils/testContext';
import { WalletRepositoryConfig, Account } from '../support/walletConfiguration';
import { Logger } from '../support/logger';
import NewTransactionExtendedPageObject from '../pageobject/newTransactionExtendedPageObject';

Then(
  /^If available: I add all available (Token|NFT) types to bundle (\d*)$/,
  async (typeOfAsset: 'Token' | 'NFT', bundleIndex: number) => {
    const assetInput = new AssetInput(bundleIndex);
    await assetInput.assetAddButton.waitForStable();
    if (await assetInput.assetAddButton.isEnabled()) {
      await (typeOfAsset === 'Token'
        ? NewTransactionExtendedPageObject.addAllAvailableTokenTypes(bundleIndex)
        : NewTransactionExtendedPageObject.addAllAvailableNftTypes(bundleIndex));
    } else {
      Logger.log('NFTs not available, skipping step');
    }
  }
);

Then(/^I print wallet "([^"]*)" data for walletConfiguration file$/, async (walletName: string) => {
  const walletMnemonic: string = testContext.load('newCreatedWalletMnemonic');
  const walletRepositoryData: string = testContext.load('newCreatedWallet');
  let stakePoolsToDelegate = '';
  try {
    stakePoolsToDelegate = testContext.load('stakePoolsInUse');
  } catch (error) {
    console.log(error);
  }

  const jsonData = JSON.parse(walletRepositoryData);

  const account: Account = {} as Account;
  account.accountNumber = 0;
  account.address = jsonData[0].metadata.walletAddresses[1];
  account.mainnetAddress = jsonData[0].metadata.walletAddresses[0];
  account.publicKey = jsonData[0].accounts[0].extendedAccountPublicKey;

  const newData: WalletRepositoryConfig = {} as WalletRepositoryConfig;
  newData.mnemonic = walletMnemonic.split(' ');
  newData.name = `TestWalletName.${walletName}`;
  newData.password = 'process.env.WALLET_1_PASSWORD';
  newData.accounts = [];
  newData.accounts.push(account);
  newData.repository = walletRepositoryData;

  console.log(newData);
  console.log(`mnemonic: '${walletMnemonic}'.split('')`);
  console.log(`stake pools for delegation: ${JSON.stringify(stakePoolsToDelegate)}`);
});
