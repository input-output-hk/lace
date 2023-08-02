@MultidelegationDelegatedFunds-Extended @Testnet @Mainnet @Pending
Feature: Staking Page - Funds already delegated - Extended Browser View

  Background:
    Given Wallet is synced

  @LW-2642 @Smoke
  Scenario: Extended View - Staking  - Currently staking component
    When I navigate to Staking extended page
    Then I see currently staking component for stake pool: "ADA Capital" in extended mode

  @LW-2643 @Smoke
  Scenario: Extended View - Staking - Details of currently staked pool
    And I navigate to Staking extended page
    When I click pool name in currently staking component
    Then I see drawer with "ADA CAPITAL" stake pool details

  @LW-2644
  Scenario Outline: Extended View - Staking - Hover over currently staking element: <element_to_hover>
    And I navigate to Staking extended page
    When I hover over <element_to_hover> in currently staking component
    Then I see tooltip for currently staking component
    Examples:
      | element_to_hover |
      | last reward      |
      | total staked     |
      | total rewards    |

  @LW-4877
  Scenario: Extended View - Stake pool details - Enter and Escape buttons support
    Given I am on Staking extended page
    When I click browse pools tab
    And I input "Apex" to the search bar
    And I click stake pool with name "Apex Cardano Pool"
    Then Drawer is displayed
    When I press keyboard Enter button
    Then An "modals.changingPreferences.title" text is displayed
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

