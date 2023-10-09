@MainNavigation-Popup @Mainnet @Testnet
Feature: Analytics - Main Navigation - Popup view

  Background:
    Given Wallet is synced

  @LW-8709
  Scenario: Analytics - Popup view - Click Lace logo
    Given I set up request interception for posthog analytics request(s)
    And I navigate to Tokens popup page
    When I click on the logo icon
    Then I validate latest analytics single event "wallet | lace | click"