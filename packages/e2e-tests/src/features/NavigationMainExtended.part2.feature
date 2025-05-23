@MainNavigation-Extended @Mainnet @Testnet
Feature: Main Navigation - Extended view

  Background:
    Given Lace is ready for test

  @LW-6662
  Scenario Outline: Extended view - Main Navigation - Right side panel not displayed in <section> section
    And I navigate to <section> extended page
    And I resize the window to a width of: 1350 and a height of: 840
    Then I do not see a button to open the right side panel
    And <step>
    Examples:
      | section      | step                                                                  |
      | Tokens       | I see Tokens "About your wallet" widget with all relevant items       |
      | NFTs         | I see "More on NFTs" widget with all relevant items                   |
      | Activity     | I see Activity "Learn about" widget with all relevant items           |
      | Staking      | I see "About staking" widget with all relevant items                  |
      | Settings     | I see "About Lace" component                                          |
      | Address Book | I see Address Book "About your wallet" widget with all relevant items |

  @LW-6661
  Scenario Outline: Extended view - Main Navigation - Right side panel displayed in <section> section - width <width>
    And I navigate to <section> extended page
    And I resize the window to a width of: <width> and a height of: 840
    Then I do not see the right side panel for <section> section
    Then I see a button to open the right side panel
    When I click on right side panel icon
    Then I see the right side panel for <section> section
    And <step>
    And I <should_see_scroll> a horizontal scroll
    When I click on right side panel icon
    Then I do not see the right side panel for <section> section
    Examples:
      | section      | width | step                                                                  | should_see_scroll |
      | Tokens       | 1280  | I see Tokens "About your wallet" widget with all relevant items       | do not see        |
      | Tokens       | 668   | I see Tokens "About your wallet" widget with all relevant items       | see               |
      | NFTs         | 1280  | I see "More on NFTs" widget with all relevant items                   | do not see        |
      | NFTs         | 668   | I see "More on NFTs" widget with all relevant items                   | see               |
      | Activity     | 1280  | I see Activity "Learn about" widget with all relevant items           | do not see        |
      | Activity     | 668   | I see Activity "Learn about" widget with all relevant items           | see               |
      | Staking      | 1280  | I see "About staking" widget with all relevant items                  | do not see        |
      | Staking      | 668   | I see "About staking" widget with all relevant items                  | see               |
      | Settings     | 1280  | I see "About Lace" component                                          | do not see        |
      | Settings     | 668   | I see "About Lace" component                                          | see               |
      | Address Book | 1280  | I see Address Book "About your wallet" widget with all relevant items | do not see        |
      | Address Book | 668   | I see Address Book "About your wallet" widget with all relevant items | see               |
