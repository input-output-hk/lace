@Multidelegation-DelegatedFunds-MultiplePools-NotRegistered-Popup @Testnet
Feature: Staking Page - Delegated funds - Multiple pools - Not registered voting power - Popup View

  Background:
    Given Lace is ready for test

  @LW-12036
  Scenario: Popup View - "Delegate your voting power" banner is displayed if user is staking, but has not delegated voting rights nor registered as a DRep
    When I navigate to Staking popup page
    Then "Delegate your voting power" banner is displayed

  @LW-12038
  Scenario: Popup View - "Delegate your voting power" banner - click "Know more" link
    When I navigate to Staking popup page
    And I click on "Know more" link on "Delegate your voting power" banner
    Then I see a "FAQ" article with title "What is the Voltaire GovTool?"

  @LW-12040
  Scenario: Popup View - "Delegate your voting power" banner - click on "Register now" button
    When I navigate to Staking popup page
    And I click on "Register now" button
    Then I'm redirected to "Voting Center" page
