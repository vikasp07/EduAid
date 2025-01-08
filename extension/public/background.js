// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "askExtension",
        title: "Generate Quiz with Selected Text",
        contexts: ["selection"]
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "askExtension" && info.selectionText) {
        try {
            await chrome.storage.local.set({ selectedText: info.selectionText });

            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["contentScript.js"]
            });

            await chrome.tabs.sendMessage(tab.id, { selectedText: info.selectionText });

            chrome.action.setPopup({ popup: "src/popup/popup.html" });

            chrome.action.setBadgeText({ text: "!" });
            chrome.action.setBadgeBackgroundColor({ color: "#FF005C" });

            setTimeout(() => {
                chrome.action.setBadgeText({ text: "" });
            }, 2000);
        } catch (error) {
            console.error("Error in context menu handler:", error);
        }
    }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "TEXT_SELECTED") {
        chrome.storage.local.set({ selectedText: request.text }, () => {
            sendResponse({ status: "success" });
        });
        return true;
    }
});

// Clear badge when popup is opened
chrome.action.onClicked.addListener(() => {
    chrome.action.setBadgeText({ text: "" });
});

// Log storage changes and ensure synchronization
chrome.storage.onChanged.addListener((changes, namespace) => {
    for (let [key, { newValue }] of Object.entries(changes)) {
        chrome.storage.local.set({ [key]: newValue }, () => {
            if (chrome.runtime.lastError) {
                console.error("Storage sync error:", chrome.runtime.lastError);
            }
        });
    }
});

// Handle extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
    const welcomeUrl = "https://example.com/welcome";
    if (details.reason === "install") {
        console.log("Extension installed");
        chrome.tabs.create({ url: welcomeUrl });
    } else if (details.reason === "update") {
        console.log("Extension updated");
        chrome.notifications.create({
            type: "basic",
            iconUrl: "icon.png",
            title: "Extension Updated",
            message: "Your extension has been updated with new features."
        });
    }
});

// Set default storage values on installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ quizHistory: [] }, () => {
        if (chrome.runtime.lastError) {
            console.error("Failed to set default storage values:", chrome.runtime.lastError);
        }
    });
});

// Cleanup unused storage data periodically
chrome.alarms.create("cleanupStorage", { delayInMinutes: 1, periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "cleanupStorage") {
        chrome.storage.local.get(null, (items) => {
            for (const key in items) {
                if (key.startsWith("temp_")) {
                    chrome.storage.local.remove(key, () => {
                        console.log(`Removed temp storage item: ${key}`);
                    });
                }
            }
        });
    }
});
