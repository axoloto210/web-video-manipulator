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

// Input types that don't accept text; arrow keys on these (e.g. a player's seek bar)
// should still be handled by this extension.
const NON_TEXT_INPUT_TYPES = new Set(['range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'image', 'color', 'file']);

function isInputElement(element: Element | null): boolean {
  if (!element) return false;

  if ((element as HTMLElement).isContentEditable) return true;

  const tagName = element.tagName.toLowerCase();
  if (tagName === 'textarea' || tagName === 'select') return true;
  if (tagName === 'input') {
    return !NON_TEXT_INPUT_TYPES.has((element as HTMLInputElement).type);
  }
  return false;
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

  let handled = false;
  if (event.key === 'ArrowLeft') {
    handled = rewindVideo(video);
  } else if (event.key === 'ArrowRight') {
    handled = forwardVideo(video);
  }

  if (handled) {
    // Stop the page's own player shortcuts (e.g. Shaka Player) from also seeking,
    // since they may seek relative to a stale seek-bar value.
    event.preventDefault();
    event.stopImmediatePropagation();
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
  // Capture on window so this runs before any page-level keydown handlers.
  window.addEventListener('keydown', handleKeyPress, true);
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