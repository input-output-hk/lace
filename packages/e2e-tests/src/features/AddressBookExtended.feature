@AddressBook-extended @Mainnet @Testnet
Feature: Address book - extended view

  Background:
    Given Lace is ready for test

  @LW-4456
  Scenario: Extended-view - Address Book - Empty address book
    Given I don't have any addresses added to my address book in extended mode
    Then I see empty address book

  @LW-4459
  Scenario: Extended-view - Address Book - Addresses list verification
    Given I have 3 addresses in my address book in extended mode
    When I see address count: 3
    Then address list is displayed and each row consists of:
      | Avatar  |
      | Name    |
      | Address |


  @LW-4464 @Smoke
  Scenario: Extended-view - Address Book - Add new address "Shelley_manual"
    Given I don't have any addresses added to my address book in extended mode
    And I click "Add address" button on address book page
    And I see Add new address form
    And "browserView.addressBook.addressForm.saveAddress" button is disabled
    When I fill "Shelley_manual" and "addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja" address details outside drawer
    And I click "browserView.addressBook.addressForm.saveAddress" button
    Then I see a toast with message: "browserView.addressBook.toast.addAddress"
    And I see address with name "Shelley_manual" and address "addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja" on the list

  @LW-4464
  Scenario Outline: Extended-view - Address Book - Add new address <wallet_name>
    Given I don't have any addresses added to my address book in extended mode
    And I click "Add address" button on address book page
    And I see Add new address form
    And "browserView.addressBook.addressForm.saveAddress" button is disabled
    When I fill "<wallet_name>" and "<address>" address details outside drawer
    And I click "browserView.addressBook.addressForm.saveAddress" button
    Then I see a toast with message: "browserView.addressBook.toast.addAddress"
    And I see address with name "<wallet_name>" and address "<address>" on the list
    Examples:
      | wallet_name          | address                                                                                                            |
      | Byron_manual         | 37btjrVyb4KC6N6XtRHwEuLPQW2aa9JA89gbnm67PArSi8E7vGeqgA6W1pFBphc1hhrk1WKGPZpUbnvYRimVLRVnUH6M6d3dsVdxYoAC4m7oNj7Dzp |
      | Icarus_manual        | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf                                              |
      | 12345678901234567890 | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja       |
      | !@#$%^&*(){}:,./     | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja       |
      | ęóąśłżźćń_ASDFÓŚ     | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja       |

  @LW-4465
  Scenario Outline: Extended-view - Address Book - Add new address and display error message - Name: <name_error> - Address: <address_error>
    Given I don't have any addresses added to my address book in extended mode
    And I click "Add address" button on address book page
    And I see Add new address form
    When I fill "<wallet_name>" and "<address>" address details outside drawer
    Then Contact name error: "<name_error>" and address error: "<address_error>" are displayed
    And "browserView.addressBook.addressForm.saveAddress" button is disabled
    Examples:
      | wallet_name               | address                                                                  | name_error                       | address_error                       |
      | too_long_name_123456789   | addr_invalid                                                             | Max 20 Characters                | Incorrect Cardano address           |
      | name_ok                   | addr_invalid                                                             | empty                            | Incorrect Cardano address           |
      | too_long_name_123456789   | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf    | Max 20 Characters                | empty                               |
      | "name followed by space " | "2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf " | Name has unnecessary white space | Address has unnecessary white space |
      | " name preceded by space" | " 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf" | Name has unnecessary white space | Address has unnecessary white space |

  @LW-4554
  Scenario Outline: Extended-view - Address Book - Add empty name/address and display error message - Name: <name_error> - Address: <address_error>
    Given I don't have any addresses added to my address book in extended mode
    And I click "Add address" button on address book page
    And I see Add new address form
    When I fill "<wallet_name>" and "<address>" address details outside drawer
    When I fill "<wallet_name2>" and "<address2>" address details outside drawer
    Then Contact name error: "<name_error>" and address error: "<address_error>" are displayed
    And "browserView.addressBook.addressForm.saveAddress" button is disabled
    Examples:
      | wallet_name | wallet_name2 | address                                                               | address2                                                              | name_error             | address_error             |
      | name_ok     | empty        | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf | Name field is required | empty                     |
      | name_ok     | name_ok      | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf | empty                                                                 | empty                  | Address field is required |
      | name_ok     | empty        | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf | empty                                                                 | Name field is required | Address field is required |

  @LW-4466
  Scenario: Extended-view - Address Book - Remove address
    Given I have 3 addresses in my address book in extended mode
    When I click address on the list with name "Byron"
    And I see address detail page in extended mode
    And I click "Delete" button on address details page
    Then I see delete address modal
    When I click "Delete address" button on delete address modal
    Then I don't see address with name "Byron" and address "37btjrVyb4KC6N6XtRHwEuLPQW2aa9JA89gbnm67PArSi8E7vGeqgA6W1pFBphc1hhrk1WKGPZpUbnvYRimVLRVnUH6M6d3dsVdxYoAC4m7oNj7Dzp" on the list

  @LW-4467
  Scenario: Extended-view - Address Book - Remove address and cancel
    Given I have 3 addresses in my address book in extended mode
    When I click address on the list with name "Byron"
    And I see address detail page in extended mode
    And I click "Delete" button on address details page
    And I click "Cancel" button on delete address modal
    Then I see address detail page in extended mode

  @LW-4468 @Smoke
  Scenario Outline: Extended-view - Address Book - Uniqueness validation and toast display with text <toast_message>
    Given I have 3 addresses in my address book in extended mode
    And I click "Add address" button on address book page
    When I fill wallet name: "<wallet_name>" and get address by name: "<wallet_address>" outside drawer
    And I click "browserView.addressBook.addressForm.saveAddress" button
    Then I see a toast with message: "<toast_message>"
    Examples:
      | wallet_name | wallet_address | toast_message                               |
      | Byron       | Byron          | addressBook.errors.givenNameAlreadyExist    |
      | SomeWallet  | Byron          | addressBook.errors.givenAddressAlreadyExist |

  @LW-4469
  Scenario: Extended-view - Address Book - Copy address button
    Given I have 3 addresses in my address book in extended mode
    When I click address on the list with name "Byron"
    And I click on "Copy" button on address detail drawer
    Then I see a toast with message: "general.clipboard.copiedToClipboard"
    And address is saved to clipboard

  @LW-4470
  Scenario Outline: Extended-view - Address Book - Edit address: <edited_address>
    Given I have 3 addresses in my address book in extended mode
    When I click address on the list with name "<edited_address>"
    And I click "Edit" button on address details page
    And I fill "<wallet_name>" and "<address>" address details in drawer
    And I click "core.editAddressForm.doneButton" button
    Then I see a toast with message: "browserView.addressBook.toast.editAddress"
    And I see address with name "<wallet_name>" and address "<address>" on the list
    Examples:
      | edited_address | wallet_name    | address                                                                                                            |
      | Shelley        | Shelley_edited | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja       |
      | Byron          | Byron_edited   | 37btjrVyb4KC6N6XtRHwEuLPQW2aa9JA89gbnm67PArSi8E7vGeqgA6W1pFBphc1hhrk1WKGPZpUbnvYRimVLRVnUH6M6d3dsVdxYoAC4m7oNj7Dzp |

  @LW-4471
  Scenario: Extended-view - Address Book - Edit address and cancel
    Given I have 3 addresses in my address book in extended mode
    And I click address on the list with name "Shelley"
    And I click "Edit" button on address details page
    When I click "browserView.addressBook.deleteModal.buttons.cancel" button
    Then I see address detail page in extended mode

  @LW-4565
  Scenario Outline: Extended-view - Address Book - Edit wallet name/address and display error message - name error: <name_error>, address error: <address_error>
    Given I have 3 addresses in my address book in extended mode
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

  @LW-4567
  Scenario Outline: Extended-view - Address Book - Edit address book entry - Uniqueness validation and toast display with text <toast_message>
    Given I have 3 addresses in my address book in extended mode
    And I click address on the list with name "Shelley"
    And I click "Edit" button on address details page
    And I fill wallet name: "<wallet_name>" and get address by name: "<wallet_address>" in drawer
    And I click "core.editAddressForm.doneButton" button
    Then I see a toast with message: "<toast_message>"
    Examples:
      | wallet_name | wallet_address | toast_message                               |
      | Byron       | Byron          | addressBook.errors.givenNameAlreadyExist    |
      | SomeWallet  | Byron          | addressBook.errors.givenAddressAlreadyExist |

  @LW-4535
  Scenario: Extended-view - Address Book - Edit address and click exit button
    Given I have 3 addresses in my address book in extended mode
    And I click address on the list with name "Shelley"
    And I click "Edit" button on address details page
    When I close the drawer by clicking close button
    Then address list is displayed and each row consists of:
      | Avatar  |
      | Name    |
      | Address |

  @LW-4536
  Scenario: Extended-view - Address Book - Edit address and click back button
    Given I have 3 addresses in my address book in extended mode
    And I click address on the list with name "Shelley"
    And I click "Edit" button on address details page
    When I close the drawer by clicking back button
    Then I see address detail page in extended mode

  @LW-4484
  Scenario: Extended-view - Address Book - "About your wallet" widget
    Given I don't have any addresses added to my address book in extended mode
    Then I see Address Book "About your wallet" widget with all relevant items

  @LW-4485
  Scenario Outline: Extended-view - Address Book - "About your wallet" widget item click - <subtitle>
    Given I don't have any addresses added to my address book in extended mode
    When I click on a widget item with subtitle: "<subtitle>"
    Then I see a "<type>" article with title "<subtitle>"
    Examples:
      | type     | subtitle                       |
      | Glossary | What is the Lace address book? |
      | Glossary | What is a saved address?       |

  @LW-4744
  Scenario: Extended-view - Address Book - Enter and Escape buttons support when editing address
    Given I have 3 addresses in my address book in extended mode
    When I click address on the list with name "Byron"
    Then I see address detail page in extended mode
    When I press keyboard Enter button
    Then An "browserView.addressBook.editAddress.title" text is displayed
    When I press keyboard Escape button
    And I see address detail page in extended mode
    When I press keyboard Enter button
    And I fill "Byron_edited" and "37btjrVyb4KC6N6XtRHwEuLPQW2aa9JA89gbnm67PArSi8E7vGeqgA6W1pFBphc1hhrk1WKGPZpUbnvYRimVLRVnUH6M6d3dsVdxYoAC4m7oNj7Dzp" address details in drawer
    When I press keyboard Enter button
    Then I see a toast with message: "browserView.addressBook.toast.editAddress"

  @LW-4745
  Scenario: Extended-view - Address Book - Escape button support when closing drawer
    Given I have 3 addresses in my address book in extended mode
    When I click address on the list with name "Byron"
    Then I see address detail page in extended mode
    When I press keyboard Escape button
    Then I do not see address detail page in extended mode

  @LW-4779
  Scenario: Extended-view - Address Book - Display error message after filling name and clicking outside with empty address
    Given I don't have any addresses added to my address book in extended mode
    And I click "Add address" button on address book page
    And I see Add new address form
    When I fill "name_ok" name for address details outside drawer
    And I fill "empty" address field in address book outside drawer
    And I click on address book background to lose focus outside drawer
    Then Contact name error: "empty" and address error: "Address field is required" are displayed

  @LW-4780
  Scenario: Extended-view - Address Book - Display error message when adding valid address and clicking outside with empty name field
    Given I don't have any addresses added to my address book in extended mode
    And I click "Add address" button on address book page
    And I see Add new address form
    When I fill "addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja" address field in address book outside drawer
    When I fill "empty" name for address details outside drawer
    And I click on address book background to lose focus outside drawer
    Then Contact name error: "Name field is required" and address error: "empty" are displayed

  @LW-4781
  Scenario: Extended-view - Address Book - No error is displayed when leaving both fields empty
    Given I don't have any addresses added to my address book in extended mode
    And I click "Add address" button on address book page
    And I see Add new address form
    When I fill "name_ok" and "addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja" address details outside drawer
    And I remove Name field content in address book outside drawer
    And I remove Address field content in address book outside drawer
    And I click on address book background to lose focus outside drawer
    Then Contact name error: "empty" and address error: "empty" are displayed
    And "core.addressForm.addAddress" button is disabled

  @LW-7146 @Pending
  #Bug LW-7147
  Scenario: Extended-view - Address Book - Add address button is removed when right side panel is displayed
    Given I don't have any addresses added to my address book in extended mode
    And I resize the window to a width of: 1000 and a height of: 840
    Then I see a button to open the right side panel
    When I click on right side panel icon
    Then I see the right side panel for Address Book section
    And I do not see "browserView.addressBook.addressForm.title.add" button
