@Staking-DelegatedFunds-Extended @Testnet @Mainnet @Pending
Feature: Staking Page - Funds already delegated - Extended Browser View

  Background:
    Given Wallet is synced

  @LW-2643 @Smoke
  Scenario: Extended View - Staking - Details of currently staked pool
    And I navigate to Staking extended page
    When I click pool name in currently staking component
    Then I see drawer with "ADA Ocean" stake pool details

  @LW-4877
  Scenario: Extended View - Stake pool details - Enter and Escape buttons support
    Given I am on Staking extended page
    And I input "Apex" to the search bar
    And I click stake pool with name "Apex Cardano Pool"
    Then Drawer is displayed
    When I press keyboard Enter button
    Then An "browserView.staking.details.switchingPoolsModal.title" text is displayed
    When I press keyboard Enter button
    Then An "browserView.staking.details.confirmation.title" text is displayed
    When I press keyboard Enter button
    Then An "browserView.transaction.send.enterWalletPasswordToConfirmTransaction" text is displayed
    When I press keyboard Escape button
    Then An "browserView.staking.details.exitStakingModal.title" text is displayed
    When I press keyboard Escape button
    Then An "browserView.transaction.send.enterWalletPasswordToConfirmTransaction" text is displayed
    When I press keyboard Escape button
    When I press keyboard Enter button
    Then Drawer is not displayed
