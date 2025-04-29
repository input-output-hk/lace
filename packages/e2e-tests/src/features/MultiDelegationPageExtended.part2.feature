@Staking-NonDelegatedFunds-Extended
Feature: Staking Page - Extended View

  Background:
    Given Lace is ready for test

  @LW-8499 @Testnet @Mainnet
  Scenario: Extended View - Staking - Show tooltip for columns in browse pools section
    When I navigate to Staking extended page
    And I open Browse pools tab
    And I switch to list view on "Browse pools" tab
    When I hover over "Ticker" column name in stake pool list
    Then tooltip for "Ticker" column is displayed
    When I hover over "Saturation" column name in stake pool list
    Then tooltip for "Saturation" column is displayed
    #TODO: Uncomment when USE_ROS_STAKING_COLUMN=true
    #When I hover over "ROS" column name in stake pool list
    #Then tooltip for "ROS" column is displayed
    When I hover over "Cost" column name in stake pool list
    Then tooltip for "Cost" column is displayed
    When I hover over "Margin" column name in stake pool list
    Then tooltip for "Margin" column is displayed
    When I hover over "Blocks" column name in stake pool list
    Then tooltip for "Blocks" column is displayed
    When I hover over "Pledge" column name in stake pool list
    Then tooltip for "Pledge" column is displayed
    When I hover over "Live Stake" column name in stake pool list
    Then tooltip for "Live Stake" column is displayed

  @LW-10414 @Testnet @Mainnet
  Scenario: Extended View - Staking - Show tooltips for sorting options in "More options" component
    When I am on Staking extended page
    And I open Browse pools tab
    And I switch to list view on "Browse pools" tab
    When I hover over "Ticker" sorting option from "More options" component
    Then tooltip for "Ticker" sorting option is displayed
    When I hover over "Saturation" sorting option from "More options" component
    Then tooltip for "Saturation" sorting option is displayed
    #TODO: Uncomment when USE_ROS_STAKING_COLUMN=true
    #When I hover over "ROS" sorting option from "More options" component
    #Then tooltip for "ROS" sorting option is displayed
    When I hover over "Cost" sorting option from "More options" component
    Then tooltip for "Cost" sorting option is displayed
    When I hover over "Margin" sorting option from "More options" component
    Then tooltip for "Margin" sorting option is displayed
    When I hover over "Produced blocks" sorting option from "More options" component
    Then tooltip for "Produced blocks" sorting option is displayed
    When I hover over "Pledge" sorting option from "More options" component
    Then tooltip for "Pledge" sorting option is displayed
    When I hover over "Live Stake" sorting option from "More options" component
    Then tooltip for "Live Stake" sorting option is displayed

  @LW-8637 @Testnet @Mainnet
  Scenario: Extended View - Staking password screen details
    When I navigate to Staking extended page
    And I open Overview tab
    And I open Browse pools tab
    And I switch to list view on "Browse pools" tab
    And I input "ADA Ocean" into stake pool search bar
    And I click on the stake pool with ticker "OCEAN"
    And I click on "Stake all on this pool" button on stake pool details drawer
    And I click on "Next" button on staking preferences drawer
    And I click on "Next" button on staking confirmation drawer
    Then staking password drawer is displayed

  @LW-8445 @Testnet
  Scenario: Extended View - Selecting stakepool from list opens drawer with appropriate details
    And I am on Staking extended page
    And I open Browse pools tab
    And I switch to list view on "Browse pools" tab
    And I input "ADA Ocean" into stake pool search bar
    And I click on the stake pool with ticker "OCEAN"
    Then I see stake pool details drawer for "ADA Ocean" stake pool

  @LW-8438 @Testnet
  Scenario: Extended View - Staking - Stakepool details drawer - Close drawer
    And I am on Staking extended page
    And I open Browse pools tab
    And I switch to list view on "Browse pools" tab
    And I input "ADA Ocean" into stake pool search bar
    And I click on the stake pool with ticker "OCEAN"
    And Stake pool details drawer is opened
    When I close the drawer by clicking close button
    Then Stake pool details drawer is not opened

  @LW-8463 @Testnet @Mainnet
  Scenario: Extended View - Stake pool list item
    And I am on Staking extended page
    And I open Browse pools tab
    And I switch to list view on "Browse pools" tab
    And I wait for stake pool list to be populated
    Then each stake pool list item contains: checkbox, ticker, saturation, ROS, cost, margin, blocks, pledge and live stake

  @LW-9985 @Testnet @Mainnet
  Scenario: Extended View - Stake pool list - display skeleton while loading list elements
    And I am on Staking extended page
    And I open Browse pools tab
    And I switch to list view on "Browse pools" tab
    And I wait for stake pool list to be populated
    When I scroll down 500 pixels
    Then stake pool list row skeleton is displayed
    When I wait 500 milliseconds
    Then stake pool list row skeleton is not displayed

  @LW-9986 @Testnet @Mainnet
  Scenario: Extended View - Stake pool grid - display skeleton while loading grid cards
    And I am on Staking extended page
    And I open Browse pools tab
    And I switch to grid view on "Browse pools" tab
    When I scroll down 500 pixels
    And I scroll down 500 pixels
    Then stake pool grid card skeleton is displayed
    When I wait 500 milliseconds
    Then stake pool grid card skeleton is not displayed

  @LW-9995 @Testnet @Mainnet
  Scenario Outline: Extended View - Browse pools - preserve selected pools and view type - <view> - <action>
    When I am on Staking extended page
    And I open Browse pools tab
    And I switch to <view> view on "Browse pools" tab
    Then stake pool <view> view is displayed
    When I select 5 stake pools from <view> view
    And I save tickers of selected pools in <view> view
    When <action>
    And I open Browse pools tab
    Then stake pool <view> view is displayed
    And previously selected pools are still selected in <view> view
    Examples:
      | view | action              |
      | grid | I refresh the page  |
      | grid | I open Overview tab |
      | list | I refresh the page  |
      | list | I open Overview tab |

  @LW-9996 @Testnet @Mainnet
  Scenario: Extended View - Grid - display stake pool cards based on browser width
    When I am on Staking extended page
    And I open Browse pools tab
    And I switch to grid view on "Browse pools" tab
    Then stake pool grid view is displayed
    Then I see 4 stake pool cards in a row
    When I resize the window to a width of: 1660 and a height of: 1080
    Then I see 4 stake pool cards in a row
    When I resize the window to a width of: 1659 and a height of: 1080
    Then I see 3 stake pool cards in a row
    When I resize the window to a width of: 668 and a height of: 1080
    Then I see 3 stake pool cards in a row
    When I resize the window to a width of: 667 and a height of: 1080
    Then I see 2 stake pool cards in a row

  @LW-10141 @LW-10142 @Testnet @Mainnet
  Scenario Outline: Extended View - Staking - List View - sorting by column - <column>
    When I am on Staking extended page
    And I open Browse pools tab
    And I switch to list view on "Browse pools" tab
    Then stake pool list view is displayed
    When I click on stake pools table "<column>" column header
    Then <default_order> sorting indicator is displayed for "<column>" column
    And stake pool list rows are sorted by "<column>" in <default_order> order
    When I click on stake pools table "<column>" column header
    Then <modified_order> sorting indicator is displayed for "<column>" column
    And stake pool list rows are sorted by "<column>" in <modified_order> order
    When I click on stake pools table "<column>" column header
    Then <default_order> sorting indicator is displayed for "<column>" column
    And stake pool list rows are sorted by "<column>" in <default_order> order
    Examples:
      | column     | default_order | modified_order |
      | Saturation | descending    | ascending      |
#      | ROS         | descending  | ascending      |# TODO: Uncomment when USE_ROS_STAKING_COLUMN=true
      | Cost       | ascending     | descending     |
      | Margin     | ascending     | descending     |
      | Blocks     | descending    | ascending      |
      | Pledge     | descending    | ascending      |
      | Live Stake | descending    | ascending      |
