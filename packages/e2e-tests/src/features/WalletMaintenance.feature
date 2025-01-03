@Pending
@WalletMaintenance
Feature: Maintenance feature

  # this feature is for maintenance purposes only

  # scenario below creates new wallet, transfers all funds from desired wallet and
  # prints its data that can be later pasted into walletConfiguration file
  # replace wallet_name in the Examples sections and let the test finish
  # you may still need to manually do the delegation for some wallets

  @RecreateWalletAndTransferAllFunds
  Scenario Outline: Extended View - Check if wallet has more than 1000 transactions, if yes then create a new one, transfer all funds and generate wallet repository entry
    Given I create new wallet with name: "<wallet_name>" and save wallet information
    And I click "Receive" button on page header
    And I click "Copy" button on "Receive" page for default wallet address
    And I open wallet: "<wallet_name>" in: extended mode
    And I navigate to Transactions extended page
    And Transactions counter is showing value higher than 900
    And I navigate to Staking extended page
    And I save identifiers of stake pools currently in use
    And I click "Send" button on page header
    And I fill address input with copied address
    And If available: I add all available Token types to bundle 1
    And I click MAX button for all selected tokens
    And If available: I add all available NFT types to bundle 1
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    When I enter correct password and confirm the transaction
    Then The Transaction submitted screen is displayed in extended mode
    And I print wallet "<wallet_name>" data for walletConfiguration file
    Examples:
      | wallet_name                    |
      | WalletAnalyticsReceiveSimpleTransaction2E2E |

  @CreateNewWallet
  Scenario Outline: Extended View - Create a new wallet and print data
    Given I create new wallet with name: "<wallet_name>" and save wallet information
    And I print wallet "<wallet_name>" data for walletConfiguration file
    Examples:
      | wallet_name                    |
      | TestAutomationWallet |
