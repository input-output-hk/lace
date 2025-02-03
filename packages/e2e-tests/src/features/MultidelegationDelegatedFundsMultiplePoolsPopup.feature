@Multidelegation-DelegatedFunds-MultiplePools-Popup @Testnet
Feature: Staking Page - Delegated funds - Multiple pools - Popup View

  Background:
    Given Lace is ready for test

  @LW-8330
  Scenario: Popup View - Delegation card displays correct data
    When I navigate to Staking popup page
    Then I see Delegation title displayed for multidelegation
    And I see Delegation card displaying correct data

  @LW-8338 @Pending @issue=LW-12193
  Scenario: Popup View - Delegated pools cards are present
    When I navigate to Staking popup page
    And Delegation pool cards with rewards assigned are displayed in popup view

  @LW-8934 @LW-8472
  Scenario: Popup View - Start Staking - Delegated to multiple pools - "Expanded view" button click
    Given I navigate to Staking popup page
    And I see Expanded View banner
    When I click "Expand view" on Start Staking page
    And I switch to last window
    Then I see Lace extension main page in extended mode

  @LW-2652
  Scenario: Popup View - Staking  - Currently staking components - <position>
    When I navigate to Staking popup page
    Then I see currently staking component for stake pool:
      | position | poolName                        | poolTickerOrId | hasMetadata |
      | 1        | AzureADA                        | AZUR           | true        |
      | 2        | AVA - Testnet Pool              | AVA            | true        |
      | 3        | ATADA Austria - PreProd Pool #1 | ATADA          | true        |
      | 4        | Artemis Preprod Stakepool       | ARTMS          | true        |

  @LW-2653
  Scenario: Popup View - Staking - Details of currently staked pool
    And I navigate to Staking popup page
    When I click on pool name in the first currently staking component
    Then I see stake pool details drawer for "AzureADA" stake pool opened from currently staked component

  @LW-10852
  Scenario: Popup View - Modal about multi-delegation and DApp issues is displayed for user already using multi-delegation
    Given I reset default behaviour for modal about issues with multi-delegation and DApps
    When I navigate to Staking popup page
    Then I see the modal about issues with multi-delegation and DApps
    When I click on "Got it" button inside the modal about issues with multi-delegation and DApps
    Then I do not see the modal about issues with multi-delegation and DApps
    When I refresh the page
    Then I do not see the modal about issues with multi-delegation and DApps
