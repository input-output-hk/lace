@Settings-Extended
Feature: Analytics - Settings Toggle - Extended View

  Background:
    Given Lace is ready for test

  @LW-3719
  Scenario Outline: Analytics - Extended view - Settings - Click on: "<element>" sends Matomo event with payload containing: "<action_name>"
    When I open settings from header menu
    And Analytics toggle is enabled: true
    Then clicking on "<element>" in extended mode, existence of matomo event with payload containing: "<action_name>" should be: true
    Examples:
      | element      | action_name                   |
      | Tokens       | view-tokens,click-event       |
      | NFTs         | view-nft,click-event          |
      | Transactions | view-transactions,click-event |
      | Staking      | staking,click-event           |

  @LW-3059
  Scenario Outline: Analytics - Extended view - Settings - Analytics option enabled: <is_enabled> and Matomo events sent: <is_enabled>
    When I open settings from header menu
    And Analytics toggle is enabled: <toggle_enabled>
    Then clicking on "Tokens" in extended mode, existence of matomo event with payload containing: "<action_name>" should be: <request_present>
    Examples:
      | toggle_enabled | request_present | action_name             |
      | true           | true            | view-tokens,click-event |
      | false          | false           |                         |

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
