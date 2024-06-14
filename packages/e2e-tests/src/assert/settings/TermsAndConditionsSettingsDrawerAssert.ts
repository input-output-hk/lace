import TermsAndConditionsDrawer from '../../elements/settings/TermsAndConditionsDrawer';
import { removeWhitespacesFromText } from '../../utils/textUtils';
import { readFromFile } from '../../utils/fileUtils';
import { isPopupMode } from '../../utils/pageUtils';
import { browser } from '@wdio/globals';

class TermsAndConditionsSettingsDrawerAssert {
  assertTermsAndConditionsContent = async () => {
    (await isPopupMode())
      ? await TermsAndConditionsDrawer.drawerHeaderBackButton.waitForClickable()
      : await TermsAndConditionsDrawer.drawerHeaderCloseButton.waitForClickable();
    await TermsAndConditionsDrawer.termsAndConditionsContent.waitForDisplayed();

    const expectedPolicy = await removeWhitespacesFromText(
      readFromFile(import.meta.dirname, './termsAndConditions.txt')
    );

    await browser.waitUntil(
      async () =>
        (await removeWhitespacesFromText(await TermsAndConditionsDrawer.termsAndConditionsContent.getText())) ===
        expectedPolicy,
      {
        timeout: 3000,
        interval: 1000,
        timeoutMsg: `failed while waiting for expected T&C policy text
        expected: ${expectedPolicy}
        current: ${await removeWhitespacesFromText(await TermsAndConditionsDrawer.termsAndConditionsContent.getText())}
        `
      }
    );
  };
}

export default new TermsAndConditionsSettingsDrawerAssert();
