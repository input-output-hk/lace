@MainNavigation-Extended @Mainnet @Testnet
Feature: Main Navigation - Extended view

  Background:
    Given Lace is ready for test

  @LW-2692 @Smoke
  Scenario: Extended view - Main navigation is displayed with all items
    When I see main navigation with all items in extended mode
    Then Each main navigation item contains icon and text

  @LW-2693
  Scenario: Extended view - Main Navigation - Tokens item click navigates to tokens page
    Given I am on NFTs extended page
    When I navigate to Tokens extended page
    Then I see Tokens counter with total number of tokens displayed

  @LW-2694
  Scenario: Extended view - Main Navigation - NFTs item click navigates to nfts page
    When I navigate to NFTs extended page
    Then I see NFTs counter with total number of NFTs displayed

  @LW-2695
  Scenario: Extended view - Main Navigation - Transactions item click navigates to transaction page
    When I navigate to Transactions extended page
    Then Transactions section is displayed

  @LW-2696
  Scenario: Extended view - Main Navigation - Staking item click navigates to staking page
    When I navigate to Staking extended page
    Then I see Staking title and counter with total number of pools displayed

  @LW-2606
  Scenario Outline: Extended view - Click Lace logo - <section>
    And I navigate to <section> extended page
    And <validateIfSectionIsDisplayed>
    When I click on the logo icon
    Then I see Tokens counter with total number of tokens displayed
    Examples:
      | section      | validateIfSectionIsDisplayed                                         |
      | Tokens       | I see Tokens counter with total number of tokens displayed           |
      | NFTs         | I see NFTs counter with total number of NFTs displayed               |
      | Transactions | Transactions section is displayed                                    |
      | Staking      | I see Staking title and counter with total number of pools displayed |
      | Settings     | I see settings page                                                  |
      | Address Book | I see address book title                                             |
