import { expect } from 'chai';
import { t } from '../../utils/translationService';
import collateralSettingsDrawer from '../../elements/settings/extendedView/collateralSettingsDrawer';
import SettingsPage from '../../elements/settings/extendedView/settingsPage';
import { TestnetPatterns } from '../../support/patterns';

class CollateralDrawerAssert {
  async assertSeeCollateralDrawer(state: 'Active' | 'Inactive') {
    await collateralSettingsDrawer.collateralHeader.waitForDisplayed();
    expect(await collateralSettingsDrawer.collateralHeader.getText()).to.equal(
      await t('browserView.settings.wallet.collateral.title')
    );
    if (state === 'Inactive') {
      await collateralSettingsDrawer.passwordInputContainer.waitForDisplayed();
      expect(await collateralSettingsDrawer.collateralDescription.getText()).to.equal(
        await t('browserView.settings.wallet.collateral.amountDescription')
      );
      expect(await collateralSettingsDrawer.collateralBannerDescription.getText()).to.equal(
        await t('browserView.settings.wallet.collateral.amountSeparated')
      );
      expect(await collateralSettingsDrawer.collateralButton.getText()).to.equal(
        await t('browserView.settings.wallet.collateral.confirm')
      );

      await expect(await collateralSettingsDrawer.transactionFeeLabel.getText()).to.equal(
        await t('core.outputSummaryList.txFee')
      );
      await expect((await collateralSettingsDrawer.transactionFeeAmount.getText()) as string).to.match(
        TestnetPatterns.ADA_LITERAL_VALUE_REGEX
      );
      await expect((await collateralSettingsDrawer.transactionFeeFiat.getText()) as string).to.match(
        TestnetPatterns.USD_VALUE_REGEX
      );
    } else {
      await collateralSettingsDrawer.passwordInputContainer.waitForDisplayed({
        reverse: true
      });
      expect(await collateralSettingsDrawer.collateralDescription.getText()).to.equal(
        await t('browserView.settings.wallet.collateral.reclaimDescription')
      );
      expect(await collateralSettingsDrawer.collateralBannerDescription.getText()).to.equal(
        await t('browserView.settings.wallet.collateral.reclaimBanner')
      );
      expect(await collateralSettingsDrawer.collateralButton.getText()).to.equal(
        await t('browserView.settings.wallet.collateral.reclaimCollateral')
      );
    }
  }

  async assertSeeCollateralNotEnoughAdaDrawer() {
    expect(await collateralSettingsDrawer.collateralHeader.getText()).to.equal(
      await t('browserView.settings.wallet.collateral.title')
    );
    await collateralSettingsDrawer.passwordInputContainer.waitForDisplayed({
      reverse: true
    });
    await collateralSettingsDrawer.sadFaceIcon.waitForDisplayed();
    expect(await collateralSettingsDrawer.error.getText()).to.equal(
      await t('browserView.settings.wallet.collateral.notEnoughAda')
    );
    expect(await collateralSettingsDrawer.collateralDescription.getText()).to.equal(
      await t('browserView.settings.wallet.collateral.amountDescription')
    );
    expect(await collateralSettingsDrawer.collateralButton.getText()).to.equal(
      await t('browserView.settings.wallet.collateral.close')
    );
  }

  async assertSeeCurrentCollateralState(expectedState: string) {
    await browser.waitUntil(async () => (await SettingsPage.collateralLink.addon.getText()) === expectedState, {
      timeout: 10_000,
      interval: 1000,
      timeoutMsg: 'failed while waiting for collateral state change'
    });
  }
}

export default new CollateralDrawerAssert();
