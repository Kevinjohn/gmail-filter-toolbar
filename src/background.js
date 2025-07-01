chrome.runtime.onInstalled.addListener(() => {
  console.log('Gmail Calendar Options installed');
    chrome.storage.sync.set({ gmailCalMode: 'ALL' }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error setting initial mode:", chrome.runtime.lastError);
    }
  });  
});
