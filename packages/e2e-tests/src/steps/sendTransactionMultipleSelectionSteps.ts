import { Then, When } from '@cucumber/cucumber';
import TokenSelectionPage from '../elements/newTransaction/tokenSelectionPage';

When(
  /^I click "(Add to transaction|Cancel|Clear|Select multiple)" button on asset picker drawer$/,
  async (button: 'Add to transaction' | 'Cancel' | 'Clear' | 'Select multiple') => {
    switch (button) {
      case 'Add to transaction':
        await TokenSelectionPage.addToTransactionButton.click();
        break;
      case 'Cancel':
        await TokenSelectionPage.cancelButton.click();
        break;
      case 'Clear':
        await TokenSelectionPage.clearButton.click();
        break;
      case 'Select multiple':
        await TokenSelectionPage.selectMultipleButton.click();
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
);

Then(
  /^I (see|do not see) "(Add to transaction|Cancel|Clear|Select multiple)" button on asset picker drawer$/,
  async (shouldSee: 'see' | 'do not see', button: 'Add to transaction' | 'Cancel' | 'Clear' | 'Select multiple') => {
    switch (button) {
      case 'Add to transaction':
        await TokenSelectionPage.addToTransactionButton.waitForDisplayed({ reverse: shouldSee !== 'see' });
        break;
      case 'Cancel':
        await TokenSelectionPage.cancelButton.waitForDisplayed({ reverse: shouldSee !== 'see' });
        break;
      case 'Clear':
        await TokenSelectionPage.clearButton.waitForDisplayed({ reverse: shouldSee !== 'see' });
        break;
      case 'Select multiple':
        await TokenSelectionPage.selectMultipleButton.waitForDisplayed({ reverse: shouldSee !== 'see' });
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
);
