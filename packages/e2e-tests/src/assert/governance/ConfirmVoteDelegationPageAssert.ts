import ConfirmVoteDelegationPage from '../../elements/governance/ConfirmVoteDelegationPage';
import { expect } from 'chai';
import { t } from '../../utils/translationService';
import CommonGovernancePageAssert from './CommonGovernancePageAssert';
import { GovernanceDemoAppDetails } from './GovernanceDemoAppDetails';

class ConfirmVoteDelegationPageAssert extends CommonGovernancePageAssert {
  async assertSeeConfirmVoteDelegationPage(target: string) {
    await this.assertSeeHeader();
    await this.assertSeeTitle('core.VoteDelegation.title');
    await this.assertSeeGovernanceDemoAppDetails(
      GovernanceDemoAppDetails.dAppName,
      GovernanceDemoAppDetails.dAppUrlShort,
      GovernanceDemoAppDetails.dAppLogoSrc
    );
    await this.assertSeeMetadataHeader('core.VoteDelegation.metadata');

    switch (target) {
      case 'abstain':
        await ConfirmVoteDelegationPage.abstainLabel.waitForDisplayed();
        expect(await ConfirmVoteDelegationPage.abstainLabel.getText()).to.equal(
          await t('core.VoteDelegation.alwaysAbstain')
        );
        await ConfirmVoteDelegationPage.abstainValue.waitForDisplayed();
        expect(await ConfirmVoteDelegationPage.abstainValue.getText()).to.equal(await t('core.VoteDelegation.option'));
        break;
      case 'no confidence':
        await ConfirmVoteDelegationPage.noConfidenceLabel.waitForDisplayed();
        expect(await ConfirmVoteDelegationPage.noConfidenceLabel.getText()).to.equal(
          await t('core.VoteDelegation.alwaysNoConfidence')
        );
        await ConfirmVoteDelegationPage.noConfidenceValue.waitForDisplayed();
        expect(await ConfirmVoteDelegationPage.noConfidenceValue.getText()).to.equal(
          await t('core.VoteDelegation.option')
        );
        break;
      default:
        await ConfirmVoteDelegationPage.dRepIdLabel.waitForDisplayed();
        expect(await ConfirmVoteDelegationPage.dRepIdLabel.getText()).to.equal(await t('core.VoteDelegation.drepId'));
        await ConfirmVoteDelegationPage.dRepIdValue.waitForDisplayed();
        expect(await ConfirmVoteDelegationPage.dRepIdValue.getText()).to.equal(target);
    }

    await this.assertSeeButtons();
  }
}

export default new ConfirmVoteDelegationPageAssert();
