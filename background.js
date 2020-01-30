const paymentDriver = new HangsengDriver();

const storageKeys = [
    'payBill',
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
        payBill: result.payBill || '',
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

chrome.runtime.onMessage.addListener(function(message, sender, callback) {
    if (message.type == "setParams") {
        storageSet(message.params)
            .then(() => {
                callback({ success: true });
                Object.assign(params, message.params);
            })
            .catch((error) => callback({ success: false, error }));
        return true;
    } else if (message.type == "start") {
        runPayLoop(message.payAmount, message.payCount)
            .then(() => callback({ success: true }))
            .catch((error) => callback({ success: false, error }));
        return true;
    } else if (message.type == "stop") {
        currentPayLoop.stopping = true;
        callback({ success: true });
    } else if (message.type == "queryStatus") {
        callback({
            success: true,
            params,
            currentPayLoop: currentPayLoop,
            totalPaid
        });
    } else if (message.type == "resetCounter") {
        resetCounter()
            .then(() => callback({ success: true }))
            .catch((error) => callback({ success: false, error }));
        return true;
    }
});

async function runPayLoop(payAmount, payCount) {
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
            "payCount": payCount,
            "paymentMade": currentPayLoop.paymentMade,
            "totalPaid": totalPaid
        });

        for (var i = 0; i < payCount; i++) {
            if (i > 0) {
                await delay(2000);
            }

            if (currentPayLoop.stopping) {
                break;
            }

            await paymentDriver.pay({
                payBill: params.payBill,
                payAccount: params.payAccount,
                payAmount: params.payAmount
            });
            
            currentPayLoop.paymentMade++;
            
            totalPaid += payAmount;
            chrome.storage.sync.set({ totalPaid: totalPaid });

            chrome.runtime.sendMessage({
                "type": "update",
                "payCount": payCount,
                "paymentMade": currentPayLoop.paymentMade,
                "totalPaid": totalPaid
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

function resetCounter() {
    totalPaid = 0;
    return storageSet({ totalPaid: totalPaid });
}