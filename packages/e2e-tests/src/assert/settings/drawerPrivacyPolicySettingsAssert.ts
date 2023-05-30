import { PrivacyPolicySettingsDrawer } from '../../elements/settings/extendedView/privacyPolicySettingsDrawer';
import webTester from '../../actor/webTester';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import { readFromFile } from '../../utils/fileUtils';
import { removeWhitespacesFromText } from '../../utils/textUtils';

class DrawerTermsAndConditionsSettingsAssert {
  async assertPrivacyPolicyContent() {
    const policy = readFromFile(__dirname, '../settings/privacyPolicy.txt');
    const privacyPolicy = new PrivacyPolicySettingsDrawer();
    await webTester.waitUntilSeeElementContainingText(await t('browserView.settings.legal.privacyPolicy.title'));
    const content = String(await privacyPolicy.getPrivacyPolicyContent());
    await expect(await removeWhitespacesFromText(content)).to.equal(await removeWhitespacesFromText(policy));
  }
}

export default new DrawerTermsAndConditionsSettingsAssert();
