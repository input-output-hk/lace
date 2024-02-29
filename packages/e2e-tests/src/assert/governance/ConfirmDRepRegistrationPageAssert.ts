import { expect } from 'chai';
import { t } from '../../utils/translationService';
import ConfirmDRepRegistrationPage from '../../elements/governance/ConfirmDRepRegistrationPage';
import CommonGovernancePageAssert from './CommonGovernancePageAssert';
import { GovernanceDemoAppDetails } from './GovernanceDemoAppDetails';

class ConfirmDRepRegistrationPageAssert extends CommonGovernancePageAssert {
  async assertSeeConfirmDRepRegistrationPage(
    expectedDRepID: string,
    expectedMetadataUrl?: string,
    expectedMetadataHash?: string
  ) {
    await this.assertSeeHeader();
    await this.assertSeeTitle('core.DRepRegistration.title');
    await this.assertSeeGovernanceDemoAppDetails(
      GovernanceDemoAppDetails.dAppName,
      GovernanceDemoAppDetails.dAppUrlShort,
      GovernanceDemoAppDetails.dAppLogoSrc
    );
    await this.assertSeeMetadataHeader('core.DRepRegistration.metadata');

    await ConfirmDRepRegistrationPage.urlLabel.waitForDisplayed({ reverse: expectedMetadataUrl === '-' });
    await ConfirmDRepRegistrationPage.urlValue.waitForDisplayed({ reverse: expectedMetadataUrl === '-' });
    if (expectedMetadataUrl !== '-') {
      expect(await ConfirmDRepRegistrationPage.urlLabel.getText()).to.equal(await t('core.DRepRegistration.url'));
      expect(await ConfirmDRepRegistrationPage.urlValue.getText()).to.equal(expectedMetadataUrl);
    }

    await ConfirmDRepRegistrationPage.hashLabel.waitForDisplayed({ reverse: expectedMetadataHash === '-' });
    await ConfirmDRepRegistrationPage.hashValue.waitForDisplayed({ reverse: expectedMetadataHash === '-' });
    if (expectedMetadataHash !== '-') {
      expect(await ConfirmDRepRegistrationPage.hashLabel.getText()).to.equal(await t('core.DRepRegistration.hash'));
      expect(await ConfirmDRepRegistrationPage.hashValue.getText()).to.equal(expectedMetadataHash);
    }

    await ConfirmDRepRegistrationPage.dRepIdLabel.waitForDisplayed();
    expect(await ConfirmDRepRegistrationPage.dRepIdLabel.getText()).to.equal('core.DRepRegistration.drepId');
    await ConfirmDRepRegistrationPage.dRepIdValue.waitForDisplayed();
    expect(await ConfirmDRepRegistrationPage.dRepIdValue.getText()).to.equal(expectedDRepID);
    await ConfirmDRepRegistrationPage.depositPaidLabel.waitForDisplayed();
    expect(await ConfirmDRepRegistrationPage.depositPaidLabel.getText()).to.equal(
      await t('core.DRepRegistration.depositPaid')
    );
    await ConfirmDRepRegistrationPage.depositPaidValue.waitForDisplayed();
    expect(await ConfirmDRepRegistrationPage.depositPaidValue.getText()).to.equal('2.00 tADA');

    await this.assertSeeButtons();
  }
}

export default new ConfirmDRepRegistrationPageAssert();
