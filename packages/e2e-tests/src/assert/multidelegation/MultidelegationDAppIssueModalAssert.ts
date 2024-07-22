import MultidelegationDAppIssueModal from '../../elements/multidelegation/MultidelegationDAppIssueModal';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class MultidelegationDAppIssueModalAssert {
  assertSeeModal = async (shouldSee: boolean) => {
    await MultidelegationDAppIssueModal.container.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      await MultidelegationDAppIssueModal.title.waitForDisplayed();
      expect(await MultidelegationDAppIssueModal.title.getText()).to.equal(await t('modals.dapp.title'));
      await MultidelegationDAppIssueModal.description.waitForDisplayed();
      const descriptionTranslation = await t('modals.dapp.description');
      const expectedDescription = descriptionTranslation.replace('<Link>', '').replace('</Link>', '');
      expect(await MultidelegationDAppIssueModal.description.getText()).to.equal(expectedDescription);
      expect(await MultidelegationDAppIssueModal.description.$('a').getProperty('href')).to.equal(
        'https://www.lace.io/faq?question=why-do-some-dapps-behave-unexpectedly-when-they-start-using-multi-delegation'
      );
      await MultidelegationDAppIssueModal.gotItButton.waitForDisplayed();
      expect(await MultidelegationDAppIssueModal.gotItButton.getText()).to.equal(await t('modals.dapp.button'));
    }
  };
}

export default new MultidelegationDAppIssueModalAssert();
