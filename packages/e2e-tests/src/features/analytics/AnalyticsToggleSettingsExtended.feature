@Settings-Extended @Analytics
Feature: Analytics - Settings Toggle - Extended View

  Background:
    Given Lace is ready for test

  @LW-8312
  Scenario Outline: Analytics - Extended view - Settings - Analytics option enabled: <is_enabled> and Posthog events sent
    When I open settings from header menu
    And Analytics toggle is enabled: <toggle_enabled>
    Given I set up request interception for posthog analytics request(s)
    And I am on NFTs extended page
    And I validate that <number_of_events> analytics event(s) have been sent
    Examples:
      | toggle_enabled | number_of_events |
      | true           | 1                |
      | false          | 0                |
