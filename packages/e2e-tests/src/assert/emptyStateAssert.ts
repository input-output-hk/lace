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
    await expect(await FundWalletBanner.getWalletAddress()).to.equal(expectedAddress);
    await FundWalletBanner.qrCode.waitForDisplayed();
    await FundWalletBanner.copyAddressButton.waitForDisplayed();
  }

  async assertSeeEmptyStateTokens() {
    await expect(await FundWalletBanner.getTitle()).to.equal(await t(tWelcome));
    await expect(await FundWalletBanner.getSubtitle()).to.equal(await t('browserView.assets.startYourWeb3Journey'));
    await this.assertSeeCommonEmptyStateElements();
  }

  async assertSeeEmptyStateStaking() {
    await expect(await FundWalletBanner.getTitle()).to.equal(await t('overview.noFunds.title', 'staking'));
    await expect(await FundWalletBanner.getSubtitle()).to.equal(await t('overview.noFunds.description', 'staking'));
    await this.assertSeeCommonEmptyStateElements();
  }

  async assertSeeEmptyStateNFTs(mode: 'extended' | 'popup') {
    await expect(await FundWalletBanner.getTitle()).to.equal(await t('browserView.nfts.fundWalletBanner.title'));
    const subtitle = mode === 'extended' ? await FundWalletBanner.getSubtitle() : await FundWalletBanner.getPrompt();
    await expect(subtitle).to.equal(await t('browserView.nfts.fundWalletBanner.subtitle'));
    await this.assertSeeCommonEmptyStateElements();
  }

  async assertSeeEmptyStateTransactions() {
    await expect(await FundWalletBanner.getTitle()).to.equal(await t('browserView.activity.fundWalletBanner.title'));
    await expect(await FundWalletBanner.getSubtitle()).to.equal(
      await t('browserView.activity.fundWalletBanner.subtitle')
    );
    await this.assertSeeCommonEmptyStateElements();
  }

  async assertSeeEmptyStateTransactionsPopup() {
    await expect(await FundWalletBanner.getTitle()).to.equal(await t(tWelcome));
    await expect(await FundWalletBanner.getSubtitle()).to.equal(await t('browserView.activity.fundWalletBanner.title'));
    await this.assertSeeCommonEmptyStateElements();
  }
}

export default new EmptyStateAssert();
