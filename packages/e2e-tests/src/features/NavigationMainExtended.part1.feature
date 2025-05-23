@MainNavigation-Extended @Mainnet @Testnet
Feature: Main Navigation - Extended view

  Background:
    Given Lace is ready for test

  @LW-2692 @Smoke
  Scenario: Extended view - Main navigation is displayed with all items
    When I see main navigation with all items in extended mode
    Then Each main navigation item contains icon and text

  @LW-2693 @Smoke
  Scenario: Extended view - Main Navigation - Tokens item click navigates to tokens page
    Given I am on NFTs extended page
    When I navigate to Tokens extended page
    Then I see Tokens counter with total number of tokens displayed

  @LW-2694 @Smoke
  Scenario: Extended view - Main Navigation - NFTs item click navigates to nfts page
    When I navigate to NFTs extended page
    Then I see NFTs counter with total number of NFTs displayed

  @LW-2695 @Smoke
  Scenario: Extended view - Main Navigation - Transactions item click navigates to transaction page
    When I navigate to Activity extended page
    Then Activity page is displayed

  @LW-2696 @Smoke
  Scenario: Extended view - Main Navigation - Staking item click navigates to staking page
    When I navigate to Staking extended page
    Then I see Delegation title displayed for multidelegation

  @LW-2606
  Scenario Outline: Extended view - Click Lace logo - <section>
    And I navigate to <section> extended page
    And <validateIfSectionIsDisplayed>
    When I click on the logo icon
    Then I see Tokens counter with total number of tokens displayed
    Examples:
      | section      | validateIfSectionIsDisplayed                               |
      | Tokens       | I see Tokens counter with total number of tokens displayed |
      | NFTs         | I see NFTs counter with total number of NFTs displayed     |
      | Activity     | Activity page is displayed                                 |
      | Staking      | I see Delegation title displayed for multidelegation       |
      | Settings     | I see settings page                                        |
      | Address Book | I see address book title                                   |

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
