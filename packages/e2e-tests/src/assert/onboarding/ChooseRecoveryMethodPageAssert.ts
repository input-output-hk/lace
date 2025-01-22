import OnboardingCommonAssert from './onboardingCommonAssert';
import ChooseRecoveryMethodPage from '../../elements/onboarding/ChooseRecoveryMethodPage';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import { TimelineSteps } from '../../enums/Onboarding';
import AddNewWalletMainModal from '../../elements/addNewWallet/MainModal';

class ChooseRecoveryMethodPageAssert extends OnboardingCommonAssert {
  async assertSeeChooseRecoveryMethodPage(flowType: 'Create' | 'Restore', isModal = false) {
    if (isModal) {
      await AddNewWalletMainModal.container.waitForDisplayed({ timeout: 5000 });
      await AddNewWalletMainModal.closeButton.waitForEnabled();
    } else {
      await this.assertSeeHelpAndSupportButton();
      await this.assertSeeLegalLinks();
    }
    await this.assertSeeStepTitle(await t('paperWallet.chooseRecoveryMethod.title'));
    const expectedDescription =
      flowType === 'Create'
        ? (await t('paperWallet.chooseRecoveryMethod.description')).replace('<a>', '').replace('</a>', '')
        : await t('paperWallet.chooseRestoreMethod.description');
    await this.assertSeeStepSubtitle(expectedDescription);
    if (flowType === 'Create') {
      await ChooseRecoveryMethodPage.learnMoreURL.waitForClickable();
      expect(await ChooseRecoveryMethodPage.learnMoreURL.getAttribute('href')).to.equal('https://www.lace.io/faq');
    }

    await this.assertSeeRecoveryPhraseOption();
    await this.assertSeePaperWalletOption(flowType);

    await this.assertSeeActiveStepOnProgressTimeline(TimelineSteps.RECOVERY_METHOD);

    await this.assertSeeBackButton();
    await this.assertNextButtonTextEquals(await t('core.walletSetupStep.next'));
  }

  async assertSeePaperWalletOption(flowType: 'Create' | 'Restore') {
    await ChooseRecoveryMethodPage.paperWalletRadioButton.waitForDisplayed();
    await ChooseRecoveryMethodPage.paperWalletLabel.waitForDisplayed();
    expect(await ChooseRecoveryMethodPage.paperWalletLabel.getText()).to.equal(
      await t('paperWallet.chooseRestoreMethod.option.paper')
    );
    await ChooseRecoveryMethodPage.paperWalletDescription.waitForDisplayed();
    expect(await ChooseRecoveryMethodPage.paperWalletDescription.getText()).to.equal(
      await t('paperWallet.chooseRecoveryMethod.paperWallet.description')
    );
    await ChooseRecoveryMethodPage.paperWalletIcon.waitForDisplayed();
    if (flowType === 'Create') {
      await ChooseRecoveryMethodPage.paperWalletAdvancedBadge.waitForDisplayed();
      expect(await ChooseRecoveryMethodPage.paperWalletAdvancedBadge.getText()).to.equal(
        await t('paperWallet.chooseRecoveryMethod.advanced')
      );
      await ChooseRecoveryMethodPage.paperWalletPGPKeysIcon.waitForDisplayed();
      await ChooseRecoveryMethodPage.paperWalletPGPKeysNotice.waitForDisplayed();
      expect(await ChooseRecoveryMethodPage.paperWalletPGPKeysNotice.getText()).to.equal(
        await t('paperWallet.chooseRecoveryMethod.pgpKeysRequired')
      );
    }
  }

  async assertSeeRecoveryPhraseOption() {
    await ChooseRecoveryMethodPage.recoveryPhraseRadioButton.waitForDisplayed();
    await ChooseRecoveryMethodPage.recoveryPhraseLabel.waitForDisplayed();
    expect(await ChooseRecoveryMethodPage.recoveryPhraseLabel.getText()).to.equal(
      await t('core.walletSetupStep.recoveryPhrase')
    );
    await ChooseRecoveryMethodPage.recoveryPhraseDescription.waitForDisplayed();
    expect(await ChooseRecoveryMethodPage.recoveryPhraseDescription.getText()).to.equal(
      await t('paperWallet.chooseRecoveryMethod.mnemonicDescription')
    );
    await ChooseRecoveryMethodPage.recoveryPhraseIcon.waitForDisplayed();
  }

  async assertRecoveryMethodIsSelected(method: 'Recovery phrase' | 'Paper wallet') {
    expect(await ChooseRecoveryMethodPage.recoveryPhraseRadioButton.getAttribute('data-state')).to.equal(
      method === 'Recovery phrase' ? 'checked' : 'unchecked'
    );
    expect(await ChooseRecoveryMethodPage.paperWalletRadioButton.getAttribute('data-state')).to.equal(
      method === 'Paper wallet' ? 'checked' : 'unchecked'
    );
  }
}

export default new ChooseRecoveryMethodPageAssert();
