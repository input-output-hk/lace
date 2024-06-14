@Runner2 @Analytics-Staking-SwitchingPools-Extended-E2E @Analytics @Testnet @Pending @E2E
Feature: Analytics - Posthog - Switching pools - Extended View

  Background:
    Given Wallet is synced

  @LW-7868
  Scenario: Analytics - Extended View - Staking - Success screen - Close drawer
    Given I set up request interception for posthog analytics request(s)
    And I save token: "Cardano" balance
    When I navigate to Staking extended page
    Then I validate latest analytics single event "staking | staking | click"
    Then I see currently staking stake pool in extended mode and choose new pool as "OtherStakePool"
    When I input "OtherStakePool" to the search bar
    And I wait for single search result
    And I click stake pool with name "OtherStakePool"
    Then I validate latest analytics single event "staking | staking | stake pool | click"
    Then I see drawer with "OtherStakePool" stake pool details and a button available for staking
    When I click "Stake on this pool" button on stake pool details drawer
    Then I validate latest analytics single event "staking | stake pool detail | stake on this pool | click"
    And I click "Fine by me" button on "Switching pool?" modal
    Then I validate latest analytics single event "staking | switching pool? | fine by me | click"
    Then I see drawer with stakepool: "OtherStakePool" confirmation screen in extended mode
    And I click "Next" button on staking confirmation drawer
    Then I validate latest analytics single event "staking | manage delegation | stake pool confirmation | next | click"
    And I enter correct wallet password and confirm staking
    Then Switching Delegation success screen is displayed in extended mode
    And I validate latest analytics multiple events:
      | staking \| manage delegation \| hurray! \| view                           |
      | staking \| manage delegation \| password confirmation \| confirm \| click |
    When I click "Close" button on staking success drawer
    Then I validate latest analytics single event "staking | manage delegation | hurray! | close | click"
    And I validate that 8 analytics event(s) have been sent

  @LW-7869
  Scenario: Analytics - Extended View - Staking - Success screen - Close drawer by clicking X button
    Given I set up request interception for posthog analytics request(s)
    And I save token: "Cardano" balance
    When I navigate to Staking extended page
    Then I validate latest analytics single event "staking | staking | click"
    Then I see currently staking stake pool in extended mode and choose new pool as "OtherStakePool"
    When I input "OtherStakePool" to the search bar
    And I wait for single search result
    And I click stake pool with name "OtherStakePool"
    Then I validate latest analytics single event "staking | staking | stake pool | click"
    Then I see drawer with "OtherStakePool" stake pool details and a button available for staking
    When I click "Stake on this pool" button on stake pool details drawer
    Then I validate latest analytics single event "staking | stake pool detail | stake on this pool | click"
    And I click "Fine by me" button on "Switching pool?" modal
    Then I validate latest analytics single event "staking | switching pool? | fine by me | click"
    Then I see drawer with stakepool: "OtherStakePool" confirmation screen in extended mode
    And I click "Next" button on staking confirmation drawer
    Then I validate latest analytics single event "staking | manage delegation | stake pool confirmation | next | click"
    And I enter correct wallet password and confirm staking
    Then Switching Delegation success screen is displayed in extended mode
    And I validate latest analytics multiple events:
      | staking \| manage delegation \| hurray! \| view                           |
      | staking \| manage delegation \| password confirmation \| confirm \| click |
    When I close the drawer by clicking close button
    Then I validate latest analytics single event "staking | manage delegation | hurray! | x | click"
    And I validate that 8 analytics event(s) have been sent
