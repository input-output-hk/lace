@DAppExplorer-Extended @Testnet

Feature: DApp Explorer - extended view

  Background:
    Given Wallet is synced

  @LW-12105
  Scenario: Extended View - DApp Explorer - open
    When I navigate to DApp Explorer extended page
    Then I see DApp Explorer page
    And I see the list of categories on DApp Explorer page
    And I see cards with DApps on DApp Explorer page
    When I hover over info icon on DApp Explorer page
    Then I see a tooltip with information about DApp Explorer
