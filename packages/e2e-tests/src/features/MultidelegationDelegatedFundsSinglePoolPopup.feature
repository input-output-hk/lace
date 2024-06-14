@Runner4 @Multidelegation-DelegatedFunds-SinglePool-Popup @Testnet
Feature: Staking Page - Delegated funds - Single pool - Popup View

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

  @LW-8480
  Scenario Outline: Popup View - Staking - Hover over currently staking element: <element>
    Given I navigate to Staking popup page
    When I hover over <element> in currently staking component
    Then I see tooltip for element in currently staking component
    Examples:
      | element      |
      | total staked |
      | last reward  |

  @Pending @LW-9446 @Testnet
  @issue=LW-9152
  Scenario Outline: Popup View - Staking - Stakepool details drawer - Close drawer by clicking <close_button> button
    Given I navigate to Staking popup page
    And I click on the stake pool title: "ADA Ocean" in currently staking component
    And Stake pool details drawer is opened
    When I close the drawer by clicking <close_button> button
    Then Stake pool details drawer is not opened
    Examples:
      | close_button |
      | back         |
      | close        |

  @LW-8934 @LW-8472
  Scenario: Popup View - Start Staking - Delegated to single pool - "Expanded view" button click
    Given I navigate to Staking popup page
    And I see Expanded View banner
    When I click "Expand view" on Start Staking page
    And I switch to last window
    Then I see Lace extension main page in extended mode
