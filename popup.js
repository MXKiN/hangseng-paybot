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

    function updateUi() {
        const result = chrome.extension.getBackgroundPage().queryStatus();
        payBillInput.value = result.params.payBill;
        payAccountInput.value = result.params.payAccount;
        payAmountInput.value = result.params.payAmount;
        payCountInput.value = result.params.payCount;
        if (result.currentPayLoop && !result.currentPayLoop.stopped) {
            payBillInput.disabled = true;
            payAccountInput.disabled = true;
            payAmountInput.disabled = true;
            payCountInput.disabled = true;
            startButton.disabled = true;
        } else {
            payBillInput.disabled = false;
            payAccountInput.disabled = false;
            payAmountInput.disabled = false;
            payCountInput.disabled = false;
            startButton.disabled = false;
        }
        stopButton.disabled = !result.currentPayLoop || (result.currentPayLoop.stopping || result.currentPayLoop.stopped);
        payProgress.max = result.currentPayLoop ? result.currentPayLoop.payCount : 0;
        payProgress.value = result.currentPayLoop ? result.currentPayLoop.paymentMade : 0;
        if (result.currentPayLoop && result.currentPayLoop.errorMessage) {
            errorText.innerText = result.currentPayLoop.errorMessage;
            errorText.style.display = '';
        } else {
            errorText.innerText = '';
            errorText.style.display = 'none';
        }
        totalPaidInput.value = result.totalPaid.toFixed(2);
    }

    updateUi();

    chrome.runtime.onMessage.addListener(function(message, sender, callback) {
        if (message.type == "update" || message.type == "completed" || message.type == "failed") {
            updateUi();
        }
    });

    payBillInput.addEventListener('change', (event) => {
        chrome.extension.getBackgroundPage().setParams({payBill: event.target.value});
    })
    payAccountInput.addEventListener('change', (event) => {
        chrome.extension.getBackgroundPage().setParams({payAccount: event.target.value});
    })
    payAmountInput.addEventListener('change', (event) => {
        chrome.extension.getBackgroundPage().setParams({payAmount: event.target.value});
    })
    payCountInput.addEventListener('change', (event) => {
        chrome.extension.getBackgroundPage().setParams({payCount: event.target.value});
    })

    startButton.addEventListener('click', async function() {
        event.preventDefault();

        const payAmount = parseFloat(payAmountInput.value);
        const payCount = parseInt(payCountInput.value);
        chrome.extension.getBackgroundPage().start({payAmount, payCount})
    });

    stopButton.addEventListener('click', async function() {
        event.preventDefault();

        chrome.extension.getBackgroundPage().stop();
        updateUi();
    });

    resetButton.addEventListener('click', function() {
        event.preventDefault();

        chrome.extension.getBackgroundPage().resetCounter();
        updateUi();
    });

});
