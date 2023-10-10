@MainNavigation-Extended @Mainnet @Testnet
Feature: Analytics - Main Navigation - Extended view

  Background:
    Given Wallet is synced

  @LW-8710
  Scenario: Analytics - Extended view - Click Lace logo
    Given I set up request interception for posthog analytics request(s)
    And I navigate to Tokens extended page
    When I click on the logo icon
    Then I validate latest analytics single event "wallet | lace | click"
    