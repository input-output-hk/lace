import { Given, Then, When } from '@cucumber/cucumber';
import nftsPageObject from '../pageobject/nftsPageObject';
import drawerSendExtendedAssert from '../assert/drawerSendExtendedAssert';
import nftAssert from '../assert/nftAssert';
import NftDetails from '../elements/NFTs/nftDetails';

Then(
  /^NFT with name: "([^"]*)" (is displayed|is not displayed) in coin selector$/,
  async (nftName: string, state: string) => {
    await nftAssert.assertNftDisplayedInCoinSelector(nftName, state === 'is displayed');
  }
);

Given(
  /^I am on a NFT details on the (extended|popup) view for NFT with name: "([^"]*)"$/,
  async (mode: 'extended' | 'popup', nftName: string) => {
    await nftsPageObject.clickNftItemOnNftsPage(nftName);
    await nftAssert.assertSeeNftDetails(nftName, mode);
  }
);

When(/^I click "Send NFT" button on NFT details drawer$/, async () => {
  await NftDetails.sendNFTButton.click();
});

Then(/^"Send NFT" button (is|is not) displayed on NFT details drawer$/, async (shouldBeDisplayed: 'is' | 'is not') => {
  await nftAssert.assertSeeSendNFTButton(shouldBeDisplayed === 'is');
});

Given(/^I'm sending an NFT with name: "([^"]*)"$/, async (nftName: string) => {
  await nftsPageObject.progressWithSendUntilPasswordPage(nftName);
});

Given(/^the NFT is pre-loaded as token to be sent with name: "([^"]*)"$/, async (nftName: string) => {
  await drawerSendExtendedAssert.assertSeeCoinSelectorWithTitle(nftName);
});

Given(/^the amount in token input "([\d+])"$/, async (expectedCount: number) => {
  await drawerSendExtendedAssert.assertSeeCoinSelectorWithTokenInputValue(expectedCount);
});
