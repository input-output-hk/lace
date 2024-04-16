@Staking-NonDelegatedFunds-Extended
Feature: Staking Page - Extended View

  Background:
    Given Lace is ready for test

  @LW-10143 @Testnet @Mainnet
  Scenario: Extended View - Staking - More options - Sorting options are displayed
    When I am on Staking extended page
    And I open Browse pools tab
    Then "More options" component with stake pool sorting options is displayed

  @LW-10139 @LW-10141 @LW-10142 @Testnet @Mainnet
  Scenario: Extended View - Staking - List View - Stake pool list sorting by ticker (default)
    When I am on Staking extended page
    And I open Browse pools tab
    And I switch to list view on "Browse pools" tab
    Then stake pool list view is displayed
    And ascending sorting indicator is displayed for "Ticker" column
    And stake pool list rows are sorted by "Ticker" in ascending order
    When I click on stake pools table "Ticker" column header
    Then descending sorting indicator is displayed for "Ticker" column
    And stake pool list rows are sorted by "Ticker" in descending order
    When I click on stake pools table "Ticker" column header
    Then ascending sorting indicator is displayed for "Ticker" column
    And stake pool list rows are sorted by "Ticker" in ascending order

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
