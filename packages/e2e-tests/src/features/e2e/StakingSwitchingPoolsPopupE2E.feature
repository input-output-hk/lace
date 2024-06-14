@Runner2 @Staking-SwitchingPools-Popup-E2E @E2E @Testnet @Pending
Feature: Staking Page - Switching pools - Popup View - E2E

  Background:
    Given Wallet is synced

  @LW-2660 @LW-4407
  Scenario: Popup View - Staking - Switching pool E2E
    Given I save token: "Cardano" balance
    And I navigate to Staking popup page
    Then I see currently staking stake pool in popup mode and choose new pool as "OtherStakePool"
    When I input "OtherStakePool" to the search bar
    And I wait for single search result
    And I click stake pool with name "OtherStakePool"
    Then I see drawer with "OtherStakePool" stake pool details and a button available for staking
    And I save stake pool details
    When I click "Stake on this pool" button on stake pool details drawer
    And I click "Fine by me" button on "Switching pool?" modal
    Then I see drawer with stakepool: "OtherStakePool" confirmation screen in popup mode
    And I click "Next" button on staking confirmation drawer
    And I enter correct wallet password and confirm staking
    Then Switching Delegation success screen is displayed in popup mode
    When I click "Close" button on staking success drawer
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
    When I input "OtherNoMetadataStakePool" to the search bar
    And I wait for single search result
    And I click stake pool with name "-"
    Then I see drawer with stake pool details without metadata and a button available for staking
    When I save stake pool details
    And I click "Stake on this pool" button on stake pool details drawer
    And I click "Fine by me" button on "Switching pool?" modal
    And I click "Next" button on staking confirmation drawer
    And I enter correct wallet password and confirm staking
    Then Switching Delegation success screen is displayed in popup mode
    When I click "Close" button on staking success drawer
    And I wait until current stake pool switch to "-"
    Then I see currently staking component for stake pool: "-" without metadata in popup mode
    When I navigate to Transactions popup page
    Then I can see transaction 1 with type "Delegation"
    When I click and open recent transactions details until find transaction with correct poolID
    Then The Tx details are displayed for Staking without metadata
