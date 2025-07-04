import VotingCenterPage from '../elements/VotingCenterPage';
import { expect } from 'chai';
import { t } from '../utils/translationService';
import { isPopupMode } from '../utils/pageUtils';

class VotingCenterPageAssert {
  async assertSeeVotingCenterBanner() {
    await VotingCenterPage.banner.waitForDisplayed();
    await VotingCenterPage.title.waitForDisplayed();
    expect(await VotingCenterPage.title.getText()).to.equal(await t('browserView.voting-beta.modal.title'));
    await VotingCenterPage.description.waitForDisplayed();
    const expectedDescriptionKey = (await isPopupMode())
      ? 'browserView.voting-beta.modal.description-popup'
      : 'browserView.voting-beta.modal.description';
    const expectedDescription = (await t(expectedDescriptionKey)).replaceAll('<br /><br />', '\n\n');
    expect(await VotingCenterPage.description.getProperty('innerText')).to.equal(expectedDescription);
    await VotingCenterPage.accessGovToolButton.waitForClickable();
    expect(await VotingCenterPage.accessGovToolButton.getText()).to.equal(
      await t('browserView.voting-beta.modal.govTool.cta')
    );
    await VotingCenterPage.accessTempoVoteButton.waitForClickable();
    expect(await VotingCenterPage.accessTempoVoteButton.getText()).to.equal(
      await t('browserView.voting-beta.modal.tempoVote.cta')
    );
  }
}

export default new VotingCenterPageAssert();
