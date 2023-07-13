import TermsAndConditionsDrawer from '../../elements/settings/TermsAndConditionsDrawer';
import { expect } from 'chai';
import { removeWhitespacesFromText } from '../../utils/textUtils';
import { readFromFile } from '../../utils/fileUtils';
import { isPopupMode } from '../../utils/pageUtils';

class TermsAndConditionsSettingsDrawerAssert {
  assertTermsAndConditionsContent = async () => {
    (await isPopupMode())
      ? await TermsAndConditionsDrawer.drawerHeaderBackButton.waitForClickable()
      : await TermsAndConditionsDrawer.drawerHeaderCloseButton.waitForClickable();
    await TermsAndConditionsDrawer.termsAndConditionsContent.waitForDisplayed();
    const actualContent = await removeWhitespacesFromText(
      await TermsAndConditionsDrawer.termsAndConditionsContent.getText()
    );
    const expectedContent = await removeWhitespacesFromText(readFromFile(__dirname, './termsAndConditions.txt'));
    await expect(actualContent).to.equal(expectedContent);
  };
}

export default new TermsAndConditionsSettingsDrawerAssert();
