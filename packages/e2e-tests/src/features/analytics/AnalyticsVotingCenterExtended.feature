@VotingCenterExtended @Analytics @Testnet @Mainnet
Feature: Analytics - Voting Center - Extended view

  Background:
    Given Wallet is synced

  @LW-12333
  Scenario: Analytics - Extended view - Voting Center - open and redirect to Gov.tools
    When I set up request interception for posthog analytics request(s)
    And I navigate to Voting extended page
    Then I validate latest analytics single event 'voting | voting | click'
    When I click on 'Access Gov.tool' button
    Then I validate latest analytics single event 'voting | voting | banner | button | click'
