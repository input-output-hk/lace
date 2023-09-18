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
    Then I see a toast with message: "browserView.addressBook.toast.addAddress"
    And I see address row with name "test_handle_1" and address "$test_handle_1" on the list in popup mode

  @LW-7334
  Scenario: Popup view - Add an invalid ADA handle to the address book
    Given I am on Address Book popup page
    And I click "Add address" button on address book page
    When I fill address form with "ADA handle" name
    And I fill address form with "$fake_handle" ADA handle
    Then Red "X" icon is displayed next to ADA handle
    And "Handle not found" error is displayed
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
    And I see a toast with message: "browserView.addressBook.toast.editAddress"
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
    And I see a toast with message: "addressBook.errors.givenAddressAlreadyExist"

  @LW-7433
  Scenario: Popup View - Validate custom image from a handle on the "Select NFT" (folder) screen
    Given I click "Receive" button on Tokens page in popup mode
    And I see handle listed on the "Receive" screen
    And I close the drawer by clicking close button
    And I navigate to NFTs popup page
    And I click "Create folder" button on NFTs page
    And I enter a folder name "Ada Handle folder" into "Folder name" input
    When I click "Next" button on "Name your folder" page
    Then I can see the handle listed on the "Select NFT" screen
    And the corresponding custom image is displayed

  @LW-7434
  Scenario: Popup View - Validate custom image from a handle on the NFT folder
    Given I click "Receive" button on Tokens page in popup mode
    And I see handle listed on the "Receive" screen
    And I close the drawer by clicking close button
    And I navigate to NFTs popup page
    And I create folder with name: "Ada Handle folder" that contains 4 NFTs
    When I left click on the NFT folder with name "Ada Handle folder"
    Then I see "Ada Handle folder" NFT folder page in popup mode
    And I see NFT with name "$test_handle_1" on the NFT folder page
    And I see NFT with name "$test_handle_2" on the NFT folder page
    And I see NFT with name "$test_handle_3" on the NFT folder page
    And I see NFT with name "$t_h_1" on the NFT folder page


  @LW-7135 @LW-7139
  Scenario: Popup View - Ada handles displayed and sorted by handle length
    When I click "Receive" button on Tokens page in popup mode
    Then I see "Wallet Address" page in popup mode for wallet "WalletAdaHandle"
    And I see handle listed on the "Receive" screen
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
    Then I see a toast with text: "Address copied"
    And Clipboard contains address of wallet: "WalletAdaHandle"
    When I click "Copy" button on "Receive" page for handle: "$cde"
    Then I see a toast with text: "Handle copied"
    And Clipboard contains text: "$cde"
    When I click "Copy" button on "Receive" page for handle: "$t_h_1"
    Then I see a toast with text: "Handle copied"
    And Clipboard contains text: "$t_h_1"
    When I click "Copy" button on "Receive" page for handle: "$test_handle_1"
    Then I see a toast with text: "Handle copied"
    And Clipboard contains text: "$test_handle_1"
    When I click "Copy" button on "Receive" page for handle: "$test_handle_3"
    Then I see a toast with text: "Handle copied"
    And Clipboard contains text: "$test_handle_3"
