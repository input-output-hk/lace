@WalletRenaming-Extended @Testnet
Feature: Wallet renaming

  Background:
    Given Wallet is synced

  @LW-12276
  Scenario: Extended view - rename wallet - save
    When I click the menu button
    And I click on "Edit" button for wallet number 1
    Then "Wallet settings" drawer is displayed in extended mode
    When I enter "Renamed wallet" as a new wallet name
    And I click on "Save" button on "Wallet settings" page
    Then I see a toast with text: "Wallet renamed successfully"
    When I close a toast message
    Then Wallet number 1 with "Renamed wall..." name is displayed on the user menu
    #And "Renamed wall..." is displayed as a wallet name on the menu button // Bug: LW-12612
    When I click "Receive" button on page header
    Then I see "Renamed wallet" name on main address card

  @LW-12278
  Scenario: Extended view - rename wallet - cancel
    When I click the menu button
    And I click on "Edit" button for wallet number 1
    Then "Wallet settings" drawer is displayed in extended mode
    When I click on "Cancel" button on "Wallet settings" page
    Then I don't see a toast with text: "Wallet renamed successfully"
    And Wallet number 1 with "TestAutomati..." name is displayed on the user menu
    And "TestAutoma..." is displayed as a wallet name on the menu button
    When I click "Receive" button on page header
    Then I see "TestAutomationWallet" name on main address card

  @LW-12280
  Scenario: Extended view - rename wallet - too long name
    When I click the menu button
    And I click on "Edit" button for wallet number 1
    And I enter "012345678901234567890" as a new wallet name
    Then Wallet name error "Max 20 characters" is displayed
    And "Save" button in disabled on "Wallet settings" page

  @LW-12297
  Scenario: Extended view - rename wallet - name cannot be empty
    When I click the menu button
    And I click on "Edit" button for wallet number 1
    And I enter "" as a new wallet name
    Then Wallet name error "Name cannot be empty" is displayed
    And "Save" button in disabled on "Wallet settings" page

  @LW-12286
  Scenario: Extended view - rename account - save
    When I click the menu button
    And I click on "Edit" button for wallet number 1
    And I enter "Renamed account" as a new account name for account #0
    And I click on "Save" button on "Wallet settings" page
    Then I see a toast with text: "Wallet renamed successfully"
    When I close a toast message
    Then Wallet number 1 with "Renamed acco..." account name is displayed on the user menu
#    And "Renamed acco..." is displayed as an account name on the menu button // Bug: LW-12612

  @LW-12288
  Scenario: Extended view - rename account - cancel
    When I click the menu button
    And I click on "Edit" button for wallet number 1
    And I enter "Renamed account" as a new account name for account #0
    And I click on "Cancel" button on "Wallet settings" page
    Then I don't see a toast with text: "Wallet renamed successfully"
    And Wallet number 1 with "Account #0" account name is displayed on the user menu
    And "Account #0" is displayed as an account name on the menu button

  @LW-12290
  Scenario: Extended view - rename account - too long name
    When I click the menu button
    And I click on "Edit" button for wallet number 1
    And I enter "012345678901234567890" as a new account name for account #0
    Then Account name error "Max 20 characters" is displayed for account #0
    And "Save" button in disabled on "Wallet settings" page

  @LW-12300
  Scenario: Extended view - rename wallet - name cannot be empty
    When I click the menu button
    And I click on "Edit" button for wallet number 1
    And I enter "" as a new account name for account #0
    Then Account name error "Name cannot be empty" is displayed for account #0
    And "Save" button in disabled on "Wallet settings" page
