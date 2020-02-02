const paymentDriver = new HangsengDriver();

const storageKeys = [
    'billType',
    'payeeName',
    'taxAccountNumber',
    'payAccount',
    'payAmount',
    'payCount',
    'totalPaid'
];

var params;
var currentPayLoop;
var totalPaid = 0;

chrome.storage.sync.get(storageKeys, function(result) {
    params = {
        billType: result.billType || 'REGISTERED_PAYEE',
        payeeName: result.payeeName || '',
        taxAccountNumber: result.taxAccountNumber || '',
        payAccount: result.payAccount || '',
        payAmount: result.payAmount || 5,
        payCount: result.payCount || 1  
    };
    totalPaid = parseFloat(result.totalPaid || '0');
});

function delay(timeMs) {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(), timeMs);
    });
}

function storageSet(config) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set(config, () => {
            resolve();
        });
    });
}

function getActiveTab() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
            resolve(tabs[0]);
        });
    });
}

async function setParams(newParams) {
    Object.assign(params, newParams);
    await storageSet(params);
}

async function start({payAmount, payCount}) {
    currentPayLoop = {
        stopping: false,
        stopped: false,
        payCount,
        paymentMade: 0,
        errorMessage: null
    };
    chrome.browserAction.setIcon({path:"icon-active.png"});

    try {
        chrome.runtime.sendMessage({
            "type": "update",
            "paymentMade": currentPayLoop.paymentMade,
        });

        const activeTab = await this.getActiveTab();
        paymentDriver.setTabId(activeTab.id);

        for (var i = 0; i < payCount; i++) {
            if (i > 0) {
                await delay(2000);
            }

            if (currentPayLoop.stopping) {
                break;
            }

            await paymentDriver.pay({
                billType: params.billType,
                payeeName: params.payeeName,
                taxAccountNumber: params.taxAccountNumber,
                payAccount: params.payAccount,
                payAmount: params.payAmount
            });
            
            currentPayLoop.paymentMade++;
            
            totalPaid += payAmount;
            chrome.storage.sync.set({ totalPaid: totalPaid });

            chrome.runtime.sendMessage({
                "type": "update",
                "paymentMade": currentPayLoop.paymentMade,
            });
        }

        currentPayLoop.stopped = true;
        currentPayLoop.stopping = false;
        chrome.runtime.sendMessage({ "type": "completed" });
        chrome.browserAction.setIcon({path:"icon-idle.png"});
    } catch (error) {
        console.log("Failed in payment", error);
        currentPayLoop.stopped = true;
        currentPayLoop.stopping = false;
        currentPayLoop.errorMessage = error.message;
        chrome.runtime.sendMessage({ "type": "failed", "errorMessage": error.message });
        chrome.browserAction.setIcon({path:"icon-idle.png"});
        throw error;
    }
}

function stop() {
    currentPayLoop.stopping = true;
}

function queryStatus() {
    return({
        success: true,
        params,
        currentPayLoop: currentPayLoop,
        totalPaid
    });
}

async function resetCounter() {
    totalPaid = 0;
    await storageSet({ totalPaid: totalPaid });
}