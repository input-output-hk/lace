@DAppExplorer-Popup @Testnet

Feature: DApp Explorer - popup view

  Background:
    Given Wallet is synced

  @LW-12106
  Scenario: Popup View - DApp Explorer - open and redirect to extended mode
    When I click on 'DApps' button
    Then the DApps page is displayed on a new tab in extended view
