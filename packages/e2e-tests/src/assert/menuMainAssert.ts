import MenuMainPopup from '../elements/menuMainPopup';
import MenuMainExtended from '../elements/menuMainExtended';
import { t } from '../utils/translationService';
import { expect } from 'chai';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import extensionUtils from '../utils/utils';
import FundWalletBanner from '../elements/fundWalletBanner';

class MenuMainPopupPageAssert {
  async assertSeeTokensButton(mode: 'popup' | 'extended') {
    await (mode === 'popup'
      ? MenuMainPopup.tokensButton.waitForDisplayed()
      : MenuMainExtended.tokensButton.waitForDisplayed());
  }

  async assertSeeNftsButton(mode: 'popup' | 'extended') {
    await (mode === 'popup'
      ? MenuMainPopup.nftsButton.waitForDisplayed()
      : MenuMainExtended.nftsButton.waitForDisplayed());
  }

  async assertSeeTransactionsButton(mode: 'popup' | 'extended') {
    await (mode === 'popup'
      ? MenuMainPopup.transactionsButton.waitForDisplayed()
      : MenuMainExtended.transactionsButton.waitForDisplayed());
  }

  async assertSeeStakingButton(mode: 'popup' | 'extended') {
    await (mode === 'popup'
      ? MenuMainPopup.stakingButton.waitForDisplayed()
      : MenuMainExtended.stakingButton.waitForDisplayed());
  }

  async assertSeeMainMenu(mode: 'popup' | 'extended') {
    await this.assertSeeTokensButton(mode);
    await this.assertSeeNftsButton(mode);
    await this.assertSeeTransactionsButton(mode);
    await this.assertSeeStakingButton(mode);
  }

  async assertSeeIconAndTextForEachMenuItemExtended() {
    await MenuMainExtended.getIcon(MenuMainExtended.tokensButton).waitForDisplayed();
    await expect(await MenuMainExtended.tokensButton.getText()).to.equal(await t('browserView.sideMenu.links.tokens'));

    await MenuMainExtended.getIcon(MenuMainExtended.nftsButton).waitForDisplayed();
    await expect(await MenuMainExtended.nftsButton.getText()).to.equal(await t('browserView.sideMenu.links.nfts'));

    await MenuMainExtended.getIcon(MenuMainExtended.transactionsButton).waitForDisplayed();
    await expect(await MenuMainExtended.transactionsButton.getText()).to.equal(
      await t('browserView.sideMenu.links.activity')
    );

    await MenuMainExtended.getIcon(MenuMainExtended.stakingButton).waitForDisplayed();
    await expect(await MenuMainExtended.stakingButton.getText()).to.equal(
      await t('browserView.sideMenu.links.staking')
    );
  }

  async assertAddressIsNotEqual(wallet = TestWalletName.TestAutomationWallet) {
    const walletData = getTestWallet(wallet);
    const expectedAddress = extensionUtils.isMainnet() ? walletData.mainnetAddress : walletData.address;
    const actualAddress = await FundWalletBanner.getWalletAddress();
    await expect(actualAddress).to.not.equal(expectedAddress);
  }
}

export default new MenuMainPopupPageAssert();
