@Multidelegation-DelegatedFunds-MultiplePools-Popup @Testnet
Feature: Staking Page - Delegated funds - Multiple pools - Popup View

  Background:
    Given Lace is ready for test

  @LW-8330
  Scenario: Popup View - Delegation card displays correct data
    And I disable showing Multidelegation persistence banner
    When I navigate to Staking popup page
    Then I see Delegation title displayed for multidelegation
    And I see Delegation card displaying correct data

  @LW-8338
  Scenario: Popup View - Delegated pools cards are present
    And I disable showing Multidelegation beta banner
    And I disable showing Multidelegation persistence banner
    When I navigate to Staking popup page
    And I see Delegation pool cards are displayed
