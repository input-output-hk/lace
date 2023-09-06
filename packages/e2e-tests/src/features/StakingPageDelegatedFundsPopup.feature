@Staking-DelegatedFunds-Popup @Testnet @Mainnet @Pending
Feature: Staking Page - Funds already delegated - Popup View

  Background:
    Given Wallet is synced

  @LW-2652
  Scenario: Popup View - Staking  - Currently staking component
    When I navigate to Staking popup page
    Then I see currently staking component for stake pool: "ADA Capital" in popup mode

  @LW-2653
  Scenario: Popup View - Staking - Details of currently staked pool
    And I navigate to Staking popup page
    When I click pool name in currently staking component
    Then I see drawer with "ADA Capital" stake pool details

  @LW-2654
  Scenario Outline: Popup View - Staking - Hover over currently staking element: <element_to_hover>
    And I navigate to Staking popup page
    When I hover over <element_to_hover> in currently staking component
    Then I see tooltip for currently staking component
    Examples:
      | element_to_hover |
      | total staked     |
      | last reward      |
