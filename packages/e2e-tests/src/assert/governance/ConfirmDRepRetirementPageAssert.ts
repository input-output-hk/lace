import CommonGovernancePageAssert from './CommonGovernancePageAssert';
import { GovernanceDemoAppDetails } from './GovernanceDemoAppDetails';
import { expect } from 'chai';
import ConfirmDRepRetirementPage from '../../elements/governance/ConfirmDRepRetirementPage';
import { t } from '../../utils/translationService';

class ConfirmDRepRetirementPageAssert extends CommonGovernancePageAssert {
  async assertSeeConfirmDRepRetirementPage(
    expectedDRepID: string,
    expectedDepositReturned: string,
    shouldDRepMatch = true
  ) {
    await this.assertSeeHeader();
    await this.assertSeeTitle('core.DRepRetirement.title');
    await this.assertSeeGovernanceDemoAppDetails(
      GovernanceDemoAppDetails.dAppName,
      GovernanceDemoAppDetails.dAppUrlShort,
      GovernanceDemoAppDetails.dAppLogoSrc
    );

    await ConfirmDRepRetirementPage.errorPane.waitForDisplayed({ reverse: !shouldDRepMatch });
    if (shouldDRepMatch) {
      expect(await ConfirmDRepRetirementPage.errorPane.getText()).to.equal(
        await t('core.DRepRetirement.isNotOwnRetirement')
      );
    }

    await this.assertSeeMetadataHeader('core.DRepRetirement.metadata');

    await ConfirmDRepRetirementPage.dRepIdLabel.waitForDisplayed();
    expect(await ConfirmDRepRetirementPage.dRepIdLabel.getText()).to.equal('core.DRepRetirement.drepId');
    await ConfirmDRepRetirementPage.dRepIdValue.waitForDisplayed();
    expect(await ConfirmDRepRetirementPage.dRepIdValue.getText()).to.equal(expectedDRepID);

    await ConfirmDRepRetirementPage.depositReturnedLabel.waitForDisplayed();
    expect(await ConfirmDRepRetirementPage.depositReturnedLabel.getText()).to.equal(
      await t('core.DRepRetirement.depositReturned')
    );
    await ConfirmDRepRetirementPage.depositReturnedValue.waitForDisplayed();
    expect(await ConfirmDRepRetirementPage.depositReturnedValue.getText()).to.equal(expectedDepositReturned);

    await this.assertSeeButtons();
  }
}

export default new ConfirmDRepRetirementPageAssert();
