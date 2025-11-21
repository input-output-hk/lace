@Multidelegation-DelegatedFunds-MultiplePools-NotRegistered-Extended @Testnet
Feature: Staking Page - Delegated funds - Multiple pools - Not registered voting power - Extended View

  Background:
    Given Lace is ready for test

  @LW-12035
  Scenario: Extended View - "Delegate your voting power" banner is displayed if user is staking, but has not delegated voting rights nor registered as a DRep
    When I navigate to Staking extended page
    Then "Delegate your voting power" banner is displayed

  @LW-12037
  Scenario: Extended View - "Delegate your voting power" banner - click "Know more" link
    When I navigate to Staking extended page
    And I click on "Know more" link on "Delegate your voting power" banner
    Then I see a "FAQ" article with title "What is the Voltaire GovTool?"

  @LW-12039
  Scenario: Extended View - "Delegate your voting power" banner - click on "Register now" button
    When I navigate to Staking extended page
    And I click on "Register now" button
    Then I'm redirected to "Voting Center" page
