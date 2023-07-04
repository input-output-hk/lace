@AddressBook-popup @Mainnet @Testnet
Feature: Address book - popup view

  Background:
    Given Lace is ready for test

  @LW-4473
  Scenario: Popup-view - Address Book - Empty the address book and confirm
    Given I don't have any addresses added to my address book in popup mode
    Then I see empty address book

  @LW-4474
  Scenario: Popup-view - Address Book - Copy address button
    Given I have 3 addresses in my address book in popup mode
    When I click address on the list with name "Byron"
    And I click on "Copy" button on address detail drawer
    Then I see a toast with message: "general.clipboard.copiedToClipboard"
    And address is saved to clipboard

  @LW-4475
  Scenario Outline: Popup-view - Address Book - Edit address: <edited_address>
    Given I have 3 addresses in my address book in popup mode
    When I click address on the list with name "<edited_address>"
    And I click "Edit" button on address details page
    And I fill "<wallet_name>" and "<address>" address details in drawer
    And I click "core.editAddressForm.doneButton" button
    Then I see a toast with message: "browserView.addressBook.toast.editAddress"
    And I see address with name "<wallet_name>" and address "<address_label>" on the list
    Examples:
      | edited_address | wallet_name  | address                                                                                                            | address_label  |
      | Shelley        | Shelley_edit | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja       | addr_tes...cek |
      | Byron          | Byron_edit   | 37btjrVyb4KC6N6XtRHwEuLPQW2aa9JA89gbnm67PArSi8E7vGeqgA6W1pFBphc1hhrk1WKGPZpUbnvYRimVLRVnUH6M6d3dsVdxYoAC4m7oNj7Dzp | 37btjrVy...Dzp |

  @LW-4476
  Scenario: Popup-view - Address Book - Edit address and cancel
    Given I have 3 addresses in my address book in popup mode
    And I click address on the list with name "Shelley"
    And I click "Edit" button on address details page
    When I click "browserView.addressBook.deleteModal.buttons.cancel" button
    Then I see address detail page in popup mode

  @LW-4566
  Scenario Outline: Popup-view - Address Book - Edit wallet name/address and display error message - name error: <name_error>, address error: <address_error>
    Given I have 3 addresses in my address book in popup mode
    And I click address on the list with name "Shelley"
    And I click "Edit" button on address details page
    And I fill "<wallet_name>" and "<address>" address details in drawer
    Then Contact name error: "<name_error>" and address error: "<address_error>" are displayed
    And "core.editAddressForm.doneButton" button is disabled
    Examples:
      | wallet_name               | address                                                                                                         | name_error                       | address_error                       |
      | empty                     | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja    | Name field is required           | empty                               |
      | too_long_name_123456789   | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja    | Max 20 Characters                | empty                               |
      | " name preceded by space" | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja    | Name has unnecessary white space | empty                               |
      | valid wallet name         | empty                                                                                                           | empty                            | Address field is required           |
      | valid wallet name         | invalid_address                                                                                                 | empty                            | Incorrect Cardano address           |
      | valid wallet name         | " addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja" | empty                            | Address has unnecessary white space |
      | valid wallet name         | "addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja " | empty                            | Address has unnecessary white space |
      | empty                     | empty                                                                                                           | Name field is required           | Address field is required           |
      | "name followed by space " | invalid_address                                                                                                 | Name has unnecessary white space | Incorrect Cardano address           |

  @LW-4568
  Scenario Outline: Popup-view - Address Book - Edit address book entry - Uniqueness validation and toast display with text <toast_message>
    Given I have 3 addresses in my address book in popup mode
    And I click address on the list with name "Shelley"
    And I click "Edit" button on address details page
    And I fill wallet name: "<wallet_name>" and get address by name: "<wallet_address>" outside drawer
    And "core.editAddressForm.doneButton" button is enabled
    Then I click "core.editAddressForm.doneButton" button
    And I see a toast with message: "<toast_message>"
    Examples:
      | wallet_name | wallet_address | toast_message                               |
      | Byron       | Byron          | addressBook.errors.givenNameAlreadyExist    |
      | SomeWallet  | Byron          | addressBook.errors.givenAddressAlreadyExist |

  @LW-4534
  Scenario: Popup-view - Address Book - Edit address and click back button
    Given I have 3 addresses in my address book in popup mode
    And I click address on the list with name "Shelley"
    And I click "Edit" button on address details page
    When I close the drawer by clicking back button
    Then I see address detail page in popup mode

  @LW-4477
  Scenario: Popup-view - Address Book - Remove address
    Given I have 3 addresses in my address book in popup mode
    When I click address on the list with name "Byron"
    And I see address detail page in popup mode
    And I click "Delete" button on address details page
    Then I see delete address modal
    When I click "Delete address" button on delete address modal
    Then I don't see address with name "Byron" and address "37btjrVyb4KC6N6XtRHwEuLPQW2aa9JA89gbnm67PArSi8E7vGeqgA6W1pFBphc1hhrk1WKGPZpUbnvYRimVLRVnUH6M6d3dsVdxYoAC4m7oNj7Dzp" on the list

  @LW-4478
  Scenario: Popup-view - Address Book - Remove address and cancel
    Given I have 3 addresses in my address book in popup mode
    When I click address on the list with name "Byron"
    And I see address detail page in popup mode
    And I click "Delete" button on address details page
    And I click "Cancel" button on delete address modal
    Then I see address detail page in popup mode

  @LW-4479
  Scenario Outline: Popup-view - Address Book - Add new address <wallet_name>
    Given I don't have any addresses added to my address book in popup mode
    When I click "Add address" button on address book page
    Then I see Add new address form
    And "browserView.addressBook.addressForm.saveAddress" button is disabled
    When I fill wallet name: "<wallet_name>" and get address by name: "<wallet_address>" in drawer
    And I click "browserView.addressBook.addressForm.saveAddress" button
    Then I see a toast with message: "browserView.addressBook.toast.addAddress"
    And I see address that has name "<name_label>" and shortened address "<wallet_address>" on the list
    Examples:
      | wallet_name          | wallet_address | name_label  |
      | Byron_man            | Byron          | Byron_man   |
      | Shelley_man          | Shelley        | Shelley_man |
      | Icarus_man           | Icarus         | Icarus_man  |
      | 12345678901234567890 | Shelley        | 12345678    |
      | !@#$%^&*(){}:,./     | Shelley        | !@#$%^&*()  |
      | ęóąśłżźćń_ASDFÓŚ     | Shelley        | ęóąśłżźćń   |

  @LW-4480
  Scenario Outline: Popup-view - Address Book - Add new address and display error message  - Name: <name_error> - Address: <address_error>
    Given I don't have any addresses added to my address book in popup mode
    When I click "Add address" button on address book page
    And I fill "<wallet_name>" and "<address>" address details outside drawer
    Then Contact name error: "<name_error>" and address error: "<address_error>" are displayed
    And "browserView.addressBook.addressForm.saveAddress" button is disabled
    Examples:
      | wallet_name               | address                                                                  | name_error                       | address_error                       |
      | too_long_name_123456789   | addr_invalid                                                             | Max 20 Characters                | Incorrect Cardano address           |
      | name_ok                   | addr_invalid                                                             | empty                            | Incorrect Cardano address           |
      | too_long_name_123456789   | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf    | Max 20 Characters                | empty                               |
      | "name followed by space " | "2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf " | Name has unnecessary white space | Address has unnecessary white space |
      | " name preceded by space" | " 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf" | Name has unnecessary white space | Address has unnecessary white space |

  @LW-4555
  Scenario Outline: Popup-view - Address Book - Add empty name/address and display error message - Name: <name_error> - Address: <address_error>
    Given I don't have any addresses added to my address book in popup mode
    When I click "Add address" button on address book page
    And I fill "<wallet_name>" and "<address>" address details outside drawer
    And I fill "<wallet_name2>" and "<address2>" address details outside drawer
    Then Contact name error: "<name_error>" and address error: "<address_error>" are displayed
    And "browserView.addressBook.addressForm.saveAddress" button is disabled
    Examples:
      | wallet_name | wallet_name2 | address                                                               | address2                                                              | name_error             | address_error             |
      | name_ok     | empty        | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf | Name field is required | empty                     |
      | name_ok     | name_ok      | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf | empty                                                                 | empty                  | Address field is required |
      | name_ok     | empty        | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf | empty                                                                 | Name field is required | Address field is required |

  @LW-4481
  Scenario Outline: Popup-view - Address Book - Uniqueness validation and toast display with text <toast_message>
    Given I have 3 addresses in my address book in popup mode
    When I click "Add address" button on address book page
    And I fill wallet name: "<wallet_name>" and get address by name: "<wallet_address>" outside drawer
    And I click "browserView.addressBook.addressForm.saveAddress" button
    Then I see a toast with message: "<toast_message>"
    Examples:
      | wallet_name | wallet_address | toast_message                               |
      | Byron       | Byron          | addressBook.errors.givenNameAlreadyExist    |
      | SomeWallet  | Byron          | addressBook.errors.givenAddressAlreadyExist |

  @LW-4784
  Scenario: Popup-view - Address Book - Display error message after filling name and clicking outside with empty address
    Given I don't have any addresses added to my address book in popup mode
    When I click "Add address" button on address book page
    Then I see Add new address form
    When I fill "addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja" address field in address book outside drawer
    When I fill "empty" name for address details outside drawer
    And I click on address book background to lose focus in drawer
    Then Contact name error: "Name field is required" and address error: "empty" are displayed

  @LW-4783
  Scenario: Popup-view - Address Book - No error is displayed when leaving both fields empty
    Given I don't have any addresses added to my address book in popup mode
    When I click "Add address" button on address book page
    Then I see Add new address form
    When I fill "name_ok" and "addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja" address details outside drawer
    And I remove Name field content in address book outside drawer
    And I remove Address field content in address book outside drawer
    And I click on address book background to lose focus in drawer
    Then Contact name error: "empty" and address error: "empty" are displayed
    And "core.addressForm.addAddress" button is disabled

  @LW-4785
  Scenario: Popup-view - Address Book - Display error message after filling name and clicking outside with empty address
    Given I don't have any addresses added to my address book in popup mode
    When I click "Add address" button on address book page
    Then I see Add new address form
    When I fill "name_ok" name for address details in drawer
    And I fill "empty" address field in address book in drawer
    And I click on address book background to lose focus in drawer
    Then Contact name error: "empty" and address error: "Address field is required" are displayed
