const DEFAULT_REWIND_SECONDS = 5;
const DEFAULT_FORWARD_SECONDS = 5;

let isExtensionEnabled = false;
let rewindSeconds = DEFAULT_REWIND_SECONDS;
let forwardSeconds = DEFAULT_FORWARD_SECONDS;

function findVideoElement(): HTMLVideoElement | null {
  const videos = document.querySelectorAll<HTMLVideoElement>('video');
  if (videos.length === 0) return null;
  
  for (const video of videos) {
    if (video.duration > 0 && !video.paused) {
      return video;
    }
  }
  
  return videos[0] || null;
}

function rewindVideo(video: HTMLVideoElement): boolean {
  try {
    if (video.currentTime >= rewindSeconds) {
      video.currentTime -= rewindSeconds;
    } else {
      video.currentTime = 0;
    }
    return true;
  } catch (error) {
    console.error('Failed to rewind video:', error);
    return false;
  }
}

function forwardVideo(video: HTMLVideoElement): boolean {
  try {
    if (video.currentTime + forwardSeconds <= video.duration) {
      video.currentTime += forwardSeconds;
    } else {
      video.currentTime = video.duration;
    }
    return true;
  } catch (error) {
    console.error('Failed to forward video:', error);
    return false;
  }
}

function isInputElement(element: Element | null): boolean {
  if (!element) return false;
  
  const tagName = element.tagName.toLowerCase();
  const isContentEditable = (element as HTMLElement).contentEditable === 'true';
  
  return tagName === 'input' || tagName === 'textarea' || isContentEditable;
}

function handleKeyPress(event: KeyboardEvent): void {
  if (!isExtensionEnabled) {
    return;
  }
  
  if (isInputElement(document.activeElement)) {
    return;
  }
  
  const video = findVideoElement();
  if (!video) return;

  if (event.key === 'ArrowLeft') {
    if (rewindVideo(video)) {
      event.preventDefault();
    }
  } else if (event.key === 'ArrowRight') {
    if (forwardVideo(video)) {
      event.preventDefault();
    }
  }
}

const getStorageKeyForContent = (hostname: string, type: 'enabled' | 'rewind' | 'forward'): string => {
  return `${hostname}_${type}`;
};

async function checkSiteStatus(): Promise<void> {
  try {
    const hostname = window.location.hostname;
    const enabledKey = getStorageKeyForContent(hostname, 'enabled');
    const rewindKey = getStorageKeyForContent(hostname, 'rewind');
    const forwardKey = getStorageKeyForContent(hostname, 'forward');
    
    const result = await chrome.storage.local.get([enabledKey, rewindKey, forwardKey]);
    isExtensionEnabled = result[enabledKey] || false;
    rewindSeconds = result[rewindKey] || DEFAULT_REWIND_SECONDS;
    forwardSeconds = result[forwardKey] || DEFAULT_FORWARD_SECONDS;
    
    console.log(`Video Control Extension: ${isExtensionEnabled ? 'enabled' : 'disabled'} for ${hostname} (rewind: ${rewindSeconds}s, forward: ${forwardSeconds}s)`);
  } catch (error) {
    console.error('Error checking site status:', error);
    isExtensionEnabled = false;
    rewindSeconds = DEFAULT_REWIND_SECONDS;
    forwardSeconds = DEFAULT_FORWARD_SECONDS;
  }
}

function initializeExtension(): void {
  console.log('Video Control Extension loaded');
  document.addEventListener('keydown', handleKeyPress, true);
  checkSiteStatus();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'toggleExtension') {
    isExtensionEnabled = message.enabled;
    console.log(`Video Control Extension: ${isExtensionEnabled ? 'enabled' : 'disabled'}`);
  } else if (message.action === 'updateSettings') {
    rewindSeconds = message.rewindSeconds || DEFAULT_REWIND_SECONDS;
    forwardSeconds = message.forwardSeconds || DEFAULT_FORWARD_SECONDS;
    console.log(`Video Control Extension settings updated: rewind ${rewindSeconds}s, forward ${forwardSeconds}s`);
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}