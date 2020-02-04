class HangsengDriver {
    
    constructor() {
        this.tabId = null;
    }

    setTabId(tabId) {
        this.tabId = tabId;
    }

    async * createPaymentProcess(params) {
        yield await this.gotoPaymentPlatform();
        yield await this.delay(500);
        yield await this.gotoBillPaymentSection();
        yield await this.delay(500);
        yield await this.openPayBillsForm();
        yield await this.delay(1000);

        var amountRowOffset;
        if (params.billType == 'REGISTERED_PAYEE') {
            yield await this.selectRegisteredPayeeBill(params.payeeName);
            amountRowOffset = 0;
        } else if (params.billType == 'TAX') {
            yield await this.selectTaxBill(params.taxAccountNumber);
            amountRowOffset = 1;
        }
        yield await this.delay(1000);
        yield await this.fillAmountAndSelectAccount(params.payAmount, params.payAccount, amountRowOffset);
        yield await this.delay(1000);
        yield await this.proceedPayment()
        yield await this.delay(2000);
        yield await this.confirmPayment();
    }

    delay(timeMs) {
        return new Promise((resolve, reject) => {
            setTimeout(() => resolve(), timeMs);
        });
    }

    executeScript(code) {
        return new Promise((resolve, reject) => {
            chrome.tabs.executeScript(this.tabId, { code: `
                try {
                    ${code}
                    null
                } catch (error) {
                    error.message
                }
            ` }, (scriptErrorMessages) => {
                if (scriptErrorMessages[0]) {
                    reject(new Error(scriptErrorMessages[0]));
                } else {
                    resolve();
                }
            });
        });
    }

    async gotoPaymentPlatform() {
        await this.executeScript(`
            var paymentPlatformNav = document.querySelector('#serviceNavItem-2');
            if (!paymentPlatformNav) {
                throw new Error("Payment platform link not found in page");
            }
            if (paymentPlatformNav.className.includes("off") || !paymentPlatformNav.className.includes("on")) {
                paymentPlatformNav.querySelector('a').click();
            }
        `);
    }

    async gotoBillPaymentSection() {
        await this.executeScript(`
            var billPaymentNav = document.querySelector('#serviceNavItem-2-2');
            if (!billPaymentNav) {
                throw new Error("Bill payment link not found in page");
            }
            if (billPaymentNav.className.includes("off") || !billPaymentNav.className.includes("on")) {
                billPaymentNav.querySelector('a').click();
            }
        `);
    }

    async openPayBillsForm() {
        await this.executeScript(`
            var payBillsNavLink = document.querySelector('#serviceNavItem-2-2-2-1 a, #serviceNavItem-2-2-1 a');
            if (!payBillsNavLink) {
                throw new Error("Pay bills link not found in page");
            }
            payBillsNavLink.click();
        `);
    }

    async selectRegisteredPayeeBill(payeeName) {
        await this.executeScript(`
            var payeeDropdown = document.querySelector('.commonForm2 .commonForm2 > tbody > tr:nth-child(2) > td:nth-child(2) > div.ui-dropDown-btn');
            if (!payeeDropdown) {
                throw new Error("Payee dropdown not found in page");
            }
            payeeDropdown.click();
                
            var payeeOptions = document.querySelectorAll('.commonForm2 .commonForm2 > tbody > tr:nth-child(2) > td:nth-child(2) > div.boxOpened td');
            var filteredPayeeOptions = Array.from(payeeOptions)
                .filter(o => o.innerText.includes('${payeeName}'));
            if (filteredPayeeOptions.length == 0) {
                throw new Error("No matched payee found in payee dropdown");
            } else if (filteredPayeeOptions.length > 1) {
                throw new Error("Multiple matched payees found in payee dropdown");
            }
            filteredPayeeOptions[0].click();
        `);
    }

    async selectTaxBill(taxAccountNumber) {
        await this.executeScript(`
            var payeeCategoryDropdown = document.querySelector('.commonForm2 .commonForm2 > tbody > tr:nth-child(4) > td:nth-child(2) > div:nth-child(1)');
            if (!payeeCategoryDropdown) {
                throw new Error("Payee category dropdown not found in page");
            }
            payeeCategoryDropdown.click();

            var payeeCategoryOptions = document.querySelectorAll('.commonForm2 .commonForm2 > tbody > tr:nth-child(4) > td:nth-child(2) > div:nth-child(4) table tr');
            var filteredPayeeCategoryOptions = Array.from(payeeCategoryOptions)
                .filter(o => o.innerText.includes('Government/Statutory Organizations'));
            if (filteredPayeeCategoryOptions.length == 0) {
                throw new Error("Government/Statutory Organizations not found in payee category dropdown");
            }
            filteredPayeeCategoryOptions[0].click();
        `);
        await delay(1000);
        await this.executeScript(`
            var organizationDropdown = document.querySelector('.commonForm2 .commonForm2 > tbody > tr:nth-child(5) > td:nth-child(2) > div:nth-child(1)');
            if (!organizationDropdown) {
                throw new Error("Organization dropdown not found in page");
            }
            organizationDropdown.click();

            var organizationOptions = document.querySelectorAll('.commonForm2 .commonForm2 > tbody > tr:nth-child(5) > td:nth-child(2) > div:nth-child(4) table tr');
            var filteredOrganizationOptions = Array.from(organizationOptions)
                .filter(o => o.innerText.includes('INLAND REVENUE DEPARTMENT'));
            if (filteredOrganizationOptions.length == 0) {
                throw new Error("INLAND REVENUE DEPARTMENT not found in organization dropdown");
            }
            filteredOrganizationOptions[0].click();
        `);
        await delay(2000);
        await this.executeScript(`
            var billAccountNumberInput = document.querySelector('#contentBox-middle > .commonForm2 > tbody > tr:nth-child(2) input');
            if (!billAccountNumberInput) {
                throw new Error("Bill account number input not found in page");
            }
            billAccountNumberInput.value = '${taxAccountNumber}';

            var billTypeDropDown = document.querySelector('#contentBox-middle > .commonForm2 > tbody > tr:nth-child(3) > td:nth-child(2) div:nth-child(1)');
            if (!billTypeDropDown) {
                throw new Error("Bill type dropdown not found in page");
            }
            billTypeDropDown.click();

            var billTypeOptions = document.querySelectorAll('#contentBox-middle > .commonForm2 > tbody > tr:nth-child(3) > td:nth-child(2) div:nth-child(1) table tr');
            var filteredBillTypeOptions = Array.from(billTypeOptions)
                .filter(o => o.innerText.includes('01 TAX DEMAND NOTE'));
            if (filteredBillTypeOptions.length == 0) {
                throw new Error("TAX DEMAND NOTE not found in bill type dropdown");
            }
            filteredBillTypeOptions[0].click();
        `);
    }

    async fillAmountAndSelectAccount(payAmount, payAccount, amountRowOffset) {
        await this.executeScript(`
            var amountInput = document.querySelector('#contentBox-middle > .commonForm2 > tbody > tr:nth-child(${3 + amountRowOffset}) input');
            if (!amountInput) {
                throw new Error("Amount input not found in page");
            }
            amountInput.value = '${payAmount}';

            var deductFromAccountDropdown = document.querySelector('#contentBox-middle > .commonForm2 > tbody > tr:nth-child(${4 + amountRowOffset}) div.ui-dropDown-btn');
            if (!deductFromAccountDropdown) {
                throw new Error("Deduct-from-account dropdown not found in page");
            }
            deductFromAccountDropdown.click();

            var deductFromAccountOptions = document.querySelectorAll('#contentBox-middle > .commonForm2 > tbody > tr:nth-child(${4 + amountRowOffset}) div.boxOpened td');
            var filteredDeductFromAccountOptions = Array.from(deductFromAccountOptions)
                .filter(o => o.innerText.includes('${payAccount}'));
            if (filteredDeductFromAccountOptions.length == 0) {
                throw new Error("No matched account found in deduct-from-account dropdown");
            } else if (filteredDeductFromAccountOptions.length > 1) {
                throw new Error("Multiple matched accounts found in deduct-from-account dropdown");
            }
            filteredDeductFromAccountOptions[0].click();
        `);
    }
    
    async proceedPayment() {
        await this.executeScript(`
            var proceedButton = document.querySelector('a#okBtn');
            if (!proceedButton) {
                throw new Error("Proceed button not found in page");
            }
            proceedButton.click();
        `);
        await delay(1000);
        await this.executeScript(`
            var errorHeadings = document.querySelectorAll('.errorheading');
            if (errorHeadings.length > 0) {
                throw new Error("Error message found in page");
            }

            var systemMessage = document.querySelector('#importantNotes2');
            if (systemMessage && systemMessage.innerText.length > 0) {
                throw new Error("Unexpected system message found in page");
            }
        `);
    }

    async confirmPayment() {
        await this.executeScript(`
            var confirmButton = document.querySelector('.btn-grn-1 a');
            if (!confirmButton) {
                throw new Error("Confirm button not found in page");
            }
            confirmButton.click();
        `);
        await this.delay(5000);
        await this.executeScript(`
            var paymentMessage = document.querySelector('#errorMessage span.blue');
            if (!paymentMessage || paymentMessage.innerText.length == 0) {
                throw new Error("Transaction completed message not found in page");
            }
        `);
    }

}