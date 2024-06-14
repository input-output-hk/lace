@Runner2 @Staking-SwitchingPools-Extended-E2E @E2E @Testnet @Pending
Feature: Staking Page - Switching pools - Extended Browser View - E2E

  Background:
    Given Wallet is synced

  @LW-2650 @LW-4406 @LW-4557
  Scenario: Extended View - Staking - Switching pool E2E
    Given I save token: "Cardano" balance
    When I navigate to Staking extended page
    Then I see currently staking stake pool in extended mode and choose new pool as "OtherStakePool"
    When I input "OtherStakePool" to the search bar
    And I wait for single search result
    And I click stake pool with name "OtherStakePool"
    Then I see drawer with "OtherStakePool" stake pool details and a button available for staking
    And I save stake pool details
    When I click "Stake on this pool" button on stake pool details drawer
    And I click "Fine by me" button on "Switching pool?" modal
    Then I see drawer with stakepool: "OtherStakePool" confirmation screen in extended mode
    And I click "Next" button on staking confirmation drawer
    And I enter correct wallet password and confirm staking
    Then Switching Delegation success screen is displayed in extended mode
    When I click "Close" button on staking success drawer
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
    When I input "OtherNoMetadataStakePool" to the search bar
    And I wait for single search result
    And I click stake pool with name "-"
    Then I see drawer with stake pool details without metadata and a button available for staking
    And I save stake pool details
    When I click "Stake on this pool" button on stake pool details drawer
    And I click "Fine by me" button on "Switching pool?" modal
    And I click "Next" button on staking confirmation drawer
    And I enter correct wallet password and confirm staking
    Then Switching Delegation success screen is displayed in extended mode
    When I click "Close" button on staking success drawer
    And I wait until current stake pool switch to "-"
    Then I see currently staking component for stake pool: "-" without metadata in extended mode
    When I navigate to Transactions extended page
    Then I can see transaction 1 with type "Delegation"
    When I click and open recent transactions details until find transaction with correct poolID
    Then The Tx details are displayed for Staking without metadata

  @LW-4558 @Testnet
  Scenario: Extended View - Staking - Staking error screen displayed on transaction submit error
    Given I enable network interception to finish request: "*/tx-submit/submit" with error 400
    When I navigate to Staking extended page
    Then I see currently staking stake pool in extended mode and choose new pool as "OtherStakePool"
    When I input "OtherStakePool" to the search bar
    And I wait for single search result
    And I click stake pool with name "OtherStakePool"
    And I click "Stake on this pool" button on stake pool details drawer
    And I click "Fine by me" button on "Switching pool?" modal
    And I click "Next" button on staking confirmation drawer
    And Staking password screen is displayed
    When I enter correct wallet password and confirm staking
    Then the staking error screen is displayed
    When I close the drawer by clicking close button
    Then Staking exit modal is displayed
