import AddSharedWalletMainModal from '../elements/sharedWallet/AddSharedWalletMainModal';
import MenuHeader from '../elements/menuHeader';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import GenerateSharedWalletKeyScreen from '../elements/sharedWallet/GenerateSharedWalletKeyScreen';
import CopySharedWalletKeyScreen from '../elements/sharedWallet/CopySharedWalletKeyScreen';
import testContext from './testContext';

export const generateSharedWalletKey = async (): Promise<void> => {
  await MenuHeader.openUserMenu();
  await MenuHeader.clickOnAddSharedWalletOption();
  await AddSharedWalletMainModal.clickOnGenerateButton();
  const password = String(getTestWallet(TestWalletName.TestAutomationWallet).password);
  await GenerateSharedWalletKeyScreen.passwordInput.waitForClickable();
  await GenerateSharedWalletKeyScreen.passwordInput.setValue(password);
  await GenerateSharedWalletKeyScreen.clickOnGenerateKeyButton();
  testContext.save('sharedWalletKey', String(await CopySharedWalletKeyScreen.sharedWalletKeysValue.getText()));
  await CopySharedWalletKeyScreen.clickOnCloseButton();
  await AddSharedWalletMainModal.closeButton.click();
};
