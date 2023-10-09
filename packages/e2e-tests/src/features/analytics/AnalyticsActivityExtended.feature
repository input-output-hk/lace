@Transactions-Extended @Testnet @Mainnet
Feature: Transactions - Extended view

  Background:
    Given Wallet is synced

  @LW-8713
  Scenario: Analytics - Extended View - Transactions tab - Details and close
    Given I set up request interception for posthog analytics request(s)
    When I navigate to Transactions extended page
    Then I validate latest analytics single event "activity | activity | click"
    When I click on a transaction: 1
    Then I validate latest analytics single event "activity | activity | activity row | click"
    When I click on inputs dropdowns
    Then I validate latest analytics single event "activity | activity detail | inputs | click"
    When I click on outputs dropdowns
    Then I validate latest analytics single event "activity | activity detail | outputs | click"
    When I close the drawer by clicking close button
    Then I validate latest analytics single event "activity | activity detail | x | click"

  @LW-8715
  Scenario: Analytics - Extended View - Transactions tab - Details - Click hash
    Given I set up request interception for posthog analytics request(s)
    When I navigate to Transactions extended page
    When I click on a transaction: 1
    And I click on a transaction hash
    Then I validate latest analytics single event "activity | activity detail | transaction hash | click"
