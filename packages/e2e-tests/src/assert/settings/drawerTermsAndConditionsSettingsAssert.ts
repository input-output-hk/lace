import TermsAndConditionsSettingsDrawer from '../../elements/settings/termsAndConditionsSettingsDrawer';
import { expect } from 'chai';
import { removeWhitespacesFromText } from '../../utils/textUtils';
import { readFromFile } from '../../utils/fileUtils';

class DrawerTermsAndConditionsSettingsAssert {
  assertTermsAndConditionsContent = async () => {
    await TermsAndConditionsSettingsDrawer.termsAndConditionsContent.waitForDisplayed();
    const actualContent = await removeWhitespacesFromText(
      await TermsAndConditionsSettingsDrawer.termsAndConditionsContent.getText()
    );
    const expectedContent = await removeWhitespacesFromText(readFromFile(__dirname, './termsAndConditions.txt'));
    await expect(actualContent).to.equal(expectedContent);
  };
}

export default new DrawerTermsAndConditionsSettingsAssert();
