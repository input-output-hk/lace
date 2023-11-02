@Multidelegation-DelegatedFunds-Extended @Testnet
Feature: Staking Page - Extended View

  Background:
    Given Lace is ready for test

  @LW-8436 @LW-8439 @LW-8440 @LW-8598
  Scenario Outline: Extended View - Staking - Close drawer
    Given I disable showing Multidelegation beta banner
    When I navigate to Staking extended page
    And I click Browse pools tab
    And I pick "1" pools for delegation from browse pools view: "ADA Capital"
    And I click "Next" button on staking portfolio bar
    And I click "Fine by me" button on "Changing staking preferences?" modal
    And I'm on a delegation flow "<delegationStep>"
    When <action>
    Then Stake pool details drawer is not opened
    Examples:
      | delegationStep | action                                      |
      | manage         | I close the drawer by clicking close button |
      | confirmation   | I close the drawer by clicking close button |
      | password       | I close the drawer by clicking close button |
      | success        | I close the drawer by clicking close button |
      | manage         | I click outside the drawer                  |
      | confirmation   | I click outside the drawer                  |
      | password       | I click outside the drawer                  |
      | success        | I click outside the drawer                  |

  @LW-8450
  Scenario Outline: Extended View - Staking - Hover over currently staking element: <element>
    Given I disable showing Multidelegation beta banner
    And I navigate to Staking extended page
    When I hover over <element> in currently staking component
    Then I see tooltip for element in currently staking component
    Examples:
      | element       |
      | total staked  |
      | total rewards |
      | last reward   |
