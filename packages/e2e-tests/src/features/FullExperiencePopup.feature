@Common-Popup @Mainnet @Testnet
Feature: Full experience - popup view

  Background:
    Given Lace is ready for test

  @LW-4893
  Scenario: Popup View - hover over "Expand" button
    Then "Expand" button is displayed without text
    When I hover over "Expand" button
    Then "Expand" button is displayed with text

  @LW-3446
  Scenario Outline: Popup View - <page> opened - "Expand" button click
    Given I am on <page> popup page
    When I click on "Expand" button
    Then the <page> page is displayed on a new tab in extended view
    Examples:
      | page         |
      | Tokens       |
      | NFTs         |
      | Transactions |
      | Staking      |
      | Address Book |
      | Settings     |
