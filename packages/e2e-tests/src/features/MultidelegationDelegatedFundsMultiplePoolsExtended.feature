@Multidelegation-DelegatedFunds-MultiplePools-Extended @Testnet
Feature: Staking Page - Delegated funds - Multiple pools - Extended View

  Background:
    Given Lace is ready for test

  @LW-8432 @LW-8433
  Scenario: Extended View - Staking - Delegation card displays correct data
    When I navigate to Staking extended page
    And I open Overview tab
    Then I see Delegation card displaying correct data
    And Delegation pool cards with rewards assigned are displayed in extended view

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
    And I see selected pools counter is showing '10'

  @LW-9548
  Scenario: Extended View - Staking - Manage staking input field works as expected
    And I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    When I expand all pools details
    And I input random ratio for 10 pools adding to 100%
    Then I see 'Multi delegation' status in delegation card

  @LW-9544
  Scenario: Extended View - Staking - Manage staking 'Under allocated' status when removing pool from portfolio
    And I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    When I remove '1' pools from delegation portfolio
    Then I see 'Under allocated' status in delegation card

  @LW-9545
  Scenario: Extended View - Staking - Manage staking 'Under allocated' status when decreasing pool allocation
    And I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    When I click minus button for pool '1'
    Then I see 'Under allocated' status in delegation card

  @LW-9546
  Scenario: Extended View - Staking - Manage staking 'Over allocated' status when increasing pool allocation
    And I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    When I click plus button for pool '1'
    Then I see 'Over allocated' status in delegation card

  @LW-9510
  Scenario: Extended View - Staking - Manage staking 'Confirm new portfolio' disabled
    And I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    When I remove '1' pools from delegation portfolio
    Then I see 'Confirm new portfolio' button
    And 'Confirm new portfolio' button is disabled

  @LW-9511
  Scenario: Extended View - Staking - Manage staking 'Confirm new portfolio' works correctly
    And I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    When I expand all pools details
    And I click minus button for pool '1'
    And I click plus button for pool '2'
    Then I see 'Confirm new portfolio' button
    And 'Confirm new portfolio' button is enabled
    When I click 'Confirm new portfolio' button
    Then I see Manage delegation drawer Confirmation page

  @LW-9494
  Scenario: Extended View - Staking - Manage staking remove button works as expected
    And I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    And I see selected pools counter is showing '10'
    When I expand all pools details
    Then all pools details are expanded
    When I remove '9' pools from delegation portfolio
    Then I see selected pools counter is showing '1'
    And I see 'Remove pool from portfolio' button is enabled for pool '1'

  @LW-9476
  Scenario: Extended View - Staking - Manage staking expanding and hiding all pools details
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    And I expand all pools details
    Then all pools details are expanded
    When I hide all pools details
    Then all pools details are hidden

  @LW-9484
  Scenario: Extended View - Staking - Manage staking add button disabled when staking to max pools
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    And I see 'Add stake pool' button is disabled

  @LW-9086
  Scenario Outline: Extended View - <delegation> pools - click <button> button on stake pool details drawer
    When I navigate to Staking extended page
    And I open Browse pools tab
    And I switch to list view on 'Browse pools' tab
    And I input '<pool>' into stake pool search bar
    And I click on the stake pool with ticker '<pool>'
    Then I see '<numberOfButtons>' stake pool details buttons for <delegation> pool
    When I click on '<button>' button on stake pool details drawer
    Then <expected>
    Examples:
      | pool  | numberOfButtons | delegation    | button                        | expected                                    |
      | AZUR  | 3               | delegated     | Manage delegation             | I see Manage delegation drawer              |
      | AZUR  | 3               | delegated     | Stake all on this pool        | I see Changing Staking Preferences modal    |
      | AZUR  | 3               | delegated     | Select pool for multi-staking | I see portfolio bar with '1' selected pools |
      | 8BETA | 2               | non-delegated | Stake all on this pool        | I see Changing Staking Preferences modal    |
      | 8BETA | 2               | non-delegated | Select pool for multi-staking | I see portfolio bar with '1' selected pools |

  @LW-2642 @Smoke
  Scenario: Extended View - Staking  - Currently staking components
    When I navigate to Staking extended page
    Then I see currently staking component for stake pool:
      | position | poolName                        | poolTickerOrId | hasMetadata |
      | 1        | AzureADA                        | AZUR           | true        |
      | 2        | AVA - Testnet Pool              | AVA            | true        |
      | 3        | ATADA Austria - PreProd Pool #1 | ATADA          | true        |
      | 4        | Artemis Preprod Stakepool       | ARTMS          | true        |

  @LW-2643 @Smoke
  Scenario: Extended View - Staking - Details of currently staked pool
    And I navigate to Staking extended page
    When I click on pool name in the first currently staking component
    Then I see stake pool details drawer for 'AzureADA' stake pool opened from currently staked component

  @LW-4877
  Scenario: Extended View - Stake pool details - Enter and Escape buttons support
    Given I am on Staking extended page
    And I open Browse pools tab
    And I switch to list view on 'Browse pools' tab
    And I input 'APEX' into stake pool search bar
    And I click on the stake pool with ticker 'APEX'
    Then Drawer is displayed
    When I press keyboard Enter button
    Then I see Changing Staking Preferences modal
    When I press keyboard Enter button
    Then I see Manage delegation drawer
    # When I press keyboard Enter button # TODO: update when LW-8625 is resolved
    # Then I see Manage delegation drawer Confirmation page
    # When I press keyboard Escape button # TODO: update when LW-8623 is resolved
    # Then Staking exit modal is displayed
    # When I press keyboard Escape button
    # Then I see Manage delegation drawer Confirmation page
    # When I press keyboard Enter button
    # And I press keyboard Enter button
    # Then staking password drawer is displayed
    # When I press keyboard Escape button # TODO: update when LW-8623 is resolved
    # Then Staking exit modal is displayed
    # When I press keyboard Escape button
    # Then staking password drawer is displayed
    When I press keyboard Escape button
    # When I press keyboard Enter button
    Then Drawer is not displayed

  @LW-10998
  Scenario Outline: Extended View - Multidelegation - 'Switching pool' modal displayed while reducing number of staked pools, click <action>
    When I navigate to Staking extended page
    And I open Overview tab
    And I click Manage button
    Then I see Manage delegation drawer
    When I expand all pools details
    And I remove '1' pools from delegation portfolio
    And I input 20% ratio for pool 1
    Then 'Confirm new portfolio' button is enabled
    When I click 'Confirm new portfolio' button
    And I click on 'Next' button on staking confirmation drawer
    Then I see 'Switching to less pools' modal
    And I click '<action>' button on 'Switching pool?' modal
    Then <nextStep>
    Examples:
      | action     | nextStep                                         |
      | Cancel     | I see Manage delegation drawer Confirmation page |
      | Fine by me | staking password drawer is displayed             |

  @LW-10852
  Scenario: Extended View - Modal about multi-delegation and DApp issues is displayed for user already using multi-delegation
    Given I reset default behaviour for modal about issues with multi-delegation and DApps
    When I navigate to Staking extended page
    Then I see the modal about issues with multi-delegation and DApps
    When I click on 'Got it' button inside the modal about issues with multi-delegation and DApps
    Then I do not see the modal about issues with multi-delegation and DApps
    When I refresh the page
    Then I do not see the modal about issues with multi-delegation and DApps
