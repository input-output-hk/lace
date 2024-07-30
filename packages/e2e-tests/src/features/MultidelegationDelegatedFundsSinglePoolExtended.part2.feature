@Multidelegation-DelegatedFunds-SinglePool-Extended @Testnet
Feature: Staking Page - Delegated funds - Single pool - Extended View

  Background:
    Given Lace is ready for test

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

  @LW-10854
  Scenario: Modal about multi-delegation and DApp issues is displayed for user delegating to single stake pool - "Add stake pool" option
    Given I reset default behaviour for modal about issues with multi-delegation and DApps
    When I navigate to Staking extended page
    And I click Manage button
    And I click "Add stake pool" button
    Then I see the modal about issues with multi-delegation and DApps
    When I click on "Got it" button inside the modal about issues with multi-delegation and DApps
    Then I do not see the modal about issues with multi-delegation and DApps
    When I refresh the page
    Then I do not see the modal about issues with multi-delegation and DApps

  @LW-10586
  Scenario: Modal about multi-delegation and DApp issues is displayed for user that is delegating to single stake pool - select pool from list
    Given I reset default behaviour for modal about issues with multi-delegation and DApps
    When I navigate to Staking extended page
    And I open Browse pools tab
    And I switch to list view on "Browse pools" tab
    And I click on a random stake pool from the list
    And I click on "Stake all on this pool" button on stake pool details drawer
    And I click "Fine by me" button on "Changing staking preferences?" modal
    And I click "Add stake pool" button
    Then I see the modal about issues with multi-delegation and DApps
    When I click on "Got it" button inside the modal about issues with multi-delegation and DApps
    Then I do not see the modal about issues with multi-delegation and DApps
    When I refresh the page
    Then I do not see the modal about issues with multi-delegation and DApps

  @LW-10588
  Scenario: Modal about multi-delegation and DApp issues is displayed for user that is delegating to single stake pool - "Select pool for multi-staking" option
    Given I reset default behaviour for modal about issues with multi-delegation and DApps
    When I navigate to Staking extended page
    And I open Browse pools tab
    And I click on a random stake pool from the grid
    And I click on "Select pool for multi-staking" button on stake pool details drawer
    Then I see the modal about issues with multi-delegation and DApps
    When I click on "Got it" button inside the modal about issues with multi-delegation and DApps
    Then I do not see the modal about issues with multi-delegation and DApps
    When I refresh the page
    Then I do not see the modal about issues with multi-delegation and DApps
