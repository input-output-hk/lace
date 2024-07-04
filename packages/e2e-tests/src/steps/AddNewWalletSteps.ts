import { Then } from '@cucumber/cucumber';
import AddNewWalletAssert from '../assert/AddNewWalletAssert';

Then(/^I see onboarding main screen within modal over the active Lace page in expanded view$/, async () => {
  await AddNewWalletAssert.assertMainModalIsDisplayedInExtendedMode();
});
