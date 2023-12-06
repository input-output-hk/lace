import CommonGovernancePageAssert from './CommonGovernancePageAssert';
import { GovernanceDemoAppDetails } from './GovernanceDemoAppDetails';
import { expect } from 'chai';
import { t } from '../../utils/translationService';
import ConfirmDRepUpdatePage from '../../elements/governance/ConfirmDRepUpdatePage';

class ConfirmDRepUpdatePageAssert extends CommonGovernancePageAssert {
  async assertSeeConfirmDRepUpdatePage(
    expectedDRepID: string,
    expectedMetadataUrl?: string,
    expectedMetadataHash?: string
  ) {
    await this.assertSeeHeader();
    await this.assertSeeTitle('core.DRepUpdate.title');
    await this.assertSeeGovernanceDemoAppDetails(
      GovernanceDemoAppDetails.dAppName,
      GovernanceDemoAppDetails.dAppUrlShort,
      GovernanceDemoAppDetails.dAppLogoSrc
    );
    await this.assertSeeMetadataHeader('core.DRepUpdate.metadata');

    await ConfirmDRepUpdatePage.urlLabel.waitForDisplayed({ reverse: expectedMetadataUrl === '-' });
    await ConfirmDRepUpdatePage.urlValue.waitForDisplayed({ reverse: expectedMetadataUrl === '-' });
    if (expectedMetadataUrl !== '-') {
      expect(await ConfirmDRepUpdatePage.urlLabel.getText()).to.equal(await t('core.DRepUpdate.url'));
      expect(await ConfirmDRepUpdatePage.urlValue.getText()).to.equal(expectedMetadataUrl);
    }

    await ConfirmDRepUpdatePage.hashLabel.waitForDisplayed({ reverse: expectedMetadataHash === '-' });
    await ConfirmDRepUpdatePage.hashValue.waitForDisplayed({ reverse: expectedMetadataHash === '-' });
    if (expectedMetadataHash !== '-') {
      expect(await ConfirmDRepUpdatePage.hashLabel.getText()).to.equal(await t('core.DRepUpdate.hash'));
      expect(await ConfirmDRepUpdatePage.hashValue.getText()).to.equal(expectedMetadataHash);
    }

    await ConfirmDRepUpdatePage.dRepIdLabel.waitForDisplayed();
    expect(await ConfirmDRepUpdatePage.dRepIdLabel.getText()).to.equal('core.DRepUpdate.drepId');
    await ConfirmDRepUpdatePage.dRepIdValue.waitForDisplayed();
    expect(await ConfirmDRepUpdatePage.dRepIdValue.getText()).to.equal(expectedDRepID);

    await this.assertSeeButtons();
  }
}

export default new ConfirmDRepUpdatePageAssert();
