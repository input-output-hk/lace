@Staking-SwitchingPools-Popup-E2E @Testnet @Pending
Feature: Staking Page - Switching pools - Popup View - E2E

  Background:
    Given Wallet is synced

  @LW-7870
  Scenario: Popup View - Staking - Analytics - Success screen - Close drawer
    Given I set up request interception for posthog analytics request(s)
    And I save token: "Cardano" balance
    And I navigate to Staking popup page
    Then I validate latest analytics single event "staking | staking | click"
    Then I see currently staking stake pool in popup mode and choose new pool as "OtherStakePool"
    When I input "OtherStakePool" to the search bar
    And I wait for single search result
    And I click stake pool with name "OtherStakePool"
    Then I validate latest analytics single event "staking | staking | stake pool | click"
    And I see drawer with "OtherStakePool" stake pool details and a button available for staking
    When I click "Stake on this pool" button on stake pool details drawer
    Then I validate latest analytics single event "staking | stake pool detail | stake on this pool | click"
    When I click "Fine by me" button on "Switching pool?" modal
    Then I validate latest analytics single event "staking | switching pool? | fine by me | click"
    And I see drawer with stakepool: "OtherStakePool" confirmation screen in popup mode
    And I click "Next" button on staking confirmation drawer
    Then I validate latest analytics single event "staking | manage delegation | stake pool confirmation | next | click"
    When I enter correct wallet password and confirm staking
    Then Switching Delegation success screen is displayed in popup mode
    And I validate latest analytics multiple events:
      | staking \| manage delegation \| hurray! \| view |
      | staking \| manage delegation \| password confirmation \| confirm \| click |
    When I click "Close" button on staking success drawer
    Then I validate latest analytics single event "staking | manage delegation | hurray! | close | click"
    And I validate that 8 analytics event(s) have been sent

  @LW-7871
  Scenario: Popup View - Staking - Analytics - Success screen - Close drawer by clicking X button
    Given I set up request interception for posthog analytics request(s)
    And I save token: "Cardano" balance
    And I navigate to Staking popup page
    Then I validate latest analytics single event "staking | staking | click"
    Then I see currently staking stake pool in popup mode and choose new pool as "OtherStakePool"
    When I input "OtherStakePool" to the search bar
    And I wait for single search result
    And I click stake pool with name "OtherStakePool"
    Then I validate latest analytics single event "staking | staking | stake pool | click"
    And I see drawer with "OtherStakePool" stake pool details and a button available for staking
    When I click "Stake on this pool" button on stake pool details drawer
    Then I validate latest analytics single event "staking | stake pool detail | stake on this pool | click"
    When I click "Fine by me" button on "Switching pool?" modal
    Then I validate latest analytics single event "staking | switching pool? | fine by me | click"
    And I see drawer with stakepool: "OtherStakePool" confirmation screen in popup mode
    And I click "Next" button on staking confirmation drawer
    Then I validate latest analytics single event "staking | manage delegation | stake pool confirmation | next | click"
    When I enter correct wallet password and confirm staking
    Then Switching Delegation success screen is displayed in popup mode
    And I validate latest analytics multiple events:
      | staking \| manage delegation \| hurray! \| view |
      | staking \| manage delegation \| password confirmation \| confirm \| click |
    When I close the drawer by clicking close button
    Then I validate latest analytics single event "staking | manage delegation | hurray! | x | click"
    And I validate that 8 analytics event(s) have been sent
    