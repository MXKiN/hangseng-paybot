class HangsengDriver {
    
    async pay() {
        await this.gotoPaymentService();
        await this.delay(500);
        await this.gotoBillPaymentService();
        await this.delay(500);
        await this.gotoBillPaymentForm();
        await this.delay(1000);
        await this.selectBill();
        await this.delay(1000);
        await this.fillAmountAndSelectAccount();
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
            chrome.tabs.executeScript(detail, (result) => {
                resolve(result);
            });
        });
    }

    async gotoPaymentService() {
        const navClass = await this.executeScript({ code: `
            var paymentServiceNav = document.querySelector('#serviceNavItem-2');
            if (paymentServiceNav.className.includes("off")) {
                var paymentServiceNavLink = document.querySelector('#serviceNavItem-2 > a');
                paymentServiceNavLink.click();
            }
            paymentServiceNav.className
        `});
        if (navClass.includes("off")) {
            throw new Error("Failed to verify payment service selected");
        }
    }

    async gotoBillPaymentService() {
        const navClass = await this.executeScript({ code: `
            var billPaymentNav = document.querySelector('#serviceNavItem-2-2');
            if (billPaymentNav.className.includes("off")) {
                var billPaymentNavLink = document.querySelector('#serviceNavItem-2-2 a');
                billPaymentNavLink.click();
            }
            billPaymentNav.className
        `});
        if (navClass.includes("off")) {
            throw new Error("Failed to verify bill payment service selected");
        }
    }

    async gotoBillPaymentForm() {
        const navClass = await this.executeScript({ code: `
            var paymentFormNav = document.querySelector('#serviceNavItem-2-2-1');
            if (paymentFormNav.className.includes("off")) {
                var paymentFormNavLink = document.querySelector('#serviceNavItem-2-2-1 a');
                paymentFormNavLink.click();
            }
            paymentFormNav.className
        `});
        if (navClass.includes("off")) {
            throw new Error("Failed to verify bill payment form selected");
        }
    }

    async selectBill() {
        const numReselectLinks = await this.executeScript({ code: `
            var billDropdowns = document.querySelectorAll('.commonForm2 .commonForm2 > tbody > tr:nth-child(2) > td:nth-child(2) > div.ui-dropDown-btn');
            if (billDropdowns.length > 0 && billDropdowns[0].innerText.includes('Please Select')) {
                billDropdowns[0].click();
                
                var billOptions = document.querySelectorAll('.commonForm2 .commonForm2 > tbody > tr:nth-child(2) > td:nth-child(2) > div.boxOpened td');
                for (var i = 0; i < billOptions.length; i++) {
                    if (billOptions[i].innerText.includes('${payBillInput.value}')) {
                        billOptions[i].click();
                        break;
                    }
                }
            }
        `});
    }

    async fillAmountAndSelectAccount() {
        return await this.executeScript({ code: `
            var amountInput = document.querySelector('.commonForm2 > tbody > tr:nth-child(3) input');
            amountInput.value = '${payAmountInput.value}';

            var accountDropdown = document.querySelector('.commonForm2 > tbody > tr:nth-child(4) div.ui-dropDown-btn');
            accountDropdown.click();

            var accountOptions = document.querySelectorAll('.commonForm2 > tbody > tr:nth-child(4) div.boxOpened td')
            for (var i = 0; i < accountOptions.length; i++) {
                if (accountOptions[i].innerText.includes('${payAccountInput.value}')) {
                    accountOptions[i].click();
                    break;
                }
            }

            var continueButton = document.querySelector('a#okBtn');
            continueButton.click();
        `});
    }

    async confirmPayment() {
        return await this.executeScript({ code: `
            var confirmButton = document.querySelector('a#confirmBtn');
            confirmButton.click();
        `});
    }

    async verifyPayment() {
        return await this.executeScript({ code: `
            var paymentMessage = document.querySelector('#errorMessage span.blue');
            paymentMessage.innerText
        `});
    }

}