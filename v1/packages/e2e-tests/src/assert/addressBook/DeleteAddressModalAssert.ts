import DeleteAddressModal from '../../elements/addressbook/DeleteAddressModal';
import { expect } from 'chai';
import { t } from '../../utils/translationService';
import { isPopupMode } from '../../utils/pageUtils';

class DeleteAddressModalAssert {
  assertSeeDeleteAddressModal = async (shouldSee: boolean) => {
    await DeleteAddressModal.container.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      await DeleteAddressModal.title.waitForDisplayed();
      expect(await DeleteAddressModal.title.getText()).to.equal(await t('browserView.addressBook.deleteModal.title'));
      await DeleteAddressModal.description.waitForDisplayed();
      const expectedDescription = (await isPopupMode())
        ? await t('browserView.addressBook.deleteModal.description')
        : `${await t('browserView.addressBook.deleteModal.description1')}\n${await t(
            'browserView.addressBook.deleteModal.description2'
          )}`;

      expect(await DeleteAddressModal.description.getText()).to.equal(expectedDescription);
      await DeleteAddressModal.cancelButton.waitForDisplayed();
      expect(await DeleteAddressModal.cancelButton.getText()).to.equal(
        await t('browserView.addressBook.deleteModal.buttons.cancel')
      );
      await DeleteAddressModal.deleteAddressButton.waitForDisplayed();
      expect(await DeleteAddressModal.deleteAddressButton.getText()).to.equal(
        await t('browserView.addressBook.deleteModal.buttons.confirm')
      );
    }
  };
}

export default new DeleteAddressModalAssert();
