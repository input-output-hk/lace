@AdaHandle-popup @Testnet
Feature: ADA handle - popup view

  Background:
    Given Wallet is synced
    And all NFT folders are removed

  @LW-7332
  Scenario: Popup view - Add a valid ADA handle to the address book
    Given I am on Address Book popup page
    And I click "Add address" button on address book page
    When I fill address form with "test_handle_1" name
    And I fill address form with "$test_handle_1" ADA handle
    Then Green tick icon is displayed next to ADA handle
    And "Save address" button is enabled on "Add new address" drawer
    When I click "Save address" button on "Add new address" drawer
    Then I see a toast with message: "Address added"
    And I see address row with name "test_handle_1" and address "$test_handle_1" on the list in popup mode

  @LW-7334
  Scenario: Popup view - Add an invalid ADA handle to the address book
    Given I am on Address Book popup page
    And I click "Add address" button on address book page
    When I fill address form with "ADA handle" name
    And I fill address form with "$fake_handle" ADA handle
    Then Red "X" icon is displayed next to ADA handle
    And "Handle not found" error is displayed in address book form
    And "Save address" button is disabled on "Add new address" drawer

  @LW-7336
  Scenario: Popup view - Edit an ADA handle from the address book
    Given I have 2 addresses with ADA handle in my address book in popup mode
    And I click address on the list with name "Ada Handle 1"
    And I see address detail page in popup mode with details of "Ada Handle 1" address
    And I click "Edit" button on address details page
    And I see "Edit address" drawer in popup mode with details of "Ada Handle 1" address
    When I fill address form with "AH 1 edited" name and "$test_handle_3" address
    Then Green tick icon is displayed next to ADA handle
    And I click "Done" button on "Edit address" drawer
    And I see a toast with message: "Edited successfully"
    And I see address row with name "AH 1 edited" and address "$test_handle_3" on the list in popup mode

  @LW-7338
  Scenario: Popup view - Edit an ADA handle from the address book with an invalid handle
    Given I have 2 addresses with ADA handle in my address book in popup mode
    And I click address on the list with name "Ada Handle 1"
    And I click "Edit" button on address details page
    When I fill address form with "AH 1 edited" name and "$a3asd35" address
    Then Red "X" icon is displayed next to ADA handle
    And Contact "empty" name error and "Handle not found" address error are displayed
    And "Done" button is disabled on "Edit address" drawer

  @LW-7340
  Scenario: Popup view - Edit an ADA handle from the address book with a duplicated handle
    Given I have 2 addresses with ADA handle in my address book in popup mode
    And I click address on the list with name "Ada Handle 1"
    And I click "Edit" button on address details page
    When I fill address form with "AH 1 edited" name and "$test_handle_2" address
    Then Green tick icon is displayed next to ADA handle
    And I click "Done" button on "Edit address" drawer
    And I see a toast with message: "Given address already exists"

  @LW-7135 @LW-7139
  Scenario: Popup View - Ada handles displayed and sorted by handle length
    When I click "Receive" button on Tokens page in popup mode
    Then I see "Wallet Address" page in popup mode for wallet "WalletAdaHandle"
    And I see handles listed on the "Receive" screen
    And I see address card for handle: "$cde"
    And I see address card for handle: "$t_h_1"
    And I see address card for handle: "$test_handle_1"
    And I see address card for handle: "$test_handle_2"
    And I see address card for handle: "$test_handle_3"
    And The first ADA handle displayed on the list is the shortest

  @LW-7137 @LW-7070
  Scenario: Popup View - Copy address/ADA handle
    And I click "Receive" button on Tokens page in popup mode
    And I see "Wallet Address" page in popup mode for wallet "WalletAdaHandle"
    When I click "Copy" button on "Receive" page for default wallet address
    Then I see a toast with message: "Address copied"
    And Clipboard contains address of wallet: "WalletAdaHandle"
    When I click "Copy" button on "Receive" page for handle: "$cde"
    Then I see a toast with message: "Handle copied"
    And Clipboard contains text: "$cde"
    When I click "Copy" button on "Receive" page for handle: "$t_h_1"
    Then I see a toast with message: "Handle copied"
    And Clipboard contains text: "$t_h_1"
    When I click "Copy" button on "Receive" page for handle: "$test_handle_1"
    Then I see a toast with message: "Handle copied"
    And Clipboard contains text: "$test_handle_1"
    When I click "Copy" button on "Receive" page for handle: "$test_handle_3"
    Then I see a toast with message: "Handle copied"
    And Clipboard contains text: "$test_handle_3"

  @LW-7435 @LW-7436
  Scenario: Popup View - Validate custom ADA handle image on the wallet address/NFTs/NFT details page
    And I click "Receive" button on Tokens page in popup mode
    Then I see ADA handle with custom image on the "Wallet Address" page
    And I close the drawer by clicking close button
    When I navigate to NFTs popup page
    Then I see ADA handle NFT with custom image on the NFTs page
    When I left click on the NFT with name "$test_handle_1" on NFTs page
    Then I see ADA handle NFT details page with custom image in popup mode

  @LW-7432
  Scenario: Popup View - Validate custom ADA handle image on the send/coin selector page
    When I click "Send" button on Tokens page in popup mode
    And I click "Add token or NFT" button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    Then NFT with name: "$test_handle_1" is displayed in coin selector
    And I see ADA handle NFT with custom image on the Coin selector page
    When I click on NFT with name: "$test_handle_1" in asset selector
    Then the "$test_hand..." asset is displayed in bundle 1

  @LW-7434
  Scenario: Popup View - Validate custom ADA handle image on the NFT folder thumbnail/page
    Given I click "Receive" button on Tokens page in popup mode
    And I see handles listed on the "Receive" screen
    And I close the drawer by clicking close button
    And I navigate to NFTs popup page
    When I create folder with name: "Ada Handle folder" that contains 4 NFTs
    Then I see a thumbnail of ADA handle with custom image on the NFT folder with name: "Ada Handle folder"
    When I left click on the NFT folder with name "Ada Handle folder"
    And I see "Ada Handle folder" NFT folder page in popup mode
    And I see NFT with name "$test_handle_1" on the NFT folder page
    And I see NFT with name "$test_handle_2" on the NFT folder page
    And I see NFT with name "$test_handle_3" on the NFT folder page
    And I see NFT with name "$t_h_1" on the NFT folder page
    Then I see ADA handle NFT with custom image on the NFT folder page

  @LW-7433
  Scenario: Popup View - Validate custom image from a handle on the "Select NFT" (folder) screen
    Given I click "Receive" button on Tokens page in popup mode
    And I see handles listed on the "Receive" screen
    And I close the drawer by clicking close button
    And I navigate to NFTs popup page
    And I click "Create folder" button on NFTs page
    And I enter a folder name "Ada Handle folder" into "Folder name" input
    When I click "Next" button on "Name your folder" page
    Then I can see the handles listed on the "Select NFT" screen
    And I see ADA handle NFT with custom image on the Select NFT page
    And the corresponding custom images are displayed

  @LW-5023 @LW-5029 @LW-5033
  Scenario: Popup View - Send flow - Enter ADA handle and confirm validated
    When I click "Send" button on Tokens page in popup mode
    And I enter "$test_handle_3" in the bundle 1 recipient's address
    Then search loader is displayed inside address input field
    And Green tick icon is displayed next to ADA handle
    And "Add address" button is enabled in the bundle 1 recipient's address input

  @LW-5024 @LW-5031
  Scenario: Popup View - Send flow - Enter ADA handle and confirm invalid
    When I click "Send" button on Tokens page in popup mode
    And I enter "$fake_handle" in the bundle 1 recipient's address
    Then search loader is displayed inside address input field
    And Red exclamation icon is displayed next to ADA handle
    And "Handle not found" error is displayed under address input in "Send" drawer
    And "Add address" button is disabled in the bundle 1 recipient's address input

  @LW-8747
  Scenario: Popup View - Send flow - Add address - Valid ADA handle
    When I click "Send" button on Tokens page in popup mode
    And I enter "$test_handle_3" in the bundle 1 recipient's address
    And click "Add address" button inside address input 1
    And I fill address form with "test handle" name
    Then Green tick icon is displayed next to ADA handle
    And "Save address" button is enabled on "Add new address" drawer

  @LW-8749
  Scenario: Popup View - Send flow - Add address - Invalid ADA handle
    When I click "Send" button on Tokens page in popup mode
    And I enter "$test_handle_3" in the bundle 1 recipient's address
    And click "Add address" button inside address input 1
    And I fill address form with "test handle" name
    And I fill address form with "$fake_handle" ADA handle
    Then Red "X" icon is displayed next to ADA handle
    And "Handle not found" error is displayed in address book form
    And "Save address" button is disabled on "Add new address" drawer
