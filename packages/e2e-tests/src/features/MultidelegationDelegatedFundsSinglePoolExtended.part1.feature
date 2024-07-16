@Multidelegation-DelegatedFunds-SinglePool-Extended @Testnet
Feature: Staking Page - Delegated funds - Single pool - Extended View

  Background:
    Given Lace is ready for test

  @LW-8436 @LW-8439 @LW-8440 @LW-8598
  Scenario Outline: Extended View - Staking - Close drawer - <delegationStep> page - <action>
    When I navigate to Staking extended page
    And I open Browse pools tab
    And I switch to list view on "Browse pools" tab
    And I pick "1" pools for delegation from browse pools view: "OCEAN"
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
    And I navigate to Staking extended page
    When I hover over <element> in currently staking component
    Then I see tooltip for element in currently staking component
    Examples:
      | element       |
      | total staked  |
      | total rewards |
      | last reward   |

  @LW-8432 @LW-8433
  Scenario: Extended View - Staking - Delegation card displays correct data
    When I navigate to Staking extended page
    And I open Overview tab
    Then I see Delegation card displaying correct data
    And I see Delegation pool cards are displayed

  @LW-8636
  Scenario: Extended View - Staking - Manage button works
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
