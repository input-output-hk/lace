import { MenuItemList } from '@utils/constants';
import { walletRoutePaths as routes } from '@routes/wallet-paths';
import styles from '@views/browser/components/SideMenu/SideMenuContent.module.scss';

import AssetsIconDefault from '@assets/icons/assets-icon.component.svg';
import AssetIconHover from '@assets/icons/hover-assets-icon.component.svg';
import AssetsIconActive from '@assets/icons/active-assets-icon.component.svg';

import NftIconDefault from '@assets/icons/nft-icon.component.svg';
import NftIconHover from '@assets/icons/hover-nft-icon.component.svg';
import NftIconActive from '@assets/icons/active-nft-icon.component.svg';

import TransactionsIconDefault from '@assets/icons/transactions-icon.component.svg';
import TransactionsIconHover from '@assets/icons/hover-transactions-icon.component.svg';
import TransactionsIconActive from '@assets/icons/active-transactions-icon.component.svg';

import StakingIconDefault from '@assets/icons/database-icon.component.svg';
import StakingIconHover from '@assets/icons/hover-database-icon.component.svg';
import StakingIconActive from '@assets/icons/active-database-icon.component.svg';

import DappExplorerIconDefault from '@assets/icons/tiles-outlined.component.svg';
import DappExplorerIconHover from '@assets/icons/tiles-outlined-gradient.component.svg';
import DappExplorerIconActive from '@assets/icons/tiles-solid-gradient.component.svg';

import VotingIconDefault from '@assets/icons/voting-icon.component.svg';
import VotingIconActive from '@assets/icons/active-voting-icon.component.svg';
import VotingIconHover from '@assets/icons/hover-voting-icon.component.svg';

import { SideMenuItemConfig } from '@types';

export const sideMenuConfig: SideMenuItemConfig[] = [
  {
    id: MenuItemList.ASSETS,
    label: 'browserView.sideMenu.links.tokens',
    testId: 'item-assets',
    path: routes.assets,
    regularIcon: AssetsIconDefault,
    hoverIcon: AssetIconHover,
    activeIcon: AssetsIconActive,
    iconClassName: styles.tokensLinkIcon
  },
  {
    id: MenuItemList.NFT,
    label: 'browserView.sideMenu.links.nfts',
    testId: 'item-nfts',
    path: routes.nfts,
    regularIcon: NftIconDefault,
    hoverIcon: NftIconHover,
    activeIcon: NftIconActive
  },
  {
    id: MenuItemList.TRANSACTIONS,
    label: 'browserView.sideMenu.links.activity',
    testId: 'item-transactions',
    path: routes.activity,
    regularIcon: TransactionsIconDefault,
    hoverIcon: TransactionsIconHover,
    activeIcon: TransactionsIconActive
  },
  {
    id: MenuItemList.STAKING,
    label: 'browserView.sideMenu.links.staking',
    testId: 'item-staking',
    path: routes.staking,
    regularIcon: StakingIconDefault,
    hoverIcon: StakingIconHover,
    activeIcon: StakingIconActive
  },
  {
    id: MenuItemList.DAPPS,
    label: 'browserView.sideMenu.links.dappExplorer',
    testId: 'item-dapps',
    path: routes.dapps,
    regularIcon: DappExplorerIconDefault,
    hoverIcon: DappExplorerIconHover,
    activeIcon: DappExplorerIconActive
  },
  {
    id: MenuItemList.VOTING,
    label: 'browserView.sideMenu.links.voting',
    testId: 'item-voting',
    path: routes.voting,
    regularIcon: VotingIconDefault,
    hoverIcon: VotingIconHover,
    activeIcon: VotingIconActive
  }
];
