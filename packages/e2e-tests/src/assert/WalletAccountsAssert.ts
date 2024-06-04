import WalletAccounts from '../elements/accounts/WalletAccounts';
import { expect } from 'chai';
import { t } from '../utils/translationService';
import WalletAccountItem from '../elements/accounts/WalletAccountItem';

class WalletAccountsAssert {
  async assertSeeAccountsMenu(shouldBeDisplayed: boolean): Promise<void> {
    await WalletAccounts.container.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      await WalletAccounts.arrowButton.waitForDisplayed();
      await WalletAccounts.title.waitForDisplayed();
      expect(await WalletAccounts.title.getText()).to.equal(await t('browserView.settings.wallet.accounts.title'));
      await WalletAccounts.description.waitForDisplayed();
      expect(await WalletAccounts.description.getText()).to.equal(
        await t('browserView.settings.wallet.accounts.description')
      );
      await WalletAccounts.accountList.waitForDisplayed();
    }
  }

  async assertAccountsQuantity(expectedAccountsQuantity: number): Promise<void> {
    expect(await WalletAccounts.accounts.length).to.equal(expectedAccountsQuantity);
  }

  async assertSeeEachAccountItem(): Promise<void> {
    for (let accountIndex = 0; accountIndex < 24; accountIndex++) {
      const accountItem = new WalletAccountItem(accountIndex + 1);
      await accountItem.container.scrollIntoView();
      await accountItem.container.waitForDisplayed();
      await accountItem.icon.waitForDisplayed();
      expect(await accountItem.icon.getText()).to.equal(`${accountIndex}`);
      await accountItem.label.waitForDisplayed();
      expect(await accountItem.label.getText()).to.equal(`Account #${accountIndex}`);
      await accountItem.path.waitForDisplayed();
      expect(await accountItem.path.getText()).to.equal(`m/1852'/1815'/${accountIndex}'`);
    }
  }
}

export default new WalletAccountsAssert();
