@Runner2 @MainNavigation-Popup @Analytics @Mainnet @Testnet
Feature: Analytics - Main Navigation - Popup view

  Background:
    Given Wallet is synced

  @LW-8709
  Scenario: Analytics - Popup view - Click Lace logo
    Given I navigate to Tokens popup page
    And I set up request interception for posthog analytics request(s)
    When I click on the logo icon
    Then I validate latest analytics single event "wallet | lace | click"
    And I validate that 1 analytics event(s) have been sent
