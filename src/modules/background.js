import { stateManager } from './stateManager.js';
import { configurationManager } from './configurationManager.js';

chrome.runtime.onInstalled.addListener(async () => {
  console.log('Gmail Calendar Options installed');
  
  try {
    // Initialize both StateManager and ConfigurationManager
    await Promise.all([
      stateManager.initialize(),
      configurationManager.initialize()
    ]);
    
    // Ensure default state is set (StateManager handles this automatically)
    const currentMode = stateManager.get('filterMode');
    console.log('Extension initialized with filter mode:', currentMode);
    
    // Log configuration initialization
    const configVersion = configurationManager.getSystemConfig('defaults.configVersion');
    console.log('Configuration initialized with version:', configVersion);
  } catch (error) {
    console.error('Error initializing extension:', error);
    
    // Fallback to legacy storage method if initialization fails
    chrome.storage.sync.set({ gmailCalMode: 'ALL' }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error setting fallback initial mode:', chrome.runtime.lastError);
      } else {
        console.log('Fallback initialization completed');
      }
    });
  }
});

// Listen for state changes across the extension
stateManager.subscribe('stateChanged', ({ path, value }) => {
  console.log(`[Background] State changed: ${path} = ${value}`);
});

// Listen for configuration changes
configurationManager.addChangeListener(({ path, oldValue, newValue }) => {
  console.log(`[Background] Configuration changed: ${path} = ${oldValue} → ${newValue}`);
});

// Handle extension startup
chrome.runtime.onStartup.addListener(async () => {
  try {
    await Promise.all([
      stateManager.initialize(),
      configurationManager.initialize()
    ]);
    console.log('Extension state and configuration restored on browser startup');
  } catch (error) {
    console.error('Error restoring state/configuration on startup:', error);
  }
});
