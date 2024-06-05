import FundWalletBanner from '../elements/fundWalletBanner';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import { t } from '../utils/translationService';
import { expect } from 'chai';
import extensionUtils from '../utils/utils';

const tWelcome = 'browserView.assets.welcome';

class EmptyStateAssert {
  async assertSeeCommonEmptyStateElements() {
    const walletData = getTestWallet(TestWalletName.TAWalletNoFunds);
    const expectedAddress = extensionUtils.isMainnet() ? walletData.mainnetAddress : walletData.address;
    expect(await FundWalletBanner.getWalletAddress()).to.equal(expectedAddress);
    await FundWalletBanner.qrCode.waitForDisplayed();
    await FundWalletBanner.copyAddressButton.waitForDisplayed();
  }

  async assertSeeEmptyStateTokens() {
    expect(await FundWalletBanner.getTitle()).to.equal(await t(tWelcome));
    expect(await FundWalletBanner.getSubtitle()).to.equal(await t('browserView.assets.startYourWeb3Journey'));
    await this.assertSeeCommonEmptyStateElements();
  }

  async assertSeeEmptyStateStaking() {
    expect(await FundWalletBanner.getTitle()).to.equal(await t('overview.noFunds.title'));
    expect(await FundWalletBanner.getSubtitle()).to.equal(await t('overview.noFunds.description'));
    await this.assertSeeCommonEmptyStateElements();
  }

  async assertSeeEmptyStateNFTs(mode: 'extended' | 'popup') {
    expect(await FundWalletBanner.getTitle()).to.equal(await t('browserView.nfts.fundWalletBanner.title'));
    const subtitle = mode === 'extended' ? await FundWalletBanner.getSubtitle() : await FundWalletBanner.getPrompt();
    expect(subtitle).to.equal(await t('browserView.nfts.fundWalletBanner.subtitle'));
    await this.assertSeeCommonEmptyStateElements();
  }

  async assertSeeEmptyStateTransactions() {
    expect(await FundWalletBanner.getTitle()).to.equal(await t('browserView.activity.fundWalletBanner.title'));
    expect(await FundWalletBanner.getSubtitle()).to.equal(await t('browserView.activity.fundWalletBanner.subtitle'));
    await this.assertSeeCommonEmptyStateElements();
  }

  async assertSeeEmptyStateTransactionsPopup() {
    expect(await FundWalletBanner.getTitle()).to.equal(await t(tWelcome));
    expect(await FundWalletBanner.getSubtitle()).to.equal(await t('browserView.activity.fundWalletBanner.title'));
    await this.assertSeeCommonEmptyStateElements();
  }
}

export default new EmptyStateAssert();
