import WalletSettingsDrawer from '../elements/WalletSettingsDrawer';
import { expect } from 'chai';
import { t } from '../utils/translationService';

class WalletSettingsDrawerAssert {
  async assertSeeDrawer(mode: 'extended' | 'popup'): Promise<void> {
    await WalletSettingsDrawer.drawerHeaderCloseButton.waitForDisplayed({ reverse: mode === 'popup' });
    await WalletSettingsDrawer.drawerHeaderBackButton.waitForDisplayed({ reverse: mode === 'extended' });
    await WalletSettingsDrawer.drawerNavigationTitle.waitForDisplayed({ reverse: mode === 'popup' });
    if (mode === 'extended') {
      expect(await WalletSettingsDrawer.drawerNavigationTitle.getText()).to.equal(
        await t('browserView.renameWalletDrawer.walletSettings')
      );
    }
    await WalletSettingsDrawer.drawerHeaderTitle.waitForDisplayed();
    expect(await WalletSettingsDrawer.drawerHeaderTitle.getText()).to.equal(
      await t('browserView.renameWalletDrawer.title')
    );
    await WalletSettingsDrawer.renameWalletLabel.waitForDisplayed();
    expect(await WalletSettingsDrawer.renameWalletLabel.getText()).to.equal(
      await t('browserView.renameWalletDrawer.renameWallet')
    );
    await WalletSettingsDrawer.renameWalletInput.waitForEnabled();
    expect(await WalletSettingsDrawer.renameWalletInput.getValue()).to.exist;
    await WalletSettingsDrawer.renameWalletInputLabel.waitForDisplayed();
    expect(await WalletSettingsDrawer.renameWalletInputLabel.getText()).to.equal(
      await t('browserView.renameWalletDrawer.walletName')
    );
    await WalletSettingsDrawer.renameEnabledAccountsLabel.waitForDisplayed();
    expect(await WalletSettingsDrawer.renameEnabledAccountsLabel.getText()).to.equal(
      await t('browserView.renameWalletDrawer.renameEnabledAccounts')
    );
    await WalletSettingsDrawer.getAccountNameInput(0).waitForEnabled();
    const accountNameInputLabel = await WalletSettingsDrawer.getAccountNameInputLabel(0);
    await accountNameInputLabel.waitForDisplayed();
    expect(await accountNameInputLabel.getText()).to.equal("m/1852'/1815'/0'");
    await WalletSettingsDrawer.saveButton.waitForEnabled();
    expect(await WalletSettingsDrawer.saveButton.getText()).to.equal(await t('browserView.renameWalletDrawer.save'));
    await WalletSettingsDrawer.cancelButton.waitForEnabled();
    expect(await WalletSettingsDrawer.cancelButton.getText()).to.equal(
      await t('browserView.renameWalletDrawer.cancel')
    );
  }

  async assertSeeWalletNameError(error: string): Promise<void> {
    await WalletSettingsDrawer.renameWalletInputError.waitForDisplayed();
    expect(await WalletSettingsDrawer.renameWalletInputError.getText()).to.equal(error);
  }

  async assertSeeAccountNameError(error: string, accountIndex: number): Promise<void> {
    await WalletSettingsDrawer.getRenameAccountInputError(accountIndex).waitForDisplayed();
    expect(await WalletSettingsDrawer.getRenameAccountInputError(accountIndex).getText()).to.equal(error);
  }

  async assertSaveButtonEnabled(isEnabled: boolean): Promise<void> {
    await WalletSettingsDrawer.saveButton.waitForEnabled({ reverse: !isEnabled });
  }
}

export default new WalletSettingsDrawerAssert();
