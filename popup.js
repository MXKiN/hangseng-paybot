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

    chrome.runtime.sendMessage({ type: "queryStatus" }, (result) => {
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

        payBillInput.addEventListener('change', (event) => {
            chrome.runtime.sendMessage({ type: "setParams", params: {payBill: event.target.value} }, () => {});
        })
        payAccountInput.addEventListener('change', (event) => {
            chrome.runtime.sendMessage({ type: "setParams", params: {payAccount: event.target.value} }, () => {});
        })
        payAmountInput.addEventListener('change', (event) => {
            chrome.runtime.sendMessage({ type: "setParams", params: {payAmount: event.target.value} }, () => {});
        })
        payCountInput.addEventListener('change', (event) => {
            chrome.runtime.sendMessage({ type: "setParams", params: {payCount: event.target.value} }, () => {});
        })
    });

    chrome.runtime.onMessage.addListener(function(message, sender, callback) {
        if (message.type == "update") {
            payProgress.max = message.payCount;
            payProgress.value = message.paymentMade;
            totalPaidInput.value = message.totalPaid.toFixed(2);
        } else if (message.type == "completed" || message.type == "failed") {
            payBillInput.disabled = false;
            payAccountInput.disabled = false;
            payAmountInput.disabled = false;
            payCountInput.disabled = false;
            startButton.disabled = false;
            stopButton.disabled = true;

            if (message.type == "failed") {
                errorText.innerText = message.errorMessage;
                errorText.style.display = '';
            }
        }
    });

    startButton.addEventListener('click', async function() {
        event.preventDefault();

        const payAmount = parseFloat(payAmountInput.value);
        const payCount = parseInt(payCountInput.value);

        payBillInput.disabled = true;
        payAccountInput.disabled = true;
        payAmountInput.disabled = true;
        payCountInput.disabled = true;
        startButton.disabled = true;
        stopButton.disabled = false;
        errorText.innerText = '';
        errorText.style.display = 'none';

        chrome.runtime.sendMessage({ type: "start", payAmount, payCount }, () => {});
    });

    stopButton.addEventListener('click', async function() {
        event.preventDefault();

        stopButton.disabled = true;

        chrome.runtime.sendMessage({ type: "stop" }, () => {});
    });

    resetButton.addEventListener('click', function() {
        event.preventDefault();

        chrome.runtime.sendMessage({ type: "resetCounter" }, (result) => {
            if (result.success) {
                totalPaidInput.value = "0.00";
            }
        });
    });

});
