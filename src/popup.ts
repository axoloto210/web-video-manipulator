const getCurrentSiteKey = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    console.error('Invalid URL:', error);
    return null;
  }
};

const updateUI = (hostname: string | null, isEnabled: boolean): void => {
  const currentSiteElement = document.getElementById('current-site');
  const toggleCheckbox = document.getElementById('toggle-checkbox') as HTMLInputElement;
  const statusElement = document.getElementById('status');
  
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
};

const toggleSiteStatus = async (hostname: string): Promise<boolean> => {
  try {
    const result = await chrome.storage.local.get([hostname]);
    const currentStatus = result[hostname] || false;
    const newStatus = !currentStatus;
    
    await chrome.storage.local.set({ [hostname]: newStatus });
    
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
    
    // Get current status for this site
    const result = await chrome.storage.local.get([hostname]);
    const isEnabled = result[hostname] || false;
    
    updateUI(hostname, isEnabled);
    
    // Set up toggle checkbox change handler
    const toggleCheckbox = document.getElementById('toggle-checkbox') as HTMLInputElement;
    if (toggleCheckbox) {
      toggleCheckbox.addEventListener('change', async () => {
        const newStatus = await toggleSiteStatus(hostname);
        updateUI(hostname, newStatus);
      });
    }
    
  } catch (error) {
    console.error('Error initializing popup:', error);
    updateUI('Error', false);
  }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePopup);