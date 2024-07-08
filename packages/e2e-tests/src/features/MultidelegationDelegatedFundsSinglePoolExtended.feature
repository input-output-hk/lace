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

  @LW-9447
  Scenario: Extended-view - Staking - Manage staking only one pool is expanded by default
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see only first pools details are expanded

  @LW-9478
  Scenario: Extended-view - Staking - Manage staking selected pools counter working correctly
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    And I see selected pools counter is showing "1"

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
    And I switch to list view on "Browse pools" tab
    And I pick "CAN1" pool for delegation
    And I click "Next" button on staking portfolio bar
    And I click "Fine by me" button on "Changing staking preferences?" modal
    Then I see Manage delegation drawer
    And I see selected pools counter is showing "2"

  @LW-9490
  Scenario: Extended View - Staking - Manage staking add button disabled when selected max pools for staking
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    And I see selected pools counter is showing "1"
    And I see "Add stake pool" button is enabled
    When I click "Add stake pool" button
    And I switch to list view on "Browse pools" tab
    And I pick "10" pools for delegation from browse pools view: "8BETA, SMAUG, WOOF, TEKO, ADV, MOC2, SQRL, SEA, ALFA"
    And I click "Next" button on staking portfolio bar
    And I click "Fine by me" button on "Changing staking preferences?" modal
    Then I see Manage delegation drawer
    And I see selected pools counter is showing "10"
    And I see "Add stake pool" button is disabled

  @LW-9493
  Scenario: Extended View - Staking - Manage staking remove button enabled when staking to 1 pool
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    And I see selected pools counter is showing "1"
    And I see "Remove pool from portfolio" button is enabled for pool "1"

  @LW-9509
  Scenario: Extended View - Staking - Manage staking 'Confirm new portfolio' button not visible
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    And I don't see "Confirm new portfolio" button

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

  @LW-9086
  Scenario Outline: Extended View - button <button> click on stake pool details drawer
    When I navigate to Staking extended page
    And I open Browse pools tab
    And I switch to list view on "Browse pools" tab
    And I input "<ticker>" into stake pool search bar
    And I click on the stake pool with ticker "<ticker>"
    Then I see "2" stake pool details buttons for <delegation> pool
    When I click on "<button>" button on stake pool details drawer
    Then <expected>
    Examples:
      | ticker | delegation    | button                        | expected                                    |
      | OCEAN  | delegated     | Manage delegation             | I see Manage delegation drawer              |
      | OCEAN  | delegated     | Select pool for multi-staking | I see portfolio bar with "1" selected pools |
      | 8BETA  | non-delegated | Stake all on this pool        | I see Changing Staking Preferences modal    |
      | 8BETA  | non-delegated | Select pool for multi-staking | I see portfolio bar with "1" selected pools |

