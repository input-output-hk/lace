import { Then, When } from '@cucumber/cucumber';
import GovernanceDemoAppPage from '../elements/governance/GovernanceDemoAppPage';
import ConfirmVoteDelegationPageAssert from '../assert/governance/ConfirmVoteDelegationPageAssert';
import ConfirmDRepRegistrationPageAssert from '../assert/governance/ConfirmDRepRegistrationPageAssert';
import ConfirmDRepUpdatePageAssert from '../assert/governance/ConfirmDRepUpdatePageAssert';
import ConfirmDRepRetirementPageAssert from '../assert/governance/ConfirmDRepRetirementPageAssert';
import ConfirmVoteDelegationPage from '../elements/governance/ConfirmVoteDelegationPage';
import ConfirmDRepRegistrationPage from '../elements/governance/ConfirmDRepRegistrationPage';
import ConfirmDRepRetirementPage from '../elements/governance/ConfirmDRepRetirementPage';
import ConfirmDRepUpdatePage from '../elements/governance/ConfirmDRepUpdatePage';
import GovernanceActionAllDonePageAssert from '../assert/governance/GovernanceActionAllDonePageAssert';

When(/^I open and authorize Governance Demo App$/, async () => {
  await GovernanceDemoAppPage.openAndAuthorize();
});

When(/^I open "Vote Delegation" form$/, async () => {
  await GovernanceDemoAppPage.voteDelegationTabButton.waitForClickable();
  await GovernanceDemoAppPage.voteDelegationTabButton.click();
});

When(/^I enter "([^"]*)" into "Target of Vote Delegation" field on "Vote Delegation" form$/, async (target: string) => {
  await GovernanceDemoAppPage.fillVoteDelegationTargetOfVoteDelegation(target);
});

When(/^I enter "([^"]*)" into "Stake Credential" field on "Vote Delegation" form$/, async (target: string) => {
  await GovernanceDemoAppPage.fillVoteDelegationStakeCredential(target);
});

When(
  /^I build and submit "(Vote Delegation|DRep Registration|DRep Update|DRep Retirement|Vote)" transaction$/,
  async (transactionType: 'Vote Delegation' | 'DRep Registration' | 'DRep Update' | 'DRep Retirement' | 'Vote') => {
    switch (transactionType) {
      case 'Vote Delegation':
        await GovernanceDemoAppPage.voteDelegationBuildCertAndAddToTxButton.waitForClickable();
        await GovernanceDemoAppPage.voteDelegationBuildCertAndAddToTxButton.click();
        break;
      case 'DRep Registration':
        await GovernanceDemoAppPage.dRepRegistrationBuildCertAndAddToTxButton.waitForClickable();
        await GovernanceDemoAppPage.dRepRegistrationBuildCertAndAddToTxButton.click();
        break;
      case 'DRep Update':
        await GovernanceDemoAppPage.dRepUpdateBuildCertAndAddToTxButton.waitForClickable();
        await GovernanceDemoAppPage.dRepUpdateBuildCertAndAddToTxButton.click();
        break;
      case 'DRep Retirement':
        await GovernanceDemoAppPage.dRepRetirementBuildCertAndAddToTxButton.waitForClickable();
        await GovernanceDemoAppPage.dRepRetirementBuildCertAndAddToTxButton.click();
        break;
      case 'Vote':
        // TODO
        break;
    }
    await GovernanceDemoAppPage.signAndSubmitButton.click();
  }
);

Then(/^"Confirm vote delegation" window with "([^"]*)" target is displayed$/, async (target: string) => {
  await ConfirmVoteDelegationPageAssert.assertSeeConfirmVoteDelegationPage(target);
});

Then(
  /^"Confirm DRep Registration" window with DRep ID "([^"]*)", Metadata URL "([^"]*)" and Metadata Hash "([^"]*)" is displayed$/,
  async (expectedDRepID: string, expectedUrl: string, expectedHash: string) => {
    await ConfirmDRepRegistrationPageAssert.assertSeeConfirmDRepRegistrationPage(
      expectedDRepID,
      expectedUrl,
      expectedHash
    );
  }
);

Then(
  /^"Confirm DRep Update" window with DRep ID "([^"]*)", Metadata URL "([^"]*)" and Metadata Hash "([^"]*)" is displayed$/,
  async (expectedDRepID: string, expectedUrl: string, expectedHash: string) => {
    await ConfirmDRepUpdatePageAssert.assertSeeConfirmDRepUpdatePage(expectedDRepID, expectedUrl, expectedHash);
  }
);

Then(
  /^"Confirm DRep Retirement" window with DRep ID "([^"]*)" and deposit returned "([^"]*)" is displayed$/,
  async (expectedDRepID: string, expectedDepositReturned: string) => {
    await ConfirmDRepRetirementPageAssert.assertSeeConfirmDRepRetirementPage(expectedDRepID, expectedDepositReturned);
  }
);

When(
  /^I click "(Cancel|Confirm)" button on "(Vote Delegation|DRep Registration|DRep Update|DRep Retirement|Vote)" window$/,
  async (
    button: 'Cancel' | 'Confirm',
    window: 'Vote Delegation' | 'DRep Registration' | 'DRep Update' | 'DRep Retirement' | 'Vote'
  ) => {
    switch (window) {
      case 'Vote Delegation':
        await ConfirmVoteDelegationPage.clickButton(button);
        break;
      case 'DRep Registration':
        await ConfirmDRepRegistrationPage.clickButton(button);
        break;
      case 'DRep Update':
        await ConfirmDRepUpdatePage.clickButton(button);
        break;
      case 'DRep Retirement':
        await ConfirmDRepRetirementPage.clickButton(button);
        break;
      case 'Vote':
        // TODO
        break;
      default:
        throw new Error(`Unsupported window: ${window}`);
    }
  }
);

Then(/^"All done" screen is displayed for governance transaction$/, async () => {
  await GovernanceActionAllDonePageAssert.assertSeeAllDonePage();
});
