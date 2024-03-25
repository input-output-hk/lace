@Transactions-Popup @Analytics @Testnet @Mainnet
Feature: Transactions - Extended view

  Background:
    Given Wallet is synced

  @LW-8711
  Scenario: Analytics - Popup View - Transactions tab - Details and close
    Given I set up request interception for posthog analytics request(s)
    When I navigate to Transactions popup page
    Then I validate latest analytics single event "activity | activity | click"
    When I click on a transaction: 1
    Then I validate latest analytics single event "activity | activity | activity row | click"
    When I click on inputs dropdowns
    Then I validate latest analytics single event "activity | activity detail | inputs | click"
    When I click on outputs dropdowns
    Then I validate latest analytics single event "activity | activity detail | outputs | click"
    When I close the drawer by clicking close button
    Then I validate latest analytics single event "activity | activity detail | x | click"
    And I validate that 5 analytics event(s) have been sent

  @LW-8712
  Scenario: Analytics - Popup View - Transactions tab - Details - Click hash
    When I navigate to Transactions popup page
    When I click on a transaction: 1
    And I set up request interception for posthog analytics request(s)
    And I click on a transaction hash
    Then I validate latest analytics single event "activity | activity detail | transaction hash | click"
    And I validate that 1 analytics event(s) have been sent
