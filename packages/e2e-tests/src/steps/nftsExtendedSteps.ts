import { Given, Then, When } from '@cucumber/cucumber';
import nftsPageObject from '../pageobject/nftsPageObject';
import drawerSendExtendedAssert from '../assert/drawerSendExtendedAssert';
import nftAssert from '../assert/nftAssert';
import NftDetails from '../elements/NFTs/nftDetails';
import nftCreateFolderAssert from '../assert/nftCreateFolderAssert';
import nftSelectNftsAssert from '../assert/nftSelectNftsAssert';

Then(
  /^NFT with name: "([^"]*)" (is displayed|is not displayed) in coin selector$/,
  async (nftName: string, state: string) => {
    await nftAssert.assertNftDisplayedInCoinSelector(nftName, state === 'is displayed');
  }
);

Given(
  /^I am on a NFT details on the (extended|popup) view for NFT with name: "([^"]*)"$/,
  async (mode: 'extended' | 'popup', nftName: string) => {
    await nftAssert.assertSeeNftDetails(nftName, mode);
  }
);

When(/^I click "Send NFT" button on NFT details drawer$/, async () => {
  await NftDetails.sendNFTButton.click();
});

Then(/^"Send NFT" button (is|is not) displayed on NFT details drawer$/, async (shouldBeDisplayed: 'is' | 'is not') => {
  await nftAssert.assertSeeSendNFTButton(shouldBeDisplayed === 'is');
});

Given(/^I'm sending the NFT with name: "([^"]*)"$/, async (nftName: string) => {
  await nftsPageObject.progressWithSendUntilPasswordPage(nftName);
});

Given(/^I'm sending the NFT with name: "([^"]*)" with HD wallet$/, async (nftName: string) => {
  await nftsPageObject.progressWithSendUntilPasswordPage(nftName, true);
});

Given(/^the NFT is pre-loaded as token to be sent with name: "([^"]*)"$/, async (nftName: string) => {
  await drawerSendExtendedAssert.assertSeeCoinSelectorWithTitle(nftName);
});

Given(/^the amount in token input "([\d+])"$/, async (expectedCount: number) => {
  await drawerSendExtendedAssert.assertSeeCoinSelectorWithTokenInputValue(expectedCount);
});

Given(
  /^I see ADA handle NFT with custom image on the (NFTs|NFT folder|Select NFT|Coin selector) page$/,
  async (page: string) => {
    switch (page) {
      case 'NFTs':
        await nftAssert.assertSeeCustomAdaHandleNft();
        break;
      case 'NFT folder':
        await nftCreateFolderAssert.assertSeeNftItemWithCustomImg();
        break;
      case 'Select NFT':
        await nftSelectNftsAssert.assertSeeNftItemWithCustomImg();
        break;
      case 'Coin selector':
        await nftAssert.assertSeeCustomAdaHandleInCoinSelector();
        break;
      default:
        throw new Error(`Unsupported page: ${page}`);
    }
  }
);

Then(
  /^I see ADA handle NFT details page with custom image in (extended|popup) mode$/,
  async (mode: 'extended' | 'popup') => {
    await nftAssert.assertSeeCustomAdaHandleNftDetails(mode);
  }
);
