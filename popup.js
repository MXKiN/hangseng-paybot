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

    const paymentDriver = new HangsengDriver();

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
                
                await paymentDriver.pay();

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
