@Settings-Extended @Analytics @Testnet
Feature: Analytics - Extended View

  Background:
    Given Lace is ready for test

  @LW-8312
  Scenario Outline: Analytics - Extended view - Settings - Analytics option enabled: <is_enabled> and Posthog events sent
    Given I set up request interception for posthog analytics request(s)
    And I am on NFTs extended page
    And I validate that <number_of_events> analytics event(s) have been sent
    Examples:
      | toggle_enabled | number_of_events |
      | is             | 1                |
      | is not         | 0                |
