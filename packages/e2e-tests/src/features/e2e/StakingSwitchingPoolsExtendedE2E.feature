@Staking-SwitchingPools-Extended-E2E @Testnet
Feature: Staking Page - Switching pools - Extended Browser View - E2E

  Background:
    Given Wallet is synced

  @LW-2650 @LW-4406 @LW-4557
  Scenario: Extended View - Staking - Switching pool E2E
    Given I save token: "Cardano" balance in extended mode
    When I navigate to Staking extended page
    Then I see currently staking stake pool in extended mode and choose new pool as "OtherStakePool"
    When I input "OtherStakePool" to search bar
    And I wait for single search result
    And I click stake pool with the name "OtherStakePool"
    Then I see drawer with "OtherStakePool" stake pool details and a button available for staking
    And I save stakepool info
    When I click "browserView.staking.details.stakeButtonText" button
    And I click "browserView.staking.details.switchingPoolsModal.buttons.confirm" button
    Then I see drawer with stakepool: "OtherStakePool" confirmation screen in extended mode
    And I click "browserView.staking.details.confirmation.button.confirm" button
    And I fill correct password and confirm
    Then Switching Delegation success screen is displayed
    When I click "browserView.staking.details.fail.btn.close" button
    Then Staking exit modal is not displayed
    When I wait until current stake pool switch to "OtherStakePool"
    Then I see currently staking component for stake pool: "OtherStakePool" in extended mode
    When I navigate to Transactions extended page
    Then I can see transaction 1 with type "Delegation"
    When I click and open recent transactions details until find transaction with correct poolID
    Then The Tx details are displayed for Staking with metadata

  @LW-4408
  Scenario: Extended View - Staking - Switching to a pool with no metadata
    When I navigate to Staking extended page
    Then I see currently staking stake pool in extended mode and choose new pool as "OtherNoMetadataStakePool"
    When I input "OtherNoMetadataStakePool" to search bar
    And I wait for single search result
    And I click stake pool with the name "-"
    Then I see drawer with stake pool details without metadata and a button available for staking
    And I save stakepool info
    When I click "browserView.staking.details.stakeButtonText" button
    And I click "browserView.staking.details.switchingPoolsModal.buttons.confirm" button
    And I click "browserView.staking.details.confirmation.button.confirm" button
    And I fill correct password and confirm
    Then Switching Delegation success screen is displayed
    When I click "browserView.staking.details.fail.btn.close" button
    And I wait until current stake pool switch to "-"
    Then I see currently staking component for stake pool: "-" without metadata in extended mode
    When I navigate to Transactions extended page
    Then I can see transaction 1 with type "Delegation"
    When I click and open recent transactions details until find transaction with correct poolID
    Then The Tx details are displayed for Staking without metadata

  @LW-4558 @Testnet
  Scenario: Extended View - Staking - Staking error screen displayed on transaction submit error
    Given I enable network interception to fail request: "*/tx-submit/submit" with error 400
    When I navigate to Staking extended page
    Then I see currently staking stake pool in extended mode and choose new pool as "OtherStakePool"
    When I input "OtherStakePool" to search bar
    And I wait for single search result
    And I click stake pool with the name "OtherStakePool"
    And I click "browserView.staking.details.stakeButtonText" button
    And I click "browserView.staking.details.switchingPoolsModal.buttons.confirm" button
    And I click "browserView.staking.details.confirmation.button.confirm" button
    And Staking password screen is displayed
    When I fill correct password and confirm
    Then the staking error screen is displayed
    When I close the drawer by clicking close button
    Then Staking exit modal is displayed
