import { When, Then } from '@cucumber/cucumber';
import educationalListAssert from '../assert/educationalListAssert';
import educationalBannerPageObject from '../pageobject/educationalBannerPageObject';
import { switchToLastWindow } from '../utils/window';

Then(/^I see Address Book "About your wallet" widget with all relevant items$/, async () => {
  await educationalListAssert.assertSeeAddressBookWidget();
});

Then(/^I see Tokens "About your wallet" widget with all relevant items$/, async () => {
  await educationalListAssert.assertSeeTokensWidget();
});

Then(/^I see "More on NFTs" widget with all relevant items$/, async () => {
  await educationalListAssert.assertSeeNftsWidget();
});

When(/^I click on a widget item with subtitle: "([^"]*)"$/, async (subTitle: string) => {
  await educationalBannerPageObject.clickItemWithSubtitle(subTitle);
});

When(/^I see a "(FAQ|Glossary|Video)" article with title "([^"]*)"$/, async (type: string, subTitle: string) => {
  if (!['FAQ', 'Glossary', 'Video'].includes(type)) {
    throw new Error(`Unrecognised article type: ${subTitle}`);
  }
  if (type === 'FAQ') {
    await switchToLastWindow();
    await educationalListAssert.assertSeeFaqArticle(subTitle);
  }
  if (type === 'Glossary') {
    await switchToLastWindow();
    await educationalListAssert.assertSeeGlossaryArticle(subTitle);
  }
  if (type === 'Video') {
    await switchToLastWindow();
    await educationalListAssert.assertSeeVideoArticle(subTitle);
  }
});

Then(/^I see Transactions "Learn about" widget with all relevant items$/, async () => {
  await educationalListAssert.assertSeeTransactionsWidget();
});

Then(/^I see "About staking" widget with all relevant items$/, async () => {
  await educationalListAssert.assertSeeStakingWidget();
});

Then(
  /^I (see|do not see) the right side panel for (Tokens|NFTs|Transactions|Staking|Settings|Address Book) section$/,
  async (
    shouldSee: 'see' | 'do not see',
    section: 'Tokens' | 'NFTs' | 'Transactions' | 'Staking' | 'Settings' | 'Address Book'
  ) => {
    await educationalListAssert.assertSeeRightSidePanel(shouldSee === 'see', section);
  }
);
