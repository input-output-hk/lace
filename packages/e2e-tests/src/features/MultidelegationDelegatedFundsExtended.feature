@Multidelegation-DelegatedFunds-Extended @Testnet
Feature: Staking Page - Extended View

  Background:
    Given Lace is ready for test

  @LW-8436 @LW-8439 @LW-8440 @LW-8598
  Scenario Outline: Extended View - Staking - Close drawer
    When I navigate to Staking extended page
    And I open Browse pools tab
    And I pick "1" pools for delegation from browse pools view: "ADA Ocean"
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

  @LW-8432
  Scenario Outline: Extended View - Staking - Delegation card displays correct data
    Given I open wallet: "<walletName>" in: extended mode
    When I navigate to Staking extended page
    And I open Overview tab
    Then I see Delegation card displaying correct data
    Examples:
      | walletName                     |
      | MultidelegationDelegatedSingle |
      | MultidelegationDelegatedMulti  |

  @LW-8433
  Scenario Outline: Extended View - Staking - Delegated pools cards are present
    Given I open wallet: "<walletName>" in: extended mode
    When I navigate to Staking extended page
    And I open Overview tab
    And I see Delegation pool cards are displayed
    Examples:
      | walletName                     |
      | MultidelegationDelegatedSingle |
      | MultidelegationDelegatedMulti  |

  @LW-8636
  Scenario: Extended View - Staking - Manage button works
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation page

  @LW-9447
  Scenario Outline: Extended-view - Staking - Manage staking only one pool is expanded by default
    Given I open wallet: "<walletName>" in: extended mode
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see only first pools details are expanded
    Examples:
      | walletName                     |
      | MultidelegationDelegatedSingle |
      | MultidelegationDelegatedMulti  |

  @LW-9478
  Scenario Outline: Extended-view - Staking - Manage staking selected pools counter working correctly
    Given I open wallet: "<walletName>" in: extended mode
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation page
    And I see selected pools counter is showing "<poolsCount>"
    Examples:
      | walletName                     | poolsCount |
      | MultidelegationDelegatedSingle | 1          |
      | MultidelegationDelegatedMulti  | 10         |

  @LW-9476
  Scenario: Extended View - Staking - Manage staking expanding and hiding all pools details
    Given I open wallet: "MultidelegationDelegatedMulti" in: extended mode
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    And I expand all pools details
    Then all pools details are expanded
    When I hide all pools details
    Then all pools details are hidden

  @LW-9484
  Scenario: Extended View - Staking - Manage staking add button disabled when staking to max pools
    Given I open wallet: "MultidelegationDelegatedMulti" in: extended mode
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation page
    And I see add stake pool button is disabled

  @LW-9485
  Scenario: Extended View - Staking - Manage staking add button disabled when staking to less than max pools
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation page
    And I see add stake pool button is enabled
