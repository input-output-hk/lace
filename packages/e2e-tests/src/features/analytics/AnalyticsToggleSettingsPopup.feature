@Settings-Popup @Analytics @Mainnet @Testnet
Feature: Analytics - Settings Toggle - Popup View

  Background:
    Given Lace is ready for test

  @LW-8314
  Scenario Outline: Analytics - Popup view - Settings - Analytics option enabled: <is_enabled> and Posthog events sent
    When I open settings from header menu
    And Analytics toggle <toggle_enabled> enabled
    Given I set up request interception for posthog analytics request(s)
    And I am on NFTs popup page
    And I validate that <number_of_events> analytics event(s) have been sent
    Examples:
      | toggle_enabled | number_of_events |
      | is             | 1                |
      | is not         | 0                |
