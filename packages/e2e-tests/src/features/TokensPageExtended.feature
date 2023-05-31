@Tokens-extended
Feature: LW: Tokens tab - extended view

  Background:
    Given Wallet is synced

  @LW-2331 @Testnet @Mainnet
  Scenario: Tokens title and counter
    When I see Tokens counter with total number of tokens displayed
    Then Tokens counter matches the number of wallet tokens

  @LW-2332 @Testnet @Mainnet
  Scenario: Tokens total wallet balance
    Then I see total wallet balance in USD

  @LW-2333 @Testnet @Mainnet
  Scenario: Receive & Send buttons in header
    Then I see Receive & Send buttons in header

  @LW-2334 @Testnet
  Scenario: Tokens list
    Then I see Cardano & LaceCoin tokens on the list with all the details in extended mode

  @LW-2334 @Mainnet
  Scenario: Tokens list
    Then I see Cardano & Hosky tokens on the list with all the details in extended mode

  @LW-2335 @Testnet @Mainnet
  Scenario: Receive button click
    When I click "Receive" button on page header
    Then I see "Wallet Address" page in extended mode

  @LW-2336 @Testnet @Mainnet
  Scenario: Send button click
    When I click "Send" button on page header
    Then the 'Send' screen is displayed in extended mode

  @LW-2337 @Smoke @Testnet
  Scenario Outline: "<token_name>" item click
    When I click token with name: "<token_name>"
    Then The Token details screen is displayed for token "<token_name>" with ticker "<token_ticker>" in extended mode
    Examples:
      | token_name | token_ticker |
      | Cardano    | tADA         |
      | LaceCoin   | LaceCoin1    |

  @LW-2337 @Mainnet
  Scenario Outline: "<token_name>" item click
    When I click token with name: "<token_name>"
    Then The Token details screen is displayed for token "<token_name>" with ticker "<token_ticker>" in extended mode
    Examples:
      | token_name  | token_ticker |
      | Cardano     | ADA          |
      | HOSKY Token | HOSKY        |

  @LW-2338 @Testnet @Mainnet
  Scenario: "About your wallet" widget
    Then I see Tokens "About your wallet" widget with all relevant items

  @LW-2339 @Testnet @Mainnet
  Scenario Outline: "About your wallet" widget item click - <subtitle>
    When I click on a widget item with subtitle: "<subtitle>"
    Then I see a "<type>" article with title "<subtitle>"
    Examples:
      | type     | subtitle                         |
      | Glossary | What is a digital asset?         |
      | FAQ      | How do I send and receive funds? |
      | Video    | Secure self-custody with Lace    |
      | Video    | Connecting to DApps with Lace    |

  @LW-4878 @Testnet @Mainnet
  Scenario: Extended-view - Tokens details - Enter and Escape buttons support
    And I click token with name: "Cardano"
    And The Token details screen is displayed for token "Cardano" with ticker "tADA" in extended mode
    When I press keyboard Escape button
    Then Drawer is not displayed
    And I click token with name: "Cardano"
    When I press keyboard Enter button
    Then send drawer is displayed with all its components in extended mode
    When I press keyboard Escape button
    Then Drawer is not displayed

  @LW-5904 @Testnet @Mainnet
  Scenario: CoinGecko credits - visibility
    Then I see CoinGecko credits

  @LW-5906 @Testnet @Mainnet
  Scenario: CoinGecko credits - redirection
    When I click on "CoinGecko" link
    Then "www.coingecko.com" page is displayed in new tab
