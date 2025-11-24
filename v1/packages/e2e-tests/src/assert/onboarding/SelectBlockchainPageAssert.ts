import OnboardingCommonAssert from './onboardingCommonAssert';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import { TimelineSteps } from '../../enums/Onboarding';
import SelectBlockchainPage from '../../elements/onboarding/SelectBlockchainPage';

class SelectBlockchainPagePageAssert extends OnboardingCommonAssert {
  async assertSeeSelectBlockchainPage(isMultiWallet = false) {
    if (isMultiWallet) {
      await SelectBlockchainPage.addNewWalletCloseButton.waitForEnabled();
    }
    await this.assertSeeHelpAndSupportButton();
    await this.assertSeeLegalLinks();
    await this.assertSeeStepTitle(await t('core.WalletSetupSelectBlockchain.title'));
    await this.assertSeeStepSubtitle(await t('core.WalletSetupSelectBlockchain.description'));

    await this.assertSeeCardanoOption();
    await this.assertSeeBitcoinOption();

    await this.assertSeeActiveStepOnProgressTimeline(TimelineSteps.SELECT_BLOCKCHAIN);

    await this.assertSeeBackButton();
    await this.assertNextButtonTextEquals(await t('core.walletSetupStep.next'));
  }

  async assertSeeBitcoinOption() {
    await SelectBlockchainPage.bitcoinOptionRadioButton.waitForExist();
    await SelectBlockchainPage.bitcoinOptionRadioButton.parentElement().waitForDisplayed(); // radio input is hidden, but it is wrapped with the visible span element
    await SelectBlockchainPage.bitcoinOptionTitle.waitForDisplayed();
    expect(await SelectBlockchainPage.bitcoinOptionTitle.getText()).to.equal(
      await t('core.WalletSetupSelectBlockchain.bitcoin')
    );
    await SelectBlockchainPage.bitcoinOptionBadge.waitForDisplayed();
    expect(await SelectBlockchainPage.bitcoinOptionBadge.getText()).to.equal(
      await t('core.WalletSetupSelectBlockchain.newBadge')
    );
    await SelectBlockchainPage.bitcoinOptionDescription.waitForDisplayed();
    expect(await SelectBlockchainPage.bitcoinOptionDescription.getText()).to.equal(
      await t('core.WalletSetupSelectBlockchain.bitcoin.description')
    );
    await SelectBlockchainPage.bitcoinOptionIcon.waitForDisplayed();
  }

  async assertSeeCardanoOption() {
    await SelectBlockchainPage.cardanoOptionRadioButton.waitForExist();
    await SelectBlockchainPage.cardanoOptionRadioButton.parentElement().waitForDisplayed(); // radio input is hidden, but it is wrapped with the visible span element
    await SelectBlockchainPage.cardanoOptionTitle.waitForDisplayed();
    expect(await SelectBlockchainPage.cardanoOptionTitle.getText()).to.equal(
      await t('core.WalletSetupSelectBlockchain.cardano')
    );
    await SelectBlockchainPage.cardanoOptionBadge.waitForDisplayed();
    expect(await SelectBlockchainPage.cardanoOptionBadge.getText()).to.equal(
      await t('core.WalletSetupSelectBlockchain.defaultBadge')
    );
    await SelectBlockchainPage.cardanoOptionDescription.waitForDisplayed();
    expect(await SelectBlockchainPage.cardanoOptionDescription.getText()).to.equal(
      await t('core.WalletSetupSelectBlockchain.cardano.description')
    );
    await SelectBlockchainPage.cardanoOptionIcon.waitForDisplayed();
  }

  async assertSelectedBlockchain(blockchain: 'Bitcoin' | 'Cardano') {
    expect(await SelectBlockchainPage.cardanoOptionRadioButton.isSelected()).to.equal(blockchain === 'Cardano');
    expect(await SelectBlockchainPage.bitcoinOptionRadioButton.isSelected()).to.equal(blockchain === 'Bitcoin');
  }
}

export default new SelectBlockchainPagePageAssert();
