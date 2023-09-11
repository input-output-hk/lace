import { Translations } from '../types';

export const en: Translations = {
  'browsePools.stakePoolTableBrowser.addPool': 'Add pool',
  'browsePools.stakePoolTableBrowser.disabledTooltip': 'Maximum number of pools selected',
  'browsePools.stakePoolTableBrowser.emptyMessage': 'No results matching your search',
  'browsePools.stakePoolTableBrowser.searchInputPlaceholder': 'Search by pool name, ticker, or ID',
  'browsePools.stakePoolTableBrowser.stake': 'Stake',
  'browsePools.stakePoolTableBrowser.tableHeader.cost': 'Cost',
  'browsePools.stakePoolTableBrowser.tableHeader.poolName': 'Pool name',
  'browsePools.stakePoolTableBrowser.tableHeader.ros': 'ROS',
  'browsePools.stakePoolTableBrowser.tableHeader.saturation': 'Saturation',
  'browsePools.stakePoolTableBrowser.unselect': 'Unselect',
  'drawer.confirmation.button.confirm': 'Next',
  'drawer.confirmation.button.confirmWithDevice': 'Confirm with {{hardwareWallet}}',
  'drawer.confirmation.button.continueInAdvancedView': 'Continue in Advanced View',
  'drawer.confirmation.button.signing': 'Signing in progress',
  'drawer.confirmation.cardanoName': 'Cardano',
  'drawer.confirmation.chargedDepositAmountInfo': "The amount you'll be charged for registering your stake key.",
  'drawer.confirmation.errors.utxoBalanceInsufficient': 'Balance Insufficient',
  'drawer.confirmation.errors.utxoFullyDepleted': 'UTxO Fully Depleted',
  'drawer.confirmation.reclaimDepositAmountInfo': "The amount you'll be awarded for de-registering your stake key.",
  'drawer.confirmation.stakingDeposit': 'Staking deposit',
  'drawer.confirmation.subTitle': 'Confirm the amount and the stake pool',
  'drawer.confirmation.theAmountYoullBeChargedToProcessYourTransaction':
    "The amount you'll be charged to process your transaction",
  'drawer.confirmation.title': 'Confirmation',
  'drawer.confirmation.transactionCost.title': 'Transaction cost',
  'drawer.confirmation.transactionFee': 'Transaction fee',
  'drawer.confirmation.transactionReturn.title': 'Transaction return',
  'drawer.confirmation.transactionTotal.title': 'Total',
  'drawer.details.addStakingPool': 'Add staking pool',
  'drawer.details.information': 'Information',
  'drawer.details.manageDelegation': 'Manage delegation',
  'drawer.details.metrics.activeStake': 'Active stake',
  'drawer.details.metrics.apy': 'ROS',
  'drawer.details.metrics.delegators': 'Delegators',
  'drawer.details.metrics.saturation': 'Saturation',
  'drawer.details.owners': 'Owners',
  'drawer.details.poolIds': 'Pool IDs',
  'drawer.details.selectForMultiStaking': 'Select pool for multi-staking',
  'drawer.details.social': 'Social links',
  'drawer.details.stakeOnPoolButton': 'Stake all on this pool',
  'drawer.details.statistics': 'Statistics',
  'drawer.details.status.delegating': 'You are delegating to this pool',
  'drawer.details.status.retired': 'This pool is retired. Re-delegate to an other pool to receive rewards',
  'drawer.details.status.retiring': 'This pool is retiring. Re-delegate to an other pool to avoid losing rewards',
  'drawer.details.status.saturated': 'This pool is too saturated. Stake on another pool to avoid losing rewards',
  'drawer.details.unselectPool': 'Unselect pool',
  'drawer.failure.button.back': 'Back',
  'drawer.failure.button.close': 'Close',
  'drawer.failure.button.retry': 'Retry',
  'drawer.failure.subTitle': 'The transaction was not successful. Please try again.',
  'drawer.failure.title': 'Oops! Something went wrong...',
  'drawer.preferences.addPoolButton': 'Add stake pool',
  'drawer.preferences.nextButton': 'Next',
  'drawer.preferences.percentageOfBalance': '~{{value}} ADA (~{{percentage}}%)',
  'drawer.preferences.pickMorePools': 'You need to stake at least to one pool.',
  'drawer.preferences.selectedStakePools': 'Selected stake pools ({{count}})',
  'drawer.sign.confirmation.title': 'Staking confirmation',
  'drawer.sign.enterWalletPasswordToConfirmTransaction': 'Enter your wallet password to confirm transaction',
  'drawer.sign.error.invalidPassword': 'Wrong password',
  'drawer.sign.passwordPlaceholder': 'Password',
  'drawer.success.subTitle': "You'll start receiving your staking rewards after two epochs.",
  'drawer.success.switchedPools.subTitle':
    "You'll start receiving your staking rewards from the new pool after two epochs. Until then you'll continue receiving rewards from the previous one.",
  'drawer.success.switchedPools.title': "Hurray! You've switched pools",
  'drawer.success.title': "Hurray! You've staked your funds",
  'drawer.title': 'Stake pool detail',
  'drawer.titleSecond': 'Manage staking',
  'general.button.close': 'Close',
  'general.button.confirm': 'Confirm',
  'modals.beta.button': 'Got it',
  'modals.beta.description':
    'This feature allows you to stake to up to 5 pools. This is still in beta version, so some functionality might not be available. Read more about multi-delegation in our <Link>dedicated blog.</Link>',
  'modals.beta.pill': 'Beta',
  'modals.beta.title': 'Multi-delegation',
  'modals.changingPreferences.buttons.cancel': 'Cancel',
  'modals.changingPreferences.buttons.confirm': 'Fine by me',
  'modals.changingPreferences.description':
    "That's totally fine! Just please note that you'll continue receiving rewards from your former pool(s) for two epochs. After that, you'll start to receiving rewards from your new pool(s).",
  'modals.changingPreferences.title': 'Changing staking preferences?',
  'overview.banners.pendingFirstDelegation.message':
    'You will see your staking portfolio here once the transaction has been validated',
  'overview.banners.pendingFirstDelegation.title': 'Your staking transaction has been submitted',
  'overview.banners.pendingPoolMigration.message':
    'You will continue to receive rewards from your former stake pool(s) for two epochs',
  'overview.banners.pendingPoolMigration.title': 'You are migrating stake pool(s)',
  'overview.delegationCard.label.balance': 'ADA Balance',
  'overview.delegationCard.label.pools': 'Pool(s)',
  'overview.delegationCard.label.status': 'Status',
  'overview.delegationCard.statuses.multiDelegation': 'Multi delegation',
  'overview.delegationCard.statuses.overStaked': 'Over staked',
  'overview.delegationCard.statuses.ready': 'Ready to stake',
  'overview.delegationCard.statuses.simpleDelegation': 'Simple delegation',
  'overview.delegationCard.statuses.underStaked': 'Under staked',
  'overview.noFunds.button': 'Copy address',
  'overview.noFunds.description': 'Add funds to start staking',
  'overview.noFunds.title': 'Welcome',
  'overview.noStaking.balanceTitle': 'Available balance',
  'overview.noStaking.description': 'Stake your funds on up to {{maxPools}} pools to start receiving rewards.',
  'overview.noStaking.followSteps': 'Follow these steps to start staking your funds',
  'overview.noStaking.getStarted': 'Get started',
  'overview.noStaking.searchForPoolDescription':
    'Click the Stake Pools tab or click <Link>here</Link> then search for your desired pool.',
  'overview.noStaking.searchForPoolTitle': 'Browse stake pools',
  'overview.noStaking.selectPoolsDescription':
    'You can select up to {{maxPools}} pools to delegate to. Click <Link>here</Link> to learn more.',
  'overview.noStaking.selectPoolsTitle': 'Select one or more pools to stake to',
  'overview.noStaking.title': 'Start staking',
  'overview.stakingInfoCard.fee': 'Fee',
  'overview.stakingInfoCard.lastReward': 'Last reward',
  'overview.stakingInfoCard.margin': 'Margin',
  'overview.stakingInfoCard.poolRetired': 'Pool retired',
  'overview.stakingInfoCard.poolSaturated': 'Pool over-saturated',
  'overview.stakingInfoCard.ros': 'ROS',
  'overview.stakingInfoCard.tooltipFiatLabel': 'USD Value',
  'overview.stakingInfoCard.totalRewards': 'Total rewards',
  'overview.stakingInfoCard.totalStaked': 'Total staked',
  'overview.yourPoolsSection.heading': 'Your pools',
  'overview.yourPoolsSection.manageButtonLabel': 'Manage',
  'popup.expandBanner.button': 'Expand view',
  'popup.expandBanner.description': 'Get more information on the network and the pool in the browser experience',
  'popup.expandBanner.title': 'There is more!',
  'portfolioBar.clear': 'Clear',
  'portfolioBar.maxPools': '(max {{maxPoolsCount}})',
  'portfolioBar.next': 'Next',
  'portfolioBar.selectedPools': '{{selectedPoolsCount}} pools selected',
  'root.nav.browsePoolsTitle': 'Browse pools',
  'root.nav.overviewTitle': 'Overview',
  'root.nav.title': 'Staking Navigation',
  'root.title': 'Staking',
};
