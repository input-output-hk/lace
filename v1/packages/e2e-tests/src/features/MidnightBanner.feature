@Midnight-Banner @Testnet

Feature: Midnight - banner view

  Background:
    Given Wallet is synced

  @LW-13628
  Scenario: "Get started with Midnight" banner - click on "Midnight Registration" button
    Given "Get started with Midnight" banner is displayed
    When I click on "Midnight Registration" button on "Get started with Midnight" banner
    Then "Dust Generation DApp" page is displayed in new tab

  @LW-13630
  Scenario: "Get started with Midnight" banner - click on "Close" button - Cancel
    When I click on "Close" button on "Get started with Midnight" banner
    Then I see "Heads up" modal
    When I click on "Cancel" button on "Heads up" modal
    Then "Get started with Midnight" banner is displayed

  @LW-13631
  Scenario: "Get started with Midnight" banner - click on "Close" button - Confirm
    When I click on "Close" button on "Get started with Midnight" banner
    Then I see "Heads up" modal
    When I click on "I understand" button on "Heads up" modal
    Then "Get started with Midnight" banner is not displayed
