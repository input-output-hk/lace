import OnboardingCommonAssert from './onboardingCommonAssert';
import { t } from '../../utils/translationService';
import { TimelineSteps } from '../../enums/Onboarding';
import SaveYourPaperWalletPage from '../../elements/onboarding/SaveYourPaperWalletPage';
import { expect } from 'chai';

class SaveYourPaperWalletPageAssert extends OnboardingCommonAssert {
  async assertSeeSaveYourPaperWalletPage(expectedPaperWalletName: string) {
    await this.assertSeeStepTitle(await t('paperWallet.savePaperWallet.title'));
    await this.assertSeeStepSubtitle(await t('paperWallet.savePaperWallet.description'));
    await this.assertSeeActiveStepOnProgressTimeline(TimelineSteps.WALLET_SETUP);

    await SaveYourPaperWalletPage.paperWalletName.waitForDisplayed();
    expect(await SaveYourPaperWalletPage.paperWalletName.getText()).to.equal(expectedPaperWalletName);
    await SaveYourPaperWalletPage.containsLabel.waitForDisplayed();

    expect(await SaveYourPaperWalletPage.containsLabel.getText()).to.equal(
      await t('core.paperWallet.savePaperWallet.contains')
    );
    await SaveYourPaperWalletPage.privateQrCodeIcon.waitForDisplayed();
    await SaveYourPaperWalletPage.privateQrCodeTitle.waitForDisplayed();
    expect(await SaveYourPaperWalletPage.privateQrCodeTitle.getText()).to.equal(
      await t('core.paperWallet.savePaperWallet.privateQrTitle')
    );
    await SaveYourPaperWalletPage.privateQrCodeDescription.waitForDisplayed();
    expect(await SaveYourPaperWalletPage.privateQrCodeDescription.getText()).to.equal(
      await t('core.paperWallet.savePaperWallet.privateQrDescription')
    );
    await SaveYourPaperWalletPage.publicQrCodeIcon.waitForDisplayed();
    await SaveYourPaperWalletPage.publicQrCodeTitle.waitForDisplayed();
    expect(await SaveYourPaperWalletPage.publicQrCodeTitle.getText()).to.equal(
      await t('core.paperWallet.savePaperWallet.publicQrTitle')
    );
    await SaveYourPaperWalletPage.publicQrCodeDescription.waitForDisplayed();
    expect(await SaveYourPaperWalletPage.publicQrCodeDescription.getText()).to.equal(
      await t('core.paperWallet.savePaperWallet.publicQrDescription')
    );

    await SaveYourPaperWalletPage.downloadButton.waitForClickable();
    expect(await SaveYourPaperWalletPage.downloadButton.getText()).to.equal(
      await t('paperWallet.savePaperWallet.downloadBtnLabel')
    );
    await SaveYourPaperWalletPage.printButton.waitForClickable();
    expect(await SaveYourPaperWalletPage.printButton.getText()).to.equal(
      await t('paperWallet.savePaperWallet.printBtnLabel')
    );

    await SaveYourPaperWalletPage.downloadOrSaveLabel.waitForDisplayed();
    expect(await SaveYourPaperWalletPage.downloadOrSaveLabel.getText()).to.equal(
      await t('paperWallet.savePaperWallet.pleaseSaveOrPrintLabel')
    );

    await SaveYourPaperWalletPage.openWalletButton.waitForDisplayed();
    expect(await SaveYourPaperWalletPage.openWalletButton.getText()).to.equal(
      await t('core.walletSetupStep.enterWallet')
    );

    await this.assertSeeHelpAndSupportButton();
    await this.assertSeeLegalLinks();
  }

  async assertOpenWalletButtonEnabled(shouldBeEnabled: boolean): Promise<void> {
    await SaveYourPaperWalletPage.openWalletButton.waitForEnabled({ reverse: !shouldBeEnabled });
  }
}

export default new SaveYourPaperWalletPageAssert();
