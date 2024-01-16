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
    Then I see Manage delegation drawer

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
    Then I see Manage delegation drawer
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
    Then I see Manage delegation drawer
    And I see "Add stake pool" button is disabled

  @LW-9485
  Scenario: Extended View - Staking - Manage staking add button disabled when staking to less than max pools
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    And I see "Add stake pool" button is enabled

  @LW-9489
  Scenario: Extended View - Staking - Manage staking add button works as expected
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    And I see selected pools counter is showing "1"
    And I see "Add stake pool" button is enabled
    When I click "Add stake pool" button
    And I pick "CanadaStakes" pool for delegation
    And I click "Next" button on staking portfolio bar
    And I click "Fine by me" button on "Changing staking preferences?" modal
    Then I see Manage delegation drawer
    And I see selected pools counter is showing "2"

  @LW-9490
  Scenario Outline: Extended View - Staking - Manage staking add button disabled when selected max pools for staking
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    And I see selected pools counter is showing "1"
    And I see "Add stake pool" button is enabled
    When I click "Add stake pool" button
    And I pick "<pools_after>" pools for delegation from browse pools view: "<pools_names>"
    And I click "Next" button on staking portfolio bar
    And I click "Fine by me" button on "Changing staking preferences?" modal
    Then I see Manage delegation drawer
    And I see selected pools counter is showing "<pools_after>"
    And I see "Add stake pool" button is disabled
    Examples:
      | pools_after | pools_names                                                                                   |
      | 10          | 8BETA, ADA Capital, AdaNet.io, Boople Turtle Pool, ADV, BAZAR, ADASquirrel, Akasha, Alfa Pool |

  @LW-9493
  Scenario: Extended View - Staking - Manage staking remove button disabled when staking to 1 pool
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    And I see selected pools counter is showing "1"
    And I see "Remove pool from portfolio" button is disabled for pool "1"
    And I see "Remove pool from portfolio" button tooltip on hover for pool "1"

  @LW-9494
  Scenario: Extended View - Staking - Manage staking remove button works as expected
    When I open wallet: "MultidelegationDelegatedMulti" in: extended mode
    And I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    And I see selected pools counter is showing "10"
    When I expand all pools details
    Then all pools details are expanded
    When I remove "9" pools from delegation portfolio
    Then I see selected pools counter is showing "1"
    And I see "Remove pool from portfolio" button is disabled for pool "1"
    And I see "Remove pool from portfolio" button tooltip on hover for pool "1"

  @LW-9509
  Scenario: Extended View - Staking - Manage staking 'Confirm new portfolio' button not visible
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    And I don't see "Confirm new portfolio" button

  @LW-9510
  Scenario: Extended View - Staking - Manage staking 'Confirm new portfolio' disabled
    When I open wallet: "MultidelegationDelegatedMulti" in: extended mode
    And I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    When I remove "1" pools from delegation portfolio
    Then I see "Confirm new portfolio" button
    And "Confirm new portfolio" button is disabled

  @LW-9511
  Scenario: Extended View - Staking - Manage staking 'Confirm new portfolio' works correctly
    When I open wallet: "MultidelegationDelegatedMulti" in: extended mode
    And I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    When I expand all pools details
    And I click minus button for pool "1"
    And I click plus button for pool "2"
    Then I see "Confirm new portfolio" button
    And "Confirm new portfolio" button is enabled
    When I click "Confirm new portfolio" button
    Then I see Manage delegation drawer Confirmation page

  @LW-9544
  Scenario: Extended View - Staking - Manage staking 'Under allocated' status when removing pool from portfolio
    When I open wallet: "MultidelegationDelegatedMulti" in: extended mode
    And I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    When I remove "1" pools from delegation portfolio
    Then I see "Under allocated" status in delegation card

  @LW-9545
  Scenario: Extended View - Staking - Manage staking 'Under allocated' status when decreasing pool allocation
    When I open wallet: "MultidelegationDelegatedMulti" in: extended mode
    And I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    When I click minus button for pool "1"
    Then I see "Under allocated" status in delegation card

  @LW-9546
  Scenario: Extended View - Staking - Manage staking 'Over allocated' status when increasing pool allocation
    When I open wallet: "MultidelegationDelegatedMulti" in: extended mode
    And I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    When I click plus button for pool "1"
    Then I see "Over allocated" status in delegation card

  @LW-9548
  Scenario: Extended View - Staking - Manage staking input field works as expected
    When I open wallet: "MultidelegationDelegatedMulti" in: extended mode
    And I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    When I expand all pools details
    And I input random ratio for 10 pools adding to 100%
    Then I see "Multi delegation" status in delegation card

  @LW-9549
  Scenario: Extended View - Staking - Manage staking input field can't set zero
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    When I input 0% ratio for pool 1
    Then I see input ratio field showing 1% for pool 1

  @LW-9550
  Scenario: Extended View - Staking - Manage staking input field can't set over 100%
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    When I input 250% ratio for pool 1
    Then I see input ratio field showing 100% for pool 1
