@Staking-SwitchingPools-Popup-E2E @Testnet
Feature: Staking Page - Switching pools - Popup View - E2E

  Background:
    Given Wallet is synced

  @LW-2660 @LW-4407
  Scenario: Popup View - Staking - Switching pool E2E
    Given I save token: "Cardano" balance in popup mode
    And I navigate to Staking popup page
    Then I see currently staking stake pool in popup mode and choose new pool as "OtherStakePool"
    When I input "OtherStakePool" to search bar
    And I wait for single search result
    And I click stake pool with the name "OtherStakePool"
    Then I see drawer with "OtherStakePool" stake pool details and a button available for staking
    And I save stakepool info
    When I click "browserView.staking.details.stakeButtonText" button
    And I click "browserView.staking.details.switchingPoolsModal.buttons.confirm" button
    Then I see drawer with stakepool: "OtherStakePool" confirmation screen in popup mode
    And I click "browserView.staking.details.confirmation.button.confirm" button
    And I fill correct password and confirm
    Then Switching Delegation success screen is displayed
    When I click "browserView.staking.details.fail.btn.close" button
    And I wait until current stake pool switch to "OtherStakePool"
    Then I see currently staking component for stake pool: "OtherStakePool" in popup mode
    When I navigate to Transactions popup page
    Then I can see transaction 1 with type "Delegation"
    When I click and open recent transactions details until find transaction with correct poolID
    Then The Tx details are displayed for Staking with metadata

  @LW-4409
  Scenario: Popup View - Staking - Switching to a pool with no metadata
    And I navigate to Staking popup page
    Then I see currently staking stake pool in popup mode and choose new pool as "OtherNoMetadataStakePool"
    When I input "OtherNoMetadataStakePool" to search bar
    And I wait for single search result
    And I click stake pool with the name "-"
    Then I see drawer with stake pool details without metadata and a button available for staking
    When I save stakepool info
    And I click "browserView.staking.details.stakeButtonText" button
    And I click "browserView.staking.details.switchingPoolsModal.buttons.confirm" button
    And I click "browserView.staking.details.confirmation.button.confirm" button
    And I fill correct password and confirm
    Then Switching Delegation success screen is displayed
    When I click "browserView.staking.details.fail.btn.close" button
    And I wait until current stake pool switch to "-"
    Then I see currently staking component for stake pool: "-" without metadata in popup mode
    When I navigate to Transactions popup page
    Then I can see transaction 1 with type "Delegation"
    When I click and open recent transactions details until find transaction with correct poolID
    Then The Tx details are displayed for Staking without metadata
