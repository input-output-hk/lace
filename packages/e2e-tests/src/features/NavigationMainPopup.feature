@Runner4 @MainNavigation-Popup @Mainnet @Testnet
Feature: Main Navigation - Popup View

  Background:
    Given Lace is ready for test

  @LW-2687
  Scenario: Popup View - Main navigation is displayed with all items
    When I see main navigation with all items in popup mode

  @LW-2688
  Scenario: Popup View - Main Navigation - Tokens item click navigates to tokens page
    Given I am on NFTs popup page
    When I navigate to Tokens popup page
    When I see Tokens counter with total number of tokens displayed

  @LW-2689
  Scenario: Popup View - Main Navigation - NFTs item click navigates to nfts page
    When I navigate to NFTs popup page
    Then I see NFTs counter with total number of NFTs displayed

  @LW-2690
  Scenario: Popup View - Main Navigation - Transactions item click navigates to transaction page
    When I navigate to Transactions popup page
    Then Transactions section is displayed

  @LW-2691
  Scenario: Popup View - Main Navigation - Staking item click navigates to staking page
    When I navigate to Staking popup page
    Then I see Delegation title displayed for multidelegation

  @LW-2610
  Scenario Outline: Extended view - Click Lace logo - <section>
    And Wallet is synced
    And I navigate to <section> popup page
    And <validateIfSectionIsDisplayed>
    When I click on the logo icon
    Then I see Tokens counter with total number of tokens displayed
    Examples:
      | section      | validateIfSectionIsDisplayed                               |
      | Tokens       | I see Tokens counter with total number of tokens displayed |
      | NFTs         | I see NFTs counter with total number of NFTs displayed     |
      | Transactions | Transactions section is displayed                          |
      | Staking      | I see Delegation title displayed for multidelegation       |
      | Settings     | I see settings page                                        |
      | Address Book | I see address book title                                   |

  @LW-4844
  Scenario Outline: Popup view - theme switcher - <theme> mode
    When I click the menu button
    And I set theme switcher to <theme> mode
    Then I can see application in <theme> mode
    Examples:
      | theme |
      | light |
      | dark  |
