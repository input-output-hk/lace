import { expect } from 'chai';
import { browser } from '@wdio/globals';
import { t } from '../../utils/translationService';
import CollateralDrawer from '../../elements/settings/CollateralDrawer';
import SettingsPage from '../../elements/settings/SettingsPage';
import { TestnetPatterns } from '../../support/patterns';

class CollateralDrawerAssert {
  async assertSeeCollateralDrawer(state: 'Active' | 'Inactive') {
    await CollateralDrawer.drawerHeaderTitle.waitForClickable();
    expect(await CollateralDrawer.drawerHeaderTitle.getText()).to.equal(
      await t('browserView.settings.wallet.collateral.title')
    );
    if (state === 'Inactive') {
      await CollateralDrawer.passwordInputContainer.waitForDisplayed();
      expect(await CollateralDrawer.collateralDescription.getText()).to.equal(
        await t('browserView.settings.wallet.collateral.amountDescription')
      );
      expect(await CollateralDrawer.collateralBannerDescription.getText()).to.equal(
        await t('browserView.settings.wallet.collateral.reclaimBanner')
      );
      expect(await CollateralDrawer.collateralButton.getText()).to.equal(
        await t('browserView.settings.wallet.collateral.confirm')
      );

      expect(await CollateralDrawer.transactionFeeLabel.getText()).to.equal(await t('core.outputSummaryList.txFee'));
      expect((await CollateralDrawer.transactionFeeAmount.getText()) as string).to.match(
        TestnetPatterns.ADA_LITERAL_VALUE_REGEX
      );
      expect((await CollateralDrawer.transactionFeeFiat.getText()) as string).to.match(TestnetPatterns.USD_VALUE_REGEX);
    } else {
      await CollateralDrawer.passwordInputContainer.waitForDisplayed({
        reverse: true
      });
      expect(await CollateralDrawer.collateralDescription.getText()).to.equal(
        await t('browserView.settings.wallet.collateral.reclaimDescription')
      );
      expect(await CollateralDrawer.collateralBannerDescription.getText()).to.equal(
        await t('browserView.settings.wallet.collateral.reclaimBanner')
      );
      expect(await CollateralDrawer.collateralButton.getText()).to.equal(
        await t('browserView.settings.wallet.collateral.reclaimCollateral')
      );
    }
  }

  async assertSeeCollateralNotEnoughAdaDrawer() {
    await CollateralDrawer.collateralButton.waitForClickable();
    await CollateralDrawer.passwordInputContainer.waitForClickable({
      reverse: true
    });
    expect(await CollateralDrawer.drawerHeaderTitle.getText()).to.equal(
      await t('browserView.settings.wallet.collateral.title')
    );
    await CollateralDrawer.sadFaceIcon.waitForDisplayed();
    expect(await CollateralDrawer.error.getText()).to.equal(
      await t('browserView.settings.wallet.collateral.notEnoughAda')
    );
    expect(await CollateralDrawer.collateralDescription.getText()).to.equal(
      await t('browserView.settings.wallet.collateral.amountDescription')
    );
    expect(await CollateralDrawer.collateralButton.getText()).to.equal(
      await t('browserView.settings.wallet.collateral.close')
    );
  }

  async assertSeeCurrentCollateralState(expectedState: string) {
    await browser.waitUntil(async () => (await SettingsPage.collateralLink.addon.getText()) === expectedState, {
      timeout: 25_000,
      interval: 1000,
      timeoutMsg: 'failed while waiting for collateral state change'
    });
  }
}

export default new CollateralDrawerAssert();
