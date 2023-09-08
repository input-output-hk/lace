@Settings-Popup @Analytics @Mainnet @Testnet
Feature: Analytics - Settings Toggle - Popup View

  Background:
    Given Lace is ready for test

  @LW-3062
  Scenario Outline: Analytics - Popup view - Settings - Analytics option enabled: <is_enabled> and events sent: <is_enabled>
    Given I open settings from header menu
    When Analytics toggle is enabled: <toggle_enabled>
    Then clicking on "Tokens" in popup mode, existence of matomo event with payload containing: "<action_name>" should be: <request_present>
    Examples:
      | toggle_enabled | request_present | action_name             |
      | true           | true            | view-tokens,click-event |
      | false          | false           |                         |

  @LW-8314
  Scenario Outline: Analytics - Popup view - Settings - Analytics option enabled: <is_enabled> and Posthog events sent
    When I open settings from header menu
    And Analytics toggle is enabled: <toggle_enabled>
    Given I set up request interception for posthog analytics request(s)
    And I am on NFTs popup page
    And I validate that <number_of_events> analytics event(s) have been sent
    Examples:
      | toggle_enabled | number_of_events |
      | true           | 1                |
      | false          | 0                |
