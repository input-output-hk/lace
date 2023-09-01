@Multidelegation-DelegatedFunds-Popup @Testnet
Feature: Staking Page - Popup View

  @LW-temp1
  Scenario Outline: Popup View - Delegation card displays correct data
    Given I open wallet: "<walletName>" in: popup mode
    When I navigate to Staking popup page
    And I confirm multidelegation beta modal
    Then I see Delegation title displayed for multidelegation
    And I see Delegation card displaying correct data
    Examples:
    | walletName                     |
    | MultidelegationDelegatedSingle |
    | MultidelegationDelegatedMulti  |
