class HangsengDriver {
    
    constructor() {
        this.tabId = null;
    }

    setTabId(tabId) {
        this.tabId = tabId;
    }

    async pay(params) {
        await this.gotoPaymentService();
        await this.delay(500);
        await this.gotoBillPaymentService();
        await this.delay(500);
        await this.gotoBillPaymentForm();
        await this.delay(1000);

        var amountRowOffset;
        if (params.billType == 'REGISTERED_PAYEE') {
            await this.selectRegisteredPayeeBill(params.payeeName);
            amountRowOffset = 0;
        } else if (params.billType == 'TAX') {
            await this.selectTaxBill(params.taxAccountNumber);
            amountRowOffset = 1;
        }
        await this.delay(1000);
        await this.fillAmountAndSelectAccount(params.payAmount, params.payAccount, amountRowOffset);
        await this.delay(1000);
        await this.proceedPayment()
        await this.delay(2000);
        await this.confirmPayment();
        await this.delay(5000);
        await this.verifyPayment();
    }

    delay(timeMs) {
        return new Promise((resolve, reject) => {
            setTimeout(() => resolve(), timeMs);
        });
    }

    executeScript(detail) {
        return new Promise((resolve, reject) => {
            chrome.tabs.executeScript(this.tabId, detail, (result) => {
                resolve(result);
            });
        });
    }

    async gotoPaymentService() {
        const navClass = await this.executeScript({ code: `
            var paymentServiceNav = document.querySelector('#serviceNavItem-2');
            if (paymentServiceNav.className.includes("off") || !paymentServiceNav.className.includes("on")) {
                var paymentServiceNavLink = document.querySelector('#serviceNavItem-2 > a');
                paymentServiceNavLink.click();
            }
            paymentServiceNav.className
        `});
        if (!navClass[0] || !(navClass[0].includes("on") || !navClass[0].includes("off"))) {
            throw new Error("Failed to verify payment service selected");
        }
    }

    async gotoBillPaymentService() {
        const navClass = await this.executeScript({ code: `
            var billPaymentNav = document.querySelector('#serviceNavItem-2-2');
            if (billPaymentNav.className.includes("off") || !billPaymentNav.className.includes("on")) {
                var billPaymentNavLink = document.querySelector('#serviceNavItem-2-2 a');
                billPaymentNavLink.click();
            }
            billPaymentNav.className
        `});
        if (!navClass[0] || !(navClass[0].includes("on") || !navClass[0].includes("off"))) {
            throw new Error("Failed to verify bill payment service selected");
        }
    }

    async gotoBillPaymentForm() {
        await this.executeScript({ code: `
            var paymentFormNavLink = document.querySelector('#serviceNavItem-2-2-2-1 a, #serviceNavItem-2-2-1 a');
            paymentFormNavLink.click();
        `});
        await delay(1000);
        const navClass = await this.executeScript({ code: `
            var paymentFormNav = document.querySelector('#serviceNavItem-2-2-2-1, #serviceNavItem-2-2-1');
            paymentFormNav.className
        `});
        if (!navClass[0] || !(navClass[0].includes("on") || !navClass[0].includes("off"))) {
            throw new Error("Failed to verify bill payment form selected");
        }
    }

    async selectRegisteredPayeeBill(payeeName) {
        const numReselectLinks = await this.executeScript({ code: `
            var billDropdowns = document.querySelectorAll('.commonForm2 .commonForm2 > tbody > tr:nth-child(2) > td:nth-child(2) > div.ui-dropDown-btn');
            if (billDropdowns.length > 0 && billDropdowns[0].innerText.includes('Please Select')) {
                billDropdowns[0].click();
                
                var billOptions = document.querySelectorAll('.commonForm2 .commonForm2 > tbody > tr:nth-child(2) > td:nth-child(2) > div.boxOpened td');
                for (var i = 0; i < billOptions.length; i++) {
                    if (billOptions[i].innerText.includes('${payeeName}')) {
                        billOptions[i].click();
                        break;
                    }
                }
            }
        `});
    }

    async selectTaxBill(taxAccountNumber) {
        await this.executeScript({ code: `
            var payeeCategoryDropdown = document.querySelector('.commonForm2 .commonForm2 > tbody > tr:nth-child(4) > td:nth-child(2) > div:nth-child(1)');
            payeeCategoryDropdown.click();

            var payeeCategoryOptions = document.querySelectorAll('.commonForm2 .commonForm2 > tbody > tr:nth-child(4) > td:nth-child(2) > div:nth-child(4) table tr');
            for (var i = 0; i < payeeCategoryOptions.length; i++) {
                if (payeeCategoryOptions[i].innerText.includes('Government/Statutory Organizations')) {
                    payeeCategoryOptions[i].click();
                    break;
                }
            }
        `});
        await delay(1000);
        await this.executeScript({ code: `
            var organizationDropdown = document.querySelector('.commonForm2 .commonForm2 > tbody > tr:nth-child(5) > td:nth-child(2) > div:nth-child(1)');
            organizationDropdown.click();

            var organizationOptions = document.querySelectorAll('.commonForm2 .commonForm2 > tbody > tr:nth-child(5) > td:nth-child(2) > div:nth-child(4) table tr');
            for (var i = 0; i < organizationOptions.length; i++) {
                if (organizationOptions[i].innerText.includes('INLAND REVENUE DEPARTMENT')) {
                    organizationOptions[i].click();
                    break;
                }
            }
        `});
        await delay(1000);
        await this.executeScript({ code: `
            var billAccountNoInput = document.querySelector('#contentBox-middle > .commonForm2 > tbody > tr:nth-child(2) input');
            billAccountNoInput.value = '${taxAccountNumber}';

            var billTypeDropDown = document.querySelector('#contentBox-middle > .commonForm2 > tbody > tr:nth-child(3) > td:nth-child(2) div:nth-child(1)');
            billTypeDropDown.click();

            var billTypeOptions = document.querySelectorAll('#contentBox-middle > .commonForm2 > tbody > tr:nth-child(3) > td:nth-child(2) div:nth-child(1) table tr');
            for (var i = 0; i < billTypeOptions.length; i++) {
                if (billTypeOptions[i].innerText.includes('01 TAX DEMAND NOTE')) {
                    billTypeOptions[i].click();
                    break;
                }
            }
        `});
    }

    async fillAmountAndSelectAccount(payAmount, payAccount, amountRowOffset) {
        await this.executeScript({ code: `
            var amountInput = document.querySelector('#contentBox-middle > .commonForm2 > tbody > tr:nth-child(${3 + amountRowOffset}) input');
            amountInput.value = '${payAmount}';

            var accountDropdown = document.querySelector('#contentBox-middle > .commonForm2 > tbody > tr:nth-child(${4 + amountRowOffset}) div.ui-dropDown-btn');
            accountDropdown.click();

            var accountOptions = document.querySelectorAll('#contentBox-middle > .commonForm2 > tbody > tr:nth-child(${4 + amountRowOffset}) div.boxOpened td');
            for (var i = 0; i < accountOptions.length; i++) {
                if (accountOptions[i].innerText.includes('${payAccount}')) {
                    accountOptions[i].click();
                    break;
                }
            }
        `});
    }
    
    async proceedPayment() {
        await this.executeScript({ code: `
            var continueButton = document.querySelector('a#okBtn');
            continueButton.click();
        `});
    }

    async confirmPayment() {
        await this.executeScript({ code: `
            var confirmButton = document.querySelector('a#confirmBtn');
            confirmButton.click();
        `});
    }

    async verifyPayment() {
        await this.executeScript({ code: `
            var paymentMessage = document.querySelector('#errorMessage span.blue');
            paymentMessage.innerText
        `});
    }

}