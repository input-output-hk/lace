import NftsPage from '../elements/NFTs/nftsPage';
import NftDetails from '../elements/NFTs/nftDetails';
import { getTestWallet } from '../support/walletConfiguration';
import {
  getNonActiveAdaHandle2WalletName,
  getNonActiveAdaHandleWalletName,
  getNonActiveNft2WalletName,
  getNonActiveNftHdWalletName,
  getNonActiveNftWalletName
} from '../utils/walletUtils';
import extensionUtils from '../utils/utils';
import { AddressInput } from '../elements/AddressInput';
import TransactionNewPage from '../elements/newTransaction/transactionNewPage';
import TransactionSummaryPage from '../elements/newTransaction/transactionSummaryPage';

export const progressWithSendUntilPasswordPage = async (
  nftName: string,
  mode: string,
  hdWallet = false,
  adaHandle = false
): Promise<any> => {
  await NftsPage.clickNftItem(nftName);
  await NftDetails.sendNFTButton.waitForClickable();
  await NftDetails.sendNFTButton.click();
  let receiverWallet;
  if (hdWallet) {
    receiverWallet = getTestWallet(getNonActiveNftHdWalletName());
  } else if (adaHandle) {
    receiverWallet =
      mode === 'extended'
        ? getTestWallet(getNonActiveAdaHandleWalletName())
        : getTestWallet(getNonActiveAdaHandle2WalletName());
  } else {
    receiverWallet =
      mode === 'extended' ? getTestWallet(getNonActiveNftWalletName()) : getTestWallet(getNonActiveNft2WalletName());
  }
  const receiverAddress = extensionUtils.isMainnet()
    ? String(receiverWallet.accounts[0].mainnetAddress)
    : String(receiverWallet.accounts[0].address);
  await new AddressInput().fillAddress(receiverAddress);
  await TransactionNewPage.coinConfigure(1).fillTokenValue(1);
  await TransactionNewPage.reviewTransactionButton.waitForClickable({ timeout: 15_000 });
  await TransactionNewPage.reviewTransactionButton.click();
  await TransactionSummaryPage.confirmButton.waitForClickable();
  await TransactionSummaryPage.confirmButton.click();
};
