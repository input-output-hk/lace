import { When } from '@wdio/cucumber-framework';
import { Given, Then } from '@cucumber/cucumber';
import NftsPage from '../elements/NFTs/nftsPage';
import nftCreateFolderAssert from '../assert/nftCreateFolderAssert';
import NftCreateFolderPage from '../elements/NFTs/nftCreateFolderPage';
import YoullHaveToStartAgainModal from '../elements/NFTs/youllHaveToStartAgainModal';

Given(
  /^I (see|do not see) "Create folder" button on NFTs page in (popup|extended) mode$/,
  async (shouldSee: 'see' | 'do not see', mode: 'extended' | 'popup') => {
    await nftCreateFolderAssert.assertSeeCreateFolderButton(shouldSee === 'see', mode);
  }
);

When(/^I click "Create folder" button on NFTs page$/, async () => {
  await NftsPage.createFolderButton.click();
});

Then(
  /^I (see|do not see) "Create NFT folder" page in (popup|extended) mode$/,
  async (shouldSee: 'see' | 'do not see', mode: 'extended' | 'popup') => {
    await nftCreateFolderAssert.assertSeeCreateFolderPage(shouldSee === 'see', mode);
  }
);

Then(/^"Folder name" input is empty on "Name your folder" page$/, async () => {
  await nftCreateFolderAssert.assertSeeEmptyNameInput();
});

Then(
  /^"Next" button is (enabled|disabled) on "Name your folder" page$/,
  async (isButtonEnabled: 'enabled' | 'disabled') => {
    await nftCreateFolderAssert.assertSeeNextButtonEnabled(isButtonEnabled === 'enabled');
  }
);

When(/^I enter a folder name "([^"]*)" into "Folder name" input$/, async (folderName: string) => {
  await NftCreateFolderPage.setFolderNameInput(folderName);
});

When(/^I clear "Folder name" input$/, async () => {
  await NftCreateFolderPage.clearFolderNameInput();
});

Then(/^I (see|don't see) "Folder name" input max length (\d+) error$/, async (shouldSee: string, maxLength: number) => {
  await nftCreateFolderAssert.assertSeeInputMaxLengthError(shouldSee === 'see', maxLength);
});

Then(/^I (see|don't see) "You'll have to start again" modal$/, async (shouldSee: string) => {
  await nftCreateFolderAssert.assertSeeYoullHaveToStartAgainModal(shouldSee === 'see');
});

Then(
  /^I (see|don't see) "Create NFT folder" drawer in (popup|extended) mode$/,
  async (shouldSee: string, mode: 'extended' | 'popup') => {
    await nftCreateFolderAssert.assertSeeCreateFolderPage(shouldSee === 'see', mode);
  }
);

Then(
  /^I click "(Agree|Cancel)" button on "You'll have to start again" modal for create NFTs folder$/,
  async (button: 'Agree' | 'Cancel') => {
    switch (button) {
      case 'Agree':
        await YoullHaveToStartAgainModal.agreeButton.waitForClickable();
        await YoullHaveToStartAgainModal.agreeButton.click();
        break;
      case 'Cancel':
        await YoullHaveToStartAgainModal.cancelButton.waitForClickable();
        await YoullHaveToStartAgainModal.cancelButton.click();
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
);
