import { AddressAddNew } from '../elements/addressbook/extendedview/AddressAddNew';
import { clearInputFieldValue, setInputFieldValue } from '../utils/inputFieldUtils';

class AddressBookExtendedPageObject {
  async fillName(name: string, inDrawer: boolean) {
    await setInputFieldValue(new AddressAddNew(inDrawer).nameInput().toJSLocator(), name);
  }

  async fillAddress(address: string, inDrawer: boolean) {
    await setInputFieldValue(new AddressAddNew(inDrawer).addressInput().toJSLocator(), address);
  }

  async fillNameAndAddress(name: string, address: string, inDrawer: boolean) {
    await this.fillName(name, inDrawer);
    await this.fillAddress(address, inDrawer);
  }

  async deleteFieldContent(field: string, inDrawer: boolean) {
    field === 'Name'
      ? await clearInputFieldValue(new AddressAddNew(inDrawer).nameInput().toJSLocator())
      : await clearInputFieldValue(new AddressAddNew(inDrawer).addressInput().toJSLocator());
  }

  async clickToLoseFocus(inDrawer: boolean) {
    await $(new AddressAddNew(inDrawer).formTitle().toJSLocator()).click();
  }
}

export default new AddressBookExtendedPageObject();
