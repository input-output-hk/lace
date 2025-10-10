import { expect } from 'chai';

import ConfigureMidnightPage from '../../elements/onboarding/ConfigureMidnightPage';
import { Constants } from '../../setup/Constants';
import { t } from '../../utils/translationService';

import OnboardingCommonAssert from './onboardingCommonAssert';

class ConfigureMidnightPageAssert extends OnboardingCommonAssert {
  async assertSeeNetworkSection() {
    await ConfigureMidnightPage.networkSectionLabel.waitForDisplayed();
    // TODO: update translation keys when LW-13474 is merged
    expect(await ConfigureMidnightPage.networkSectionLabel.getText()).to.equal(
      await t('midnight.network-config.network-label')
    );
    await ConfigureMidnightPage.networkOptionTestnet.waitForDisplayed();
    expect(await ConfigureMidnightPage.networkOptionTestnet.getText()).to.equal(
      await t('midnight.network-config.network-option.2')
    );
    await ConfigureMidnightPage.networkOptionUndeployed.waitForDisplayed();
    expect(await ConfigureMidnightPage.networkOptionUndeployed.getText()).to.equal(
      await t('midnight.network-config.network-option.0')
    );
  }

  async assertSeeEnterWalletButton() {
    await ConfigureMidnightPage.enterWalletButton.waitForDisplayed();
    expect(await ConfigureMidnightPage.enterWalletButton.getText()).to.equal(await t('onboarding.steps.enter-wallet'));
  }

  async assertSeeProofServerSection(midnightNetwork: 'testnet' | 'undeployed' = 'testnet') {
    await ConfigureMidnightPage.proofServerSectionLabel.waitForDisplayed();
    expect(await ConfigureMidnightPage.proofServerSectionLabel.getText()).to.equal(
      await t('midnight.network-config.proof-server-label')
    );

    await ConfigureMidnightPage.proofServerOptionLocal.waitForDisplayed();
    const proofServerValue = await ConfigureMidnightPage.proofServerOptionLocal.getText();
    expect(proofServerValue).to.include(Constants.MIDNIGHT_PROOF_SERVER_ADDRESS);
    expect(proofServerValue).to.include(await t('midnight.network-config.proof-server-option.local'));

    await ConfigureMidnightPage.nodeAddressInputLabel.waitForDisplayed();
    expect(await ConfigureMidnightPage.nodeAddressInputLabel.getText()).to.equal(
      await t('midnight.network-config.node-address')
    );
    await ConfigureMidnightPage.nodeAddressInput.waitForDisplayed();
    const expectedNodeAddress =
      midnightNetwork === 'undeployed' ? Constants.NODE_ADDRESS_UNDEPLOYED : Constants.NODE_ADDRESS_TESTNET;
    expect(await ConfigureMidnightPage.nodeAddressInput.getValue()).to.equal(expectedNodeAddress);

    await ConfigureMidnightPage.indexerAddressInputLabel.waitForDisplayed();
    expect(await ConfigureMidnightPage.indexerAddressInputLabel.getText()).to.equal(
      await t('midnight.network-config.indexer-address')
    );
    await ConfigureMidnightPage.indexerAddressInput.waitForDisplayed();
    const expectedIndexerAddress =
      midnightNetwork === 'undeployed' ? Constants.INDEXER_ADDRESS_UNDEPLOYED : Constants.INDEXER_ADDRESS_TESTNET;
    expect(await ConfigureMidnightPage.indexerAddressInput.getValue()).to.equal(expectedIndexerAddress);
  }

  async assertSeeConfigureMidnightPage() {
    await this.assertSeeTopLaceLogo();
    await this.assertSeeHelpAndSupportButton();
    await this.assertSeeStepTitle(await t('onboarding.midnight.settings.title'));
    await this.assertSeeStepSubtitle(await t('onboarding.midnight.settings.description'));
    await this.assertSeeNetworkSection();
    await this.assertSeeProofServerSection();
    await this.assertSeeBackButton();
    await this.assertSeeEnterWalletButton();
    await this.assertSeeMidnightCompatibilityInfo();
    await this.assertSeeLegalLinks();
  }
}

export default new ConfigureMidnightPageAssert();
