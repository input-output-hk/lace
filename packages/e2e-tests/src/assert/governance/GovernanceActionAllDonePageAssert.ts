import { expect } from 'chai';
import { t } from '../../utils/translationService';
import GovernanceActionAllDonePage from '../../elements/governance/GovernanceActionAllDonePage';
import CommonGovernancePageAssert from './CommonGovernancePageAssert';

class GovernanceActionAllDonePageAssert extends CommonGovernancePageAssert {
  async assertSeeAllDonePage() {
    await this.assertSeeHeader();
    await GovernanceActionAllDonePage.image.waitForDisplayed();

    await GovernanceActionAllDonePage.heading.waitForDisplayed();
    expect(await GovernanceActionAllDonePage.heading.getText()).to.equal(
      await t('browserView.transaction.success.youCanSafelyCloseThisPanel')
    );

    await GovernanceActionAllDonePage.description.waitForDisplayed();
    expect(await GovernanceActionAllDonePage.description.getText()).to.equal(
      await t('core.dappTransaction.signedSuccessfully')
    );

    await GovernanceActionAllDonePage.closeButton.waitForDisplayed();
    expect(await GovernanceActionAllDonePage.closeButton.getText()).to.equal(await t('general.button.close'));
  }
}

export default new GovernanceActionAllDonePageAssert();
