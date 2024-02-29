import { expect } from 'chai';
import { t } from '../../utils/translationService';
import CommonGovernanceActionPageElements from '../../elements/governance/CommonGovernanceActionPageElements';

class CommonGovernancePageAssert {
  commonGovernanceActionPageElements;

  constructor() {
    this.commonGovernanceActionPageElements = new CommonGovernanceActionPageElements();
  }

  async assertSeeHeader(): Promise<void> {
    await this.commonGovernanceActionPageElements.headerLogo.waitForDisplayed();
    await this.commonGovernanceActionPageElements.betaPill.waitForDisplayed();
    expect(await this.commonGovernanceActionPageElements.betaPill.getText()).to.equal(await t('core.dapp.beta'));
  }

  async assertSeeTitle(expectedTitleKey: string): Promise<void> {
    await this.commonGovernanceActionPageElements.pageTitle.waitForDisplayed();
    expect(await this.commonGovernanceActionPageElements.pageTitle.getText()).to.equal(await t(expectedTitleKey));
  }

  async assertSeeGovernanceDemoAppDetails(
    expectedDAppName: string,
    expectedDAppUrl: string,
    expectedDAppLogoSrc: string
  ): Promise<void> {
    await this.commonGovernanceActionPageElements.dAppLogo.waitForDisplayed();
    expect(await this.commonGovernanceActionPageElements.headerLogo.$('img').getAttribute('src')).to.equal(
      expectedDAppLogoSrc
    );
    await this.commonGovernanceActionPageElements.dAppName.waitForDisplayed();
    expect(await this.commonGovernanceActionPageElements.dAppName.getText()).to.equal(expectedDAppName);
    await this.commonGovernanceActionPageElements.dAppUrl.waitForDisplayed();
    expect(await this.commonGovernanceActionPageElements.dAppUrl.getText()).to.equal(expectedDAppUrl);
  }

  async assertSeeMetadataHeader(expectedHeaderKey: string): Promise<void> {
    await this.commonGovernanceActionPageElements.metadataLabel.waitForDisplayed();
    expect(await this.commonGovernanceActionPageElements.metadataLabel.getText()).to.equal(await t(expectedHeaderKey));
  }

  async assertSeeButtons(): Promise<void> {
    await this.commonGovernanceActionPageElements.confirmButton.waitForDisplayed();
    expect(await this.commonGovernanceActionPageElements.confirmButton.getText()).to.equal(
      await t('dapp.confirm.btn.confirm')
    );
    await this.commonGovernanceActionPageElements.cancelButton.waitForDisplayed();
    expect(await this.commonGovernanceActionPageElements.cancelButton.getText()).to.equal(
      await t('dapp.confirm.btn.cancel')
    );
  }
}

export default CommonGovernancePageAssert;
