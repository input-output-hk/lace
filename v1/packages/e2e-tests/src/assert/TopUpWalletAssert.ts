import TopUpWalletCard from '../elements/TopUpWalletCard';
import TopUpWalletDialog from '../elements/TopUpWalletDialog';
import { expect } from 'chai';
import { t } from '../utils/translationService';
import CommonAssert from './commonAssert';
import TopUpWalletSmallCard from '../elements/TopUpWalletSmallCard';

class TopUpWalletAssert {
  async assertSeeBanxaWidget(shouldBeDisplayed: boolean) {
    await TopUpWalletCard.card.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      await TopUpWalletCard.badge.waitForDisplayed();
      expect(await TopUpWalletCard.badge.getText()).to.equal(await t('browserView.assets.topupWallet.card.badge'));
      await TopUpWalletCard.title.waitForDisplayed();
      expect(await TopUpWalletCard.title.getText()).to.equal(await t('browserView.assets.topupWallet.card.title'));
      await TopUpWalletCard.subtitle.waitForDisplayed();
      expect(await TopUpWalletCard.subtitle.getText()).to.equal(
        await t('browserView.assets.topupWallet.buyButton.title')
      );
      await TopUpWalletCard.buyAdaButton.waitForDisplayed();
      expect(await TopUpWalletCard.buyAdaButton.getText()).to.equal(
        await t('browserView.assets.topupWallet.buyButton.caption')
      );
      await TopUpWalletCard.disclaimer.waitForDisplayed();
      expect(await TopUpWalletCard.disclaimer.getText()).to.equal(
        await t('browserView.assets.topupWallet.disclaimer.short')
      );
    }
  }

  async assertSeeTopUpWalletDialog(shouldBeDisplayed: boolean) {
    await TopUpWalletDialog.body.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      await TopUpWalletDialog.title.waitForDisplayed();
      expect(await TopUpWalletDialog.title.getText()).to.equal(await t('browserView.assets.topupWallet.modal.title'));
      await TopUpWalletDialog.disclaimerPart1.waitForDisplayed();
      expect(await TopUpWalletDialog.disclaimerPart1.getText()).to.equal(
        await t('browserView.assets.topupWallet.disclaimer.full.part1')
      );
      await TopUpWalletDialog.disclaimerLinkCaption1.waitForDisplayed();
      expect(await TopUpWalletDialog.disclaimerLinkCaption1.getText()).to.equal(
        await t('browserView.assets.topupWallet.disclaimer.full.banxaLinkCaption')
      );
      await TopUpWalletDialog.disclaimerPart2.waitForDisplayed();
      expect(await TopUpWalletDialog.disclaimerPart2.getText()).to.equal(
        await t('browserView.assets.topupWallet.disclaimer.full.part2')
      );
      await TopUpWalletDialog.disclaimerLinkCaption2.waitForDisplayed();
      expect(await TopUpWalletDialog.disclaimerLinkCaption2.getText()).to.equal(
        await t('browserView.assets.topupWallet.disclaimer.full.banxaLinkCaption')
      );
      await TopUpWalletDialog.goBackButton.waitForDisplayed();
      expect(await TopUpWalletDialog.goBackButton.getText()).to.equal(
        await t('browserView.assets.topupWallet.modal.goBack')
      );
      await TopUpWalletDialog.continueButton.waitForDisplayed();
      expect(await TopUpWalletDialog.continueButton.getText()).to.equal(
        await t('browserView.assets.topupWallet.modal.continue')
      );
    }
  }

  async assertSeeBanxaTransactionPage() {
    const BANXA_TRANSACTION_PAGE_URL = 'https://lacewallet.banxa-sandbox.com/';
    await CommonAssert.assertSeeTabWithUrl(BANXA_TRANSACTION_PAGE_URL);
  }

  async assertSeeBanxaPage() {
    const BANXA_PAGE_URL = 'https://banxa.com/';
    await CommonAssert.assertSeeTabWithUrl(BANXA_PAGE_URL);
  }

  async assertSeeSmallBanxaComponent(shouldBeDisplayed: boolean) {
    await TopUpWalletSmallCard.card.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      await TopUpWalletSmallCard.title.waitForDisplayed();
      expect(await TopUpWalletSmallCard.title.getText()).to.equal(
        await t('browserView.assets.topupWallet.buyButton.title')
      );
      await TopUpWalletSmallCard.buyAdaButton.waitForDisplayed();
      expect(await TopUpWalletSmallCard.buyAdaButton.getText()).to.equal(
        await t('browserView.assets.topupWallet.buyButton.caption')
      );
      await TopUpWalletSmallCard.disclaimer.waitForDisplayed();
      expect(await TopUpWalletSmallCard.disclaimer.getText()).to.equal(
        await t('browserView.assets.topupWallet.disclaimer.short')
      );
    }
  }
}

export default new TopUpWalletAssert();
