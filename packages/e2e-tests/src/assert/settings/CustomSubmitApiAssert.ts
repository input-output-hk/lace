import CustomSubmitApiDrawer from '../../elements/settings/CustomSubmitApiDrawer';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import { isPopupMode } from '../../utils/pageUtils';

class CustomSubmitApiAssert {
  private LEARN_SUBMIT_API_URL = 'https://github.com/IntersectMBO/cardano-node/tree/master/cardano-submit-api';
  private DEFAULT_SUBMIT_API = 'http://localhost:8090/api/submit/tx';

  async assertSeeCustomSubmitApiDrawer() {
    await CustomSubmitApiDrawer.drawerBody.waitForStable();
    await CustomSubmitApiDrawer.drawerBody.waitForClickable();
    await CustomSubmitApiDrawer.drawerNavigationTitle.waitForDisplayed({ reverse: await isPopupMode() });
    !(await isPopupMode()) &&
      expect(await CustomSubmitApiDrawer.drawerNavigationTitle.getText()).to.equal(
        await t('browserView.settings.heading')
      );

    await CustomSubmitApiDrawer.drawerHeaderBackButton.waitForDisplayed({ reverse: !(await isPopupMode()) });
    await CustomSubmitApiDrawer.drawerHeaderCloseButton.waitForDisplayed({ reverse: await isPopupMode() });

    await CustomSubmitApiDrawer.drawerHeaderTitle.waitForDisplayed();
    expect(await CustomSubmitApiDrawer.drawerHeaderTitle.getText()).to.equal(
      await t('browserView.settings.wallet.customSubmitApi.title')
    );

    await CustomSubmitApiDrawer.description.waitForDisplayed();
    const expectedDescription = `${await t('browserView.settings.wallet.customSubmitApi.description')} ${await t(
      'browserView.settings.wallet.customSubmitApi.descriptionLink'
    )}`;
    expect(await CustomSubmitApiDrawer.description.getText()).to.equal(expectedDescription);
    await CustomSubmitApiDrawer.learnMoreLink.waitForDisplayed();
    expect(await CustomSubmitApiDrawer.learnMoreLink.getAttribute('href')).to.equal(this.LEARN_SUBMIT_API_URL);

    await CustomSubmitApiDrawer.defaultAddress.waitForDisplayed();
    expect(await CustomSubmitApiDrawer.defaultAddress.getText()).to.equal(
      (await t('browserView.settings.wallet.customSubmitApi.defaultAddress')).replace(
        '{{url}}',
        this.DEFAULT_SUBMIT_API
      )
    );

    await CustomSubmitApiDrawer.urlInput.waitForDisplayed();
    expect(await CustomSubmitApiDrawer.urlInput.getValue()).to.equal(this.DEFAULT_SUBMIT_API);
    await CustomSubmitApiDrawer.urlInputLabel.waitForDisplayed();
    expect(await CustomSubmitApiDrawer.urlInputLabel.getText()).to.equal(
      await t('browserView.settings.wallet.customSubmitApi.inputLabel')
    );
  }

  async assertButtonClickable(button: 'Enable' | 'Disable') {
    switch (button) {
      case 'Enable':
        await CustomSubmitApiDrawer.enableButton.waitForClickable();
        break;
      case 'Disable':
        await CustomSubmitApiDrawer.disableButton.waitForClickable();
        break;
      default:
        throw new Error(`Unsupported button '${button}'`);
    }
  }

  async assertSeeValidationError(expectedError: string) {
    await CustomSubmitApiDrawer.validationError.waitForDisplayed();
    expect(await CustomSubmitApiDrawer.validationError.getText()).to.equal(expectedError);
  }
}

export default new CustomSubmitApiAssert();
