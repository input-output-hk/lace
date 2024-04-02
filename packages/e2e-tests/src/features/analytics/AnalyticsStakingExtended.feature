@Staking-NonDelegatedFunds-Extended @Analytics @Testnet
Feature: Analytics - PostHog - Staking - Extended View

  Background:
    Given Wallet is synced

  @LW-10147
  Scenario: Analytics - Extended View - Staking - switching between views
    When I navigate to Staking extended page
    And I open Browse pools tab
    And I set up request interception for posthog analytics request(s)
    And I switch to list view on "Browse pools" tab
    Then I validate latest analytics single event "staking | browse pools | toggle | list view | click"
    When I switch to grid view on "Browse pools" tab
    Then I validate latest analytics single event "staking | browse pools | toggle | grid view | click"
    And I validate that 1 analytics event(s) have been sent

  @LW-10148
  Scenario: Analytics - Extended View - Staking - List View - click on column headers
    When I navigate to Staking extended page
    And I open Browse pools tab
    And I switch to list view on "Browse pools" tab
    And I set up request interception for posthog analytics request(s)
    And I click on stake pools table "Ticker" column header
    Then I validate latest analytics single event "staking | browse pools | ticker | click"
    When I click on stake pools table "Saturation" column header
    Then I validate latest analytics single event "staking | browse pools | saturation | click"
    # TODO: Uncomment when USE_ROS_STAKING_COLUMN=true
    # When I click on stake pools table "ROS" column header
    # Then I validate latest analytics single event "staking | browse pools | ros | click"
    When I click on stake pools table "Cost" column header
    Then I validate latest analytics single event "staking | browse pools | cost | click"
    When I click on stake pools table "Margin" column header
    Then I validate latest analytics single event "staking | browse pools | margin | click"
    When I click on stake pools table "Blocks" column header
    Then I validate latest analytics single event "staking | browse pools | blocks | click"
    When I click on stake pools table "Pledge" column header
    Then I validate latest analytics single event "staking | browse pools | pledge | click"
    When I click on stake pools table "Live Stake" column header
    Then I validate latest analytics single event "staking | browse pools | live-stake | click"
    And I validate that 7 analytics event(s) have been sent

  @LW-10149
  Scenario: Analytics - Extended View - Staking - More options - Sorting - select each option
    When I navigate to Staking extended page
    And I open Browse pools tab
    And I switch to list view on "Browse pools" tab
    And I set up request interception for posthog analytics request(s)
    When I select "Saturation" sorting option from "More options" component
    Then I validate latest analytics single event "staking | browse pools | more options sorting | saturation | click"
    # TODO: Uncomment when USE_ROS_STAKING_COLUMN=true
    # When I select "ROS" sorting option from "More options" component
    # Then I validate latest analytics single event "staking | browse pools | more options sorting | ros | click"
    When I select "Cost" sorting option from "More options" component
    Then I validate latest analytics single event "staking | browse pools | more options sorting | cost | click"
    When I select "Margin" sorting option from "More options" component
    Then I validate latest analytics single event "staking | browse pools | more options sorting | margin | click"
    When I select "Produced blocks" sorting option from "More options" component
    Then I validate latest analytics single event "staking | browse pools | more options sorting | produced blocks | click"
    When I select "Pledge" sorting option from "More options" component
    Then I validate latest analytics single event "staking | browse pools | more options sorting | pledge | click"
    When I select "Live Stake" sorting option from "More options" component
    Then I validate latest analytics single event "staking | browse pools | more options sorting | live-stake | click"
    And I select "Ticker" sorting option from "More options" component
    Then I validate latest analytics single event "staking | browse pools | more options sorting | ticker | click"
    And I validate that 7 analytics event(s) have been sent
