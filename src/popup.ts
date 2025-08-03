const DEFAULT_REWIND_SECONDS_POPUP = 5;
const DEFAULT_FORWARD_SECONDS_POPUP = 5;

const getCurrentSiteKey = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    console.error('Invalid URL:', error);
    return null;
  }
};

const updateUI = (hostname: string | null, isEnabled: boolean, rewindSeconds: number = DEFAULT_REWIND_SECONDS_POPUP, forwardSeconds: number = DEFAULT_FORWARD_SECONDS_POPUP): void => {
  const currentSiteElement = document.getElementById('current-site');
  const toggleCheckbox = document.getElementById('toggle-checkbox') as HTMLInputElement;
  const statusElement = document.getElementById('status');
  const rewindInput = document.getElementById('rewind-seconds') as HTMLInputElement;
  const forwardInput = document.getElementById('forward-seconds') as HTMLInputElement;
  
  if (currentSiteElement) currentSiteElement.textContent = hostname || 'Unknown';
  
  if (toggleCheckbox && statusElement) {
    toggleCheckbox.checked = isEnabled;
    
    if (isEnabled) {
      statusElement.textContent = 'Enabled';
      statusElement.style.color = '#4CAF50';
    } else {
      statusElement.textContent = 'Disabled';
      statusElement.style.color = '#666';
    }
  }
  
  if (rewindInput) rewindInput.value = rewindSeconds.toString();
  if (forwardInput) forwardInput.value = forwardSeconds.toString();
};

const getStorageKey = (hostname: string, type: 'enabled' | 'rewind' | 'forward'): string => {
  return `${hostname}_${type}`;
};

const toggleSiteStatus = async (hostname: string): Promise<boolean> => {
  try {
    const enabledKey = getStorageKey(hostname, 'enabled');
    const result = await chrome.storage.local.get([enabledKey]);
    const currentStatus = result[enabledKey] || false;
    const newStatus = !currentStatus;
    
    await chrome.storage.local.set({ [enabledKey]: newStatus });
    
    // Notify content script about the change
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { 
        action: 'toggleExtension', 
        enabled: newStatus 
      }).catch(() => {
        // Content script might not be ready, that's okay
      });
    }
    
    return newStatus;
  } catch (error) {
    console.error('Error toggling site status:', error);
    return false;
  }
};

const saveSecondsSettings = async (hostname: string, rewindSeconds: number, forwardSeconds: number): Promise<void> => {
  try {
    const rewindKey = getStorageKey(hostname, 'rewind');
    const forwardKey = getStorageKey(hostname, 'forward');
    
    await chrome.storage.local.set({ 
      [rewindKey]: rewindSeconds,
      [forwardKey]: forwardSeconds
    });
    
    // Notify content script about the change
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { 
        action: 'updateSettings', 
        rewindSeconds,
        forwardSeconds
      }).catch(() => {
        // Content script might not be ready, that's okay
      });
    }
  } catch (error) {
    console.error('Error saving seconds settings:', error);
  }
};

const initializePopup = async (): Promise<void> => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url) {
      updateUI('Unknown', false);
      return;
    }
    
    const hostname = getCurrentSiteKey(tab.url);
    if (!hostname) {
      updateUI('Unknown', false);
      return;
    }
    
    // Get current status and settings for this site
    const enabledKey = getStorageKey(hostname, 'enabled');
    const rewindKey = getStorageKey(hostname, 'rewind');
    const forwardKey = getStorageKey(hostname, 'forward');
    
    const result = await chrome.storage.local.get([enabledKey, rewindKey, forwardKey]);
    const isEnabled = result[enabledKey] || false;
    const rewindSeconds = result[rewindKey] || DEFAULT_REWIND_SECONDS_POPUP;
    const forwardSeconds = result[forwardKey] || DEFAULT_FORWARD_SECONDS_POPUP;
    
    updateUI(hostname, isEnabled, rewindSeconds, forwardSeconds);
    
    // Set up toggle checkbox change handler
    const toggleCheckbox = document.getElementById('toggle-checkbox') as HTMLInputElement;
    if (toggleCheckbox) {
      toggleCheckbox.addEventListener('change', async () => {
        const newStatus = await toggleSiteStatus(hostname);
        updateUI(hostname, newStatus, rewindSeconds, forwardSeconds);
      });
    }
    
    // Set up seconds input change handlers
    const rewindInput = document.getElementById('rewind-seconds') as HTMLInputElement;
    const forwardInput = document.getElementById('forward-seconds') as HTMLInputElement;
    
    const saveSettings = async () => {
      const rewindValue = Math.max(1, Math.min(60, parseInt(rewindInput.value) || DEFAULT_REWIND_SECONDS_POPUP));
      const forwardValue = Math.max(1, Math.min(60, parseInt(forwardInput.value) || DEFAULT_FORWARD_SECONDS_POPUP));
      
      rewindInput.value = rewindValue.toString();
      forwardInput.value = forwardValue.toString();
      
      await saveSecondsSettings(hostname, rewindValue, forwardValue);
    };
    
    if (rewindInput) {
      rewindInput.addEventListener('change', saveSettings);
      rewindInput.addEventListener('blur', saveSettings);
    }
    
    if (forwardInput) {
      forwardInput.addEventListener('change', saveSettings);
      forwardInput.addEventListener('blur', saveSettings);
    }
    
  } catch (error) {
    console.error('Error initializing popup:', error);
    updateUI('Error', false);
  }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePopup);