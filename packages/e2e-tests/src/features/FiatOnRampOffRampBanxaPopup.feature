@Banxa-Popup @Testnet @Mainnet
Feature: Fiat On Ramp & Off Ramp - Banxa

  Background:
    Given Lace is ready for test

  @LW-10597
  Scenario: Fiat On & Off Ramp - Banxa - widget not visible in popup mode
    Given I switch network to: "Mainnet" in popup mode
    When I navigate to Tokens popup page
    Then Banxa's widget is not displayed
