@VotingCenterPopup @Analytics @Testnet @Mainnet
Feature: Analytics - Voting Center - Popup view

  Background:
    Given Wallet is synced

  @LW-12334
  Scenario: Analytics - Popup view - Voting Center - open and redirect to Gov.tools
    When I set up request interception for posthog analytics request(s)
    And I navigate to Voting popup page
    Then I validate latest analytics single event "voting | voting | click"
    When I click on "Access Gov.tool" button
    Then I validate latest analytics single event "voting | voting | banner | button | click"
