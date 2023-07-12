import EditAddressDrawer from '../../elements/addressbook/EditAddressDrawer';

class EditAddressDrawerAssert {
  async assertDoneButtonEnabled(shouldBeEnabled: boolean) {
    await EditAddressDrawer.doneButton.waitForEnabled({ reverse: !shouldBeEnabled });
  }
}

export default new EditAddressDrawerAssert();
