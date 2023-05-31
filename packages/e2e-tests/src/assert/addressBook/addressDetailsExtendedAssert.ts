import webTester from '../../actor/webTester';
import { AddressDetails } from '../../elements/addressbook/extendedview/AddressDetails';
import { t } from '../../utils/translationService';

class AddressDetailsExtendedAssert {
  assertSeeAddressDetailsPage = async () => {
    const addressDetails = new AddressDetails();
    await webTester.waitUntilSeeElementContainingText(await t('browserView.addressBook.addressDetail.title'));
    await webTester.seeWebElement(addressDetails.title());
    await webTester.seeWebElement(addressDetails.name());
    await webTester.seeWebElement(addressDetails.address());
    await webTester.seeWebElement(addressDetails.copyButton());
    await webTester.seeWebElement(addressDetails.editButton());
    await webTester.seeWebElement(addressDetails.deleteButton());
  };
}

export default new AddressDetailsExtendedAssert();
