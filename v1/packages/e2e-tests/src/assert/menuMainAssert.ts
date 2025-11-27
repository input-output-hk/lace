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

  async assertSeeStakingButton(mode: 'popup' | 'extended', reverseAssertion = false) {
    await (mode === 'popup'
      ? MenuMainPopup.stakingButton.waitForDisplayed({ reverse: reverseAssertion })
      : MenuMainExtended.stakingButton.waitForDisplayed({ reverse: reverseAssertion }));
  }

  async assertSeeVotingButton(mode: 'popup' | 'extended') {
    await (mode === 'popup'
      ? MenuMainPopup.votingButton.waitForDisplayed()
      : MenuMainExtended.votingButton.waitForDisplayed());
  }

  async assertSeeDAppsButton(mode: 'popup' | 'extended') {
    await (mode === 'popup'
      ? MenuMainPopup.dappsButton.waitForDisplayed()
      : MenuMainExtended.dappsButton.waitForDisplayed());
  }

  async assertSeeMainMenu(mode: 'popup' | 'extended') {
    await this.assertSeeTokensButton(mode);
    await this.assertSeeNftsButton(mode);
    await this.assertSeeTransactionsButton(mode);
    await this.assertSeeStakingButton(mode);
    await this.assertSeeVotingButton(mode);
    await this.assertSeeDAppsButton(mode);
  }

  async assertSeeIconAndTextForEachMenuItemExtended() {
    await MenuMainExtended.getIcon(MenuMainExtended.tokensButton).waitForDisplayed();
    expect(await MenuMainExtended.tokensButton.getText()).to.equal(await t('browserView.sideMenu.links.tokens'));

    await MenuMainExtended.getIcon(MenuMainExtended.nftsButton).waitForDisplayed();
    expect(await MenuMainExtended.nftsButton.getText()).to.equal(await t('browserView.sideMenu.links.nfts'));

    await MenuMainExtended.getIcon(MenuMainExtended.transactionsButton).waitForDisplayed();
    expect(await MenuMainExtended.transactionsButton.getText()).to.equal(
      await t('browserView.sideMenu.links.activity')
    );

    await MenuMainExtended.getIcon(MenuMainExtended.stakingButton).waitForDisplayed();
    expect(await MenuMainExtended.stakingButton.getText()).to.equal(await t('browserView.sideMenu.links.staking'));

    await MenuMainExtended.getIcon(MenuMainExtended.votingButton).waitForDisplayed();
    expect(await MenuMainExtended.votingButton.getText()).to.equal(await t('browserView.sideMenu.links.voting'));

    await MenuMainExtended.getIcon(MenuMainExtended.dappsButton).waitForDisplayed();
    expect(await MenuMainExtended.dappsButton.getText()).to.equal(await t('browserView.sideMenu.links.dappExplorer'));
  }

  async assertAddressIsNotEqual(wallet = TestWalletName.TestAutomationWallet) {
    const walletData = getTestWallet(wallet);
    const expectedAddress = extensionUtils.isMainnet()
      ? walletData.accounts[0].mainnetAddress
      : walletData.accounts[0].address;
    const actualAddress = await FundWalletBanner.getWalletAddress();
    expect(actualAddress).to.not.equal(expectedAddress);
  }

  async assertMenuFormat(menuFormat: string, width: number) {
    const menuWidth = await MenuMainExtended.container.getSize('width');
    if (width > 1024) {
      expect(menuWidth).to.equal(198);
    } else {
      menuFormat === 'collapsed' ? expect(menuWidth).to.equal(47) : expect(menuWidth).to.equal(163);
    }
  }
}

export default new MenuMainPopupPageAssert();
