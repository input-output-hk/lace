import NFTPrintLabModal from '../elements/NFTs/NFTPrintLabModal';
import { expect } from 'chai';
import { t } from '../utils/translationService';

class NFTPrintLabModalAssert {
  async assertSeeModal(shouldBeDisplayed: boolean) {
    await NFTPrintLabModal.dialog.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      await NFTPrintLabModal.title.waitForDisplayed();
      expect(await NFTPrintLabModal.title.getText()).to.equal(await t('browserView.nfts.printlab.modal.title'));
      await NFTPrintLabModal.disclaimer.waitForDisplayed();
      expect(await NFTPrintLabModal.disclaimer.getText()).to.equal(
        await t('browserView.nfts.printlab.disclaimer.full.part1')
      );
      await NFTPrintLabModal.caption.waitForDisplayed();
      expect(await NFTPrintLabModal.caption.getText()).to.equal(
        await t('browserView.nfts.printlab.disclaimer.full.nftprintlabLinkCaption')
      );
      await NFTPrintLabModal.cancelButton.waitForDisplayed();
      expect(await NFTPrintLabModal.cancelButton.getText()).to.equal(await t('browserView.nfts.printlab.modal.cancel'));
      await NFTPrintLabModal.continueButton.waitForDisplayed();
      expect(await NFTPrintLabModal.continueButton.getText()).to.equal(
        await t('browserView.nfts.printlab.modal.continue')
      );
    }
  }
}

export default new NFTPrintLabModalAssert();
