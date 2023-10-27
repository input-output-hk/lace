@Staking-NonDelegatedFunds-Popup
Feature: Staking Page - Popup View

  Background:
    Given Lace is ready for test

  @LW-8933 @Testnet
  Scenario: Popup View - Start Staking component
    Given I save token: "Cardano" balance
    And I disable showing Multidelegation beta banner
    When I navigate to Staking popup page
    Then I see Start Staking page in popup mode

  @LLW-8934 @Testnet
  Scenario: Popup View - Start Staking - "Expanded view" button click
    Given I am on Start Staking page in popup mode
    When I click "Expand view" on Start Staking page
    And I switch to last window
    Then I see Lace extension main page in extended mode

