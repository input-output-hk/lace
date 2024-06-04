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

  @LW-2334 @Smoke @Testnet
  Scenario: Tokens list
    Then I see Cardano & LaceCoin tokens on the list with all the details in extended mode

  @LW-2334 @Mainnet
  Scenario: Tokens list
    Then I see Cardano & Hosky tokens on the list with all the details in extended mode

  @LW-2335 @Testnet @Mainnet
  Scenario: Receive button click
    When I click "Receive" button on page header
    Then I see "Wallet Address" page in extended mode for wallet "TestAutomationWallet"

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
      | type     | subtitle                                                                                                            |
      | Glossary | What is a digital asset?                                                                                            |
      | FAQ      | How do I send and receive funds?                                                                                    |
      | Video    | Secure self-custody with Lace                                                                                       |
      | Video    | Connecting to DApps with Lace                                                                                       |
      | FAQ      | How is the Conway Ledger era (also called governance era) supported by Lace?                                        |
      | FAQ      | What type of governance features are supported in Lace using the GovTool in the current SanchoNet test environment? |
      | FAQ      | What type of governance actions are supported by Lace?                                                              |

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

  @LW-6877 @Testnet @Mainnet
  Scenario: Extended View - Hide my balance - positive balance - closed eye icon displayed by default
    Then closed eye icon is displayed on Tokens page

  @LW-6883 @Testnet @Mainnet
  Scenario: Extended View - Hide my balance - positive balance - hide/reveal balance
    When I click closed eye icon on Tokens page
    Then opened eye icon is displayed on Tokens page
    And total wallet balance is masked with asterisks
    And balance and FIAT balance for each token are masked with asterisks
    When I click opened eye icon on Tokens page
    Then closed eye icon is displayed on Tokens page
    And I see total wallet balance in USD
    And balance and FIAT balance for each token are visible

  @LW-7121 @LW-7123 @Testnet @Mainnet
  Scenario Outline: Extended View - Hide my balance - keep state after <action> the page
    When I click closed eye icon on Tokens page
    Then opened eye icon is displayed on Tokens page
    And total wallet balance is masked with asterisks
    And balance and FIAT balance for each token are masked with asterisks
    When <step>
    Then opened eye icon is displayed on Tokens page
    And total wallet balance is masked with asterisks
    And balance and FIAT balance for each token are masked with asterisks
    Examples:
      | action     | step               |
      | refreshing | I refresh the page |
    # LW-7706
    # | reopening  | I reopen the page  |

  @LW-7125 @Testnet @Mainnet
  Scenario: Extended view - Hide my balance - keep state after switching to popup view
    When I click closed eye icon on Tokens page
    Then opened eye icon is displayed on Tokens page
    And total wallet balance is masked with asterisks
    And balance and FIAT balance for each token are masked with asterisks
    When I visit Tokens page in popup mode
    Then opened eye icon is displayed on Tokens page
    And total wallet balance is masked with asterisks
    And balance and FIAT balance for each token are masked with asterisks

  @LW-6889 @Testnet @Mainnet @Pending
  @issue=LW-10296
  Scenario: Extended view - Token pricing - Price fetch expired error is displayed when coingecko request fails
    Given ADA fiat price has been fetched
    When I enable network interception to fail request: "https://coingecko.*"
    And I shift back last fiat price fetch time in local storage by 500 seconds
    Then "Price data expired" error is displayed
    When I disable network interception
    Then ADA fiat price has been fetched
    And "Price data expired" error is not displayed

  @LW-10283 @Testnet @Mainnet @Pending
  @issue=LW-10296
  Scenario: Extended view - Token pricing - Price fetch expired error is displayed when coingecko request returns 500
    Given ADA fiat price has been fetched
    When I enable network interception to finish request: "https://coingecko.*" with error 500
    And I shift back last fiat price fetch time in local storage by 500 seconds
    Then "Price data expired" error is displayed
    When I disable network interception
    Then ADA fiat price has been fetched
    And "Price data expired" error is not displayed

  @LW-6890 @Testnet @Mainnet @Pending
  @issue=LW-10296
  Scenario: Extended view - Token pricing - Fiat price unable to fetch error is displayed on failed request
    Given ADA fiat price has been fetched
    When I enable network interception to fail request: "https://coingecko.*"
    And I delete fiat price timestamp from background storage
    Then "Unable to fetch fiat values" error is displayed
    When I disable network interception
    Then ADA fiat price has been fetched
    Then "Unable to fetch fiat values" error is not displayed

  @LW-6681 @Testnet @Mainnet @Pending
  @issue=LW-10296
  Scenario: Extended view - Token pricing - Fiat price unable to fetch error is displayed when coingecko request returns 500
    Given ADA fiat price has been fetched
    When I enable network interception to finish request: "https://coingecko.*" with error 500
    And I delete fiat price timestamp from background storage
    Then "Unable to fetch fiat values" error is displayed
    And I disable network interception
    Then ADA fiat price has been fetched
    Then "Unable to fetch fiat values" error is not displayed

  @LW-10328 @Testnet
  Scenario: Extended View - Search tokens by name, policy id, fingerprint and ticker
    When I search for token: "<token>"
    Then I see only token with name: "<token_result>"
    Examples:
      | token                                | token_result |
      | Cardano                              | Cardano      |
      | tADA                                 | Cardano      |
      | tHOSKY                               | tHOSKY       |
      | asset15qks69wv4vk7clnhp4lq7x0rpk6vs0 | tHOSKY       |
      | 25561d09e55d60b64525b9cdb3cfbec      | LaceCoin3    |
