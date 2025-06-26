chrome.runtime.onInstalled.addListener(() => {
  console.log('Gmail Calendar Options installed');
  chrome.storage.sync.set({ gmailCalMode: 'ALL' });  
});
