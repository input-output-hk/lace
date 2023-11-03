@Multidelegation-DelegatedFunds-Popup @Testnet @Mainnet
Feature: Staking Page - Popup View

  @LW-8330
  Scenario Outline: Popup View - Delegation card displays correct data
    Given I open wallet: "<walletName>" in: popup mode
    And I disable showing Multidelegation beta banner
    When I navigate to Staking popup page
    Then I see Delegation title displayed for multidelegation
    And I see Delegation card displaying correct data
    Examples:
    | walletName                     |
    | MultidelegationDelegatedSingle |
    | MultidelegationDelegatedMulti  |

  @LW-8338
  Scenario Outline: Popup View - Delegated pools cards are present
    Given I open wallet: "<walletName>" in: popup mode
    And I disable showing Multidelegation beta banner
    When I navigate to Staking popup page
    And I see Delegation pool cards are displayed for popup view
    Examples:
      | walletName                     |
      | MultidelegationDelegatedSingle |
      | MultidelegationDelegatedMulti  |

  @LW-8480
  Scenario Outline: Popup View - Staking - Hover over currently staking element: <element>
    Given I disable showing Multidelegation beta banner
    And I navigate to Staking popup page
    When I hover over <element> in currently staking component
    Then I see tooltip for element in currently staking component
    Examples:
      | element      |
      | total staked |
      | last reward  |
