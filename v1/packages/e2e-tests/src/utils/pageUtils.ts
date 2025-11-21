import ExtendedView from '../page/extendedView';
import PopupView from '../page/popupView';
import { browser } from '@wdio/globals';
import MenuMainExtended from '../elements/menuMainExtended';
import MenuHeader from '../elements/menuHeader';
import MenuMainPopup from '../elements/menuMainPopup';
import NotificationsMenu from '../elements/notifications/NotificationsMenu';

// eslint-disable-next-line complexity
const visitPageInExtendedMode = async (
  page: 'Tokens' | 'NFTs' | 'Activity' | 'Staking' | 'Settings' | 'Address Book' | 'DApps' | 'Voting' | 'Notifications',
  viaURL = false
  // eslint-disable-next-line sonarjs/cognitive-complexity
) => {
  switch (page) {
    case 'Tokens':
      viaURL ? await ExtendedView.visitTokensPage() : await MenuMainExtended.clickOnTokensButton();
      break;
    case 'NFTs':
      viaURL ? await ExtendedView.visitNFTsPage() : await MenuMainExtended.clickOnNFTsButton();
      break;
    case 'Activity':
      viaURL ? await ExtendedView.visitActivityPage() : await MenuMainExtended.clickOnActivityButton();
      break;
    case 'Staking':
      viaURL ? await ExtendedView.visitStakingPage() : await MenuMainExtended.clickOnStakingButton();
      break;
    case 'Settings':
      viaURL ? await ExtendedView.visitSettings() : await MenuHeader.openSettings();
      break;
    case 'Address Book':
      viaURL ? await ExtendedView.visitAddressBook() : await MenuHeader.openAddressBook();
      break;
    case 'DApps':
      viaURL ? await ExtendedView.visitDAppExplorer() : await MenuMainExtended.clickOnDAppsButton();
      break;
    case 'Voting':
      viaURL ? await ExtendedView.visitVotingCenter() : await MenuMainExtended.clickOnVotingButton();
      break;
    case 'Notifications':
      if (viaURL) {
        await ExtendedView.visitNotificationsPage();
      } else {
        await MenuHeader.notificationsButton.click();
        await NotificationsMenu.clickOnButton('View all');
      }
      break;
    default:
      throw new Error(`Unsupported targetPage: ${page}`);
  }
};

// eslint-disable-next-line complexity
const visitPageInPopupMode = async (
  page: 'Tokens' | 'NFTs' | 'Activity' | 'Staking' | 'Settings' | 'Address Book' | 'DApps' | 'Voting' | 'Notifications',
  viaURL = false
  // eslint-disable-next-line sonarjs/cognitive-complexity
) => {
  switch (page) {
    case 'Tokens':
      viaURL ? await PopupView.visitTokensPage() : await MenuMainPopup.clickOnTokensButton();
      break;
    case 'NFTs':
      viaURL ? await PopupView.visitNFTsPage() : await MenuMainPopup.clickOnNFTsButton();
      break;
    case 'Activity':
      viaURL ? await PopupView.visitActivityPage() : await MenuMainPopup.clickOnActivityButton();
      break;
    case 'Staking':
      viaURL ? await PopupView.visitStakingPage() : await MenuMainPopup.clickOnStakingButton();
      break;
    case 'Settings':
      viaURL ? await PopupView.visitSettings() : await MenuHeader.openSettings();
      break;
    case 'Address Book':
      viaURL ? await PopupView.visitAddressBook() : await MenuHeader.openAddressBook();
      break;
    case 'DApps':
      viaURL ? await PopupView.visitDAppExplorer() : await MenuMainPopup.clickOnDAppsButton();
      break;
    case 'Voting':
      viaURL ? await PopupView.visitVotingCenter() : await MenuMainPopup.clickOnVotingButton();
      break;
    case 'Notifications':
      if (viaURL) {
        await PopupView.visitNotificationsPage();
      } else {
        await MenuHeader.notificationsButton.click();
        await NotificationsMenu.clickOnButton('View all');
      }
      break;
    default:
      throw new Error(`Unsupported targetPage: ${page}`);
  }
};

export const visit = async (
  page: 'Tokens' | 'NFTs' | 'Activity' | 'Staking' | 'Settings' | 'Address Book' | 'DApps' | 'Voting' | 'Notifications',
  mode: 'extended' | 'popup',
  viaURL = false
): Promise<void> => {
  await (mode === 'extended' ? visitPageInExtendedMode(page, viaURL) : visitPageInPopupMode(page, viaURL));
};

export const isPopupMode = async (): Promise<boolean> => (await browser.getUrl()).includes('popup.html');
