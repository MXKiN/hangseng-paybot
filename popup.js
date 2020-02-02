document.addEventListener('DOMContentLoaded', function() {

    const billTypeSelect = document.getElementById('billTypeSelect');
    const payeeNameDiv = document.getElementById('payeeNameDiv');
    const payeeNameInput = document.getElementById('payeeNameInput');
    const taxAccountNumberDiv = document.getElementById('taxAccountNumberDiv');
    const taxAccountNumberInput = document.getElementById('taxAccountNumberInput');
    const payAccountInput = document.getElementById('payAccountInput');
    const payAmountInput = document.getElementById('payAmountInput');
    const payCountInput = document.getElementById('payCountInput');
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const payProgress = document.getElementById('payProgress');
    const errorText = document.getElementById('errorText');
    const totalPaidInput = document.getElementById('totalPaidInput');
    const resetButton = document.getElementById('resetButton');

    chrome.runtime.getBackgroundPage(function(backgroundPage){

        function updateUi() {
            const result = backgroundPage.queryStatus();
            billTypeSelect.value = result.params.billType;
            payeeNameInput.value = result.params.payeeName;
            taxAccountNumberInput.value = result.params.taxAccountNumber;
            payAccountInput.value = result.params.payAccount;
            payAmountInput.value = result.params.payAmount;
            payCountInput.value = result.params.payCount;
            payeeNameDiv.style.display = billTypeSelect.value == 'REGISTERED_PAYEE' ? '' : 'none';
            taxAccountNumberDiv.style.display = billTypeSelect.value == 'TAX' ? '' : 'none';

            const runningPayLoop = result.currentPayLoop && !result.currentPayLoop.stopped;
            billTypeSelect.disabled = runningPayLoop;
            payeeNameInput.disabled = runningPayLoop;
            taxAccountNumberInput.disabled = runningPayLoop;
            payAccountInput.disabled = runningPayLoop;
            payAmountInput.disabled = runningPayLoop;
            payCountInput.disabled = runningPayLoop;
            startButton.disabled = runningPayLoop;
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

        billTypeSelect.addEventListener('change', (event) => {
            backgroundPage.setParams({billType: event.target.value});
            updateUi();
        });
        payeeNameInput.addEventListener('change', (event) => {
            backgroundPage.setParams({payeeName: event.target.value});
        });
        taxAccountNumberInput.addEventListener('change', (event) => {
            backgroundPage.setParams({taxAccountNumber: event.target.value});
        });
        payAccountInput.addEventListener('change', (event) => {
            backgroundPage.setParams({payAccount: event.target.value});
        });
        payAmountInput.addEventListener('change', (event) => {
            backgroundPage.setParams({payAmount: event.target.value});
        });
        payCountInput.addEventListener('change', (event) => {
            backgroundPage.setParams({payCount: event.target.value});
        });

        startButton.addEventListener('click', async function() {
            event.preventDefault();

            const payAmount = parseFloat(payAmountInput.value);
            const payCount = parseInt(payCountInput.value);
            backgroundPage.start({payAmount, payCount})
        });

        stopButton.addEventListener('click', async function() {
            event.preventDefault();

            backgroundPage.stop();
            updateUi();
        });

        resetButton.addEventListener('click', function() {
            event.preventDefault();

            backgroundPage.resetCounter();
            updateUi();
        });

    });
    
});