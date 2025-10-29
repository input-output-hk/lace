@Midnight-Banner @Testnet

Feature: Midnight - banner view

  Background:
    Given Wallet is synced

  @LW-13628
  Scenario: "Discover the Midnight Token Distribution" banner - click on "Learn more" button
    Given "Discover the Midnight Token Distribution" banner is displayed
    When I click on "Learn more" button on "Discover the Midnight Token Distribution" banner
    Then "www.midnight.gd" page is displayed in new tab

  @LW-13630
  Scenario: "Discover the Midnight Token Distribution" banner - click on "Close" button - Cancel
    When I click on "Close" button on "Discover the Midnight Token Distribution" banner
    Then I see "Heads up" modal
    When I click on "Cancel" button on "Heads up" modal
    Then "Discover the Midnight Token Distribution" banner is displayed
