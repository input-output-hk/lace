@MainNavigation-Extended @Analytics @Mainnet @Testnet
@SkipFirefox
Feature: Analytics - Main Navigation - Extended view

  Background:
    Given Wallet is synced

  @LW-8710
  Scenario: Analytics - Extended view - Click Lace logo
    Given I navigate to Tokens extended page
    And I set up request interception for posthog analytics request(s)
    When I click on the logo icon
    Then I validate latest analytics single event "wallet | lace | click"
    And I validate that 1 analytics event(s) have been sent

