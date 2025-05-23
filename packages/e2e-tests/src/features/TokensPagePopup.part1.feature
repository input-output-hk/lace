@Tokens-popup
Feature: LW: Tokens tab - popup view

  Background:
    Given Wallet is synced

  @LW-2343 @Testnet @Mainnet @skip(browserName='firefox') @issue=LW-12440
  Scenario: Tokens title and counter
    When I see Tokens counter with total number of tokens displayed
    Then Tokens counter matches the number of wallet tokens

  @LW-2344 @Testnet @Mainnet
  Scenario: Tokens total wallet balance
    Then I see total wallet balance in USD

  @LW-2535 @Testnet @Mainnet
  Scenario: Receive & Send buttons displayed
    Then I see Receive & Send buttons on Tokens page in popup mode

  @LW-2346 @Testnet
  Scenario: Tokens list
    Then I see Cardano & LaceCoin tokens on the list with all the details in popup mode

  @LW-2346 @Mainnet
  Scenario: Tokens list
    Then I see Cardano & Hosky tokens on the list with all the details in popup mode

  @LW-2347 @Testnet @Mainnet
  Scenario: Receive button click
    When I click "Receive" button on Tokens page in popup mode
    Then I see "Wallet Address" page in popup mode for wallet "TestAutomationWallet"

  @LW-2348 @Testnet @Mainnet
  Scenario: Send button click
    When I click "Send" button on Tokens page in popup mode
    Then the 'Send' screen is displayed in popup mode

  @LW-2349 @Testnet @skip(browserName='firefox') @issue=LW-12440
  Scenario Outline: "<token_name>" item click
    When I open wallet: "WalletSendBundlesTransactionE2E" in: popup mode
    And I click token with name: "<token_name>"
    Then The Token details screen is displayed for token "<token_name>" with ticker "<token_ticker>" in popup mode
    Examples:
      | token_name | token_ticker |
      | Cardano    | tADA         |
      | LaceCoin2  | LaceCoin2    |

  @LW-2349 @Mainnet @skip(browserName='firefox') @issue=LW-12440
  Scenario Outline: "<token_name>" item click
    When I click token with name: "<token_name>"
    Then The Token details screen is displayed for token "<token_name>" with ticker "<token_ticker>" in popup mode
    Examples:
      | token_name  | token_ticker |
      | Cardano     | ADA          |
      | HOSKY Token | HOSKY        |

  @LW-5905 @Testnet @Mainnet
  Scenario: CoinGecko credits - visibility
    Then I see CoinGecko credits

  @LW-5907 @Testnet @Mainnet
  Scenario: CoinGecko credits - redirection
    When I click on "CoinGecko" link
    Then "www.coingecko.com" page is displayed in new tab

  @LW-6878 @Testnet @Mainnet
  Scenario: Popup View - Hide my balance - positive balance - closed eye icon displayed by default
    Then closed eye icon is displayed on Tokens page
