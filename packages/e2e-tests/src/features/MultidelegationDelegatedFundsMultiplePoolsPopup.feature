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
    And I disable showing Multidelegation persistence banner
    When I navigate to Staking popup page
    And I see Delegation pool cards are displayed

  @LW-8934 @LW-8472
  Scenario: Popup View - Start Staking - Delegated to multiple pools - "Expanded view" button click
    Given I navigate to Staking popup page
    And I see Expanded View banner
    When I click "Expand view" on Start Staking page
    And I switch to last window
    Then I see Lace extension main page in extended mode

  @LW-2652
  Scenario: Popup View - Staking  - Currently staking components
    When I navigate to Staking popup page
    Then I see currently staking component for stake pool:
      | position | poolName                        | poolTickerOrId | hasMetadata |
      | 1        | AzureADA                        | AZUR           | true        |
      | 2        | AVA - Testnet Pool              | AVA            | true        |
      | 3        | ATADA Austria - PreProd Pool #1 | ATADA          | true        |
      | 4        | Artemis Preprod Stakepool       | ARTMS          | true        |
