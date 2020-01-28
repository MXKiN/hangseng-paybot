document.addEventListener('DOMContentLoaded', function() {
    const payBillInput = document.getElementById('payBillInput');
    const payAccountInput = document.getElementById('payAccountInput');
    const payAmountInput = document.getElementById('payAmountInput');
    const payCountInput = document.getElementById('payCountInput');
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const payProgress = document.getElementById('payProgress');
    const errorText = document.getElementById('errorText');
    const totalPaidInput = document.getElementById('totalPaidInput');
    const resetButton = document.getElementById('resetButton');

    const storageKeys = [
        'payBill',
        'payAccount',
        'payAmount',
        'payCount',
        'totalPaid'
    ];

    var totalPaid = 0;

    chrome.storage.sync.get(storageKeys, function(result) {
        payBillInput.value = result.payBill || '';
        payAccountInput.value = result.payAccount || '';
        payAmountInput.value = result.payAmount || '5';
        payCountInput.value = result.payCount || '1';
        totalPaid = parseFloat(result.totalPaid || '0');
        totalPaidInput.value = totalPaid.toFixed(2);

        payBillInput.addEventListener('change', (event) => chrome.storage.sync.set({ payBill: event.target.value }));
        payAccountInput.addEventListener('change', (event) => chrome.storage.sync.set({ payAccount: event.target.value }));
        payAmountInput.addEventListener('change', (event) => chrome.storage.sync.set({ payAmount: event.target.value }));
        payCountInput.addEventListener('change', (event) => chrome.storage.sync.set({ payCount: event.target.value }));
    });

    function delay(timeMs) {
        return new Promise((resolve, reject) => {
            setTimeout(() => resolve(), timeMs);
        });
    }

    function executeScript(detail) {
        return new Promise((resolve, reject) => {
            chrome.tabs.executeScript(detail, (result) => {
                resolve(result);
            });
        });
    }

    async function gotoPaymentService() {
        const navClass = await executeScript({ code: `
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

    async function gotoBillPaymentService() {
        const navClass = await executeScript({ code: `
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

    async function gotoBillPaymentForm() {
        const navClass = await executeScript({ code: `
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

    async function selectBill() {
        const numReselectLinks = await executeScript({ code: `
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

    async function fillAmountAndSelectAccount() {
        return await executeScript({ code: `
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

    async function confirmPayment() {
        return await executeScript({ code: `
            var confirmButton = document.querySelector('a#confirmBtn');
            confirmButton.click();
        `});
    }

    async function verifyPayment() {
        return await executeScript({ code: `
            var paymentMessage = document.querySelector('#errorMessage span.blue');
            paymentMessage.innerText
        `});
    }

    startButton.addEventListener('click', async function() {
        event.preventDefault();

        payBillInput.disabled = true;
        payAccountInput.disabled = true;
        payAmountInput.disabled = true;
        payCountInput.disabled = true;
        startButton.disabled = true;
        stopButton.disabled = false;

        errorText.innerText = '';
        errorText.style.display = 'none';
        try {
            const payAmount = parseFloat(payAmountInput.value);
            const payCount = parseInt(payCountInput.value);
            payProgress.max = payCount;
            payProgress.value = 0;
            for (var i = 0; i < payCount; i++) {
                if (i > 0) {
                    await delay(2000);
                }
                await gotoPaymentService();
                await delay(500);
                await gotoBillPaymentService();
                await delay(500);
                await gotoBillPaymentForm();
                await delay(1000);
                await selectBill();
                await delay(1000);
                await fillAmountAndSelectAccount();
                await delay(2000);
                await confirmPayment();
                await delay(5000);
                await verifyPayment();

                totalPaid += payAmount;
                totalPaidInput.value = totalPaid.toFixed(2);
                payProgress.value = i+1;
                chrome.storage.sync.set({ totalPaid: totalPaid });
            }
        } catch (error) {
            errorText.innerText = error;
            errorText.style.display = '';
        }

        payBillInput.disabled = false;
        payAccountInput.disabled = false;
        payAmountInput.disabled = false;
        payCountInput.disabled = false;
        startButton.disabled = false;
        stopButton.disabled = true;
    });

    resetButton.addEventListener('click', function() {
        event.preventDefault();
        totalPaid = 0;
        totalPaidInput.value = totalPaid.toFixed(2);
        chrome.storage.sync.set({ totalPaid: totalPaid });
    });

});
