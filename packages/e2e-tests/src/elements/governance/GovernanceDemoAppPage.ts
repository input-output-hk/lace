import DAppConnectorPageObject from '../../pageobject/dAppConnectorPageObject';
import { GovernanceDemoAppDetails } from '../../assert/governance/GovernanceDemoAppDetails';

// App is not adjusted for testing e.g. lack of custom testIDs
// https://ryun1.github.io/cip95-cardano-wallet-connector/
class GovernanceDemoAppPage {
  private VOTE_DELEGATION_TAB_BUTTON = '#bp3-tab-title_cip95-basic_1';
  private VOTE_DELEGATION_TAB_CONTENT = '//div[@id="bp3-tab-panel_cip95-basic_1"]';
  private VOTE_DELEGATION_TARGET_OF_VOTE_DELEGATION_INPUT = `(${this.VOTE_DELEGATION_TAB_CONTENT}//input[@class="bp3-input"])[1]`;
  private VOTE_DELEGATION_STAKE_CREDENTIAL_INPUT = `(${this.VOTE_DELEGATION_TAB_CONTENT}//input[@class="bp3-input"])[2]`;
  private BUILD_VOTE_DELEGATION_CERT_AND_ADD_TO_TX_BUTTON = `${this.VOTE_DELEGATION_TAB_CONTENT}//button[text()="Build cert, add to Tx"]`;

  private DREP_REGISTRATION_TAB_BUTTON = '#bp3-tab-title_cip95-basic_2';
  private DREP_REGISTRATION_TAB_CONTENT = '//div[@id="bp3-tab-panel_cip95-basic_2"]';
  private DREP_REGISTRATION_DREP_ID_INPUT = `(${this.DREP_REGISTRATION_TAB_CONTENT}//input[@class="bp3-input"])[1]`;
  private DREP_REGISTRATION_DEPOSIT_AMOUNT_INPUT = `(${this.DREP_REGISTRATION_TAB_CONTENT}//input[@class="bp3-input"])[2]`;
  private DREP_REGISTRATION_METADATA_URL_INPUT = `(${this.DREP_REGISTRATION_TAB_CONTENT}//input[@class="bp3-input"])[3]`;
  private DREP_REGISTRATION_METADATA_HASH_INPUT = `(${this.DREP_REGISTRATION_TAB_CONTENT}//input[@class="bp3-input"])[4]`;
  private BUILD_DREP_REGISTRATION_CERT_AND_ADD_TO_TX_BUTTON = `${this.DREP_REGISTRATION_TAB_CONTENT}//button[text()="Build cert, add to Tx"]`;

  private DREP_UPDATE_TAB_BUTTON = '#bp3-tab-title_cip95-basic_3';
  private DREP_UPDATE_TAB_CONTENT = '//div[@id="bp3-tab-panel_cip95-basic_2"]';
  private DREP_UPDATE_METADATA_URL_INPUT = `(${this.DREP_UPDATE_TAB_CONTENT}//input[@class="bp3-input"])[1]`;
  private DREP_UPDATE_METADATA_HASH_INPUT = `(${this.DREP_UPDATE_TAB_CONTENT}//input[@class="bp3-input"])[2]`;
  private BUILD_DREP_UPDATE_CERT_AND_ADD_TO_TX_BUTTON = `${this.DREP_UPDATE_TAB_CONTENT}//button[text()="Build cert, add to Tx"]`;

  private DREP_RETIREMENT_TAB_BUTTON = '#bp3-tab-title_cip95-basic_4';
  private DREP_RETIREMENT_TAB_CONTENT = '//div[@id="bp3-tab-panel_cip95-basic_4"]';
  private DREP_RETIREMENT_DEPOSIT_REFUND_AMOUNT_INPUT = `${this.DREP_RETIREMENT_TAB_CONTENT}//input`;
  private BUILD_DREP_RETIREMENT_CERT_AND_ADD_TO_TX_BUTTON = `${this.DREP_RETIREMENT_TAB_CONTENT}//button[text()="Build cert, add to Tx"]`;

  private SIGN_AND_SUBMIT_TX_BUTTON = '//button[text()=".signTx() and .submitTx()"]';

  get voteDelegationTabButton() {
    return $(this.VOTE_DELEGATION_TAB_BUTTON);
  }

  get dRepRegistrationTabButton() {
    return $(this.DREP_REGISTRATION_TAB_BUTTON);
  }

  get dRepUpdateTabButton() {
    return $(this.DREP_UPDATE_TAB_BUTTON);
  }

  get dRepRetirementTabButton() {
    return $(this.DREP_RETIREMENT_TAB_BUTTON);
  }

  get voteDelegationTargetOfVoteDelegationInput() {
    return $(this.VOTE_DELEGATION_TARGET_OF_VOTE_DELEGATION_INPUT);
  }

  get voteDelegationStakeCredentialInput() {
    return $(this.VOTE_DELEGATION_STAKE_CREDENTIAL_INPUT);
  }

  get buildVoteDelegationCertAndAddToTxButton() {
    return $(this.BUILD_VOTE_DELEGATION_CERT_AND_ADD_TO_TX_BUTTON);
  }

  get dRepRegistrationDRepIdInput() {
    return $(this.DREP_REGISTRATION_DREP_ID_INPUT);
  }

  get dRepRegistrationDepositAmountInput() {
    return $(this.DREP_REGISTRATION_DEPOSIT_AMOUNT_INPUT);
  }

  get dRepRegistrationMetadataUrlInput() {
    return $(this.DREP_REGISTRATION_METADATA_URL_INPUT);
  }

  get dRepRegistrationMetadataHashInput() {
    return $(this.DREP_REGISTRATION_METADATA_HASH_INPUT);
  }

  get dRepRegistrationCertAndAddToTxButton() {
    return $(this.BUILD_DREP_REGISTRATION_CERT_AND_ADD_TO_TX_BUTTON);
  }

  get dRepUpdateMetadataUrlInput() {
    return $(this.DREP_UPDATE_METADATA_URL_INPUT);
  }

  get dRepUpdateMetadataHashInput() {
    return $(this.DREP_UPDATE_METADATA_HASH_INPUT);
  }

  get dRepUpdateCertAndAddToTxButton() {
    return $(this.BUILD_DREP_UPDATE_CERT_AND_ADD_TO_TX_BUTTON);
  }

  get dRepRetirementDepositRefundAmountInput() {
    return $(this.DREP_RETIREMENT_DEPOSIT_REFUND_AMOUNT_INPUT);
  }

  get dRepRetirementCertAndAddToTxButton() {
    return $(this.BUILD_DREP_RETIREMENT_CERT_AND_ADD_TO_TX_BUTTON);
  }

  get signAndSubmitButton() {
    return $(this.SIGN_AND_SUBMIT_TX_BUTTON);
  }

  async openAndAuthorize() {
    await browser.newWindow(GovernanceDemoAppDetails.dAppUrlLong);
    await DAppConnectorPageObject.waitAndSwitchToDAppConnectorWindow(3);
    await DAppConnectorPageObject.clickButtonInDAppAuthorizationWindow('Authorize');
    await DAppConnectorPageObject.clickButtonInDAppAuthorizationModal('Always');
    await browser.pause(1000);
    await browser.switchWindow(/Demos dApp/);
  }

  async fillVoteDelegationTargetOfVoteDelegation(target: string) {
    await this.voteDelegationTargetOfVoteDelegationInput.waitForEnabled();
    await this.voteDelegationTargetOfVoteDelegationInput.setValue(target);
  }

  async fillVoteDelegationStakeCredential(stakeCredential: string) {
    await this.voteDelegationStakeCredentialInput.waitForEnabled();
    await this.voteDelegationStakeCredentialInput.setValue(stakeCredential);
  }
}

export default new GovernanceDemoAppPage();
