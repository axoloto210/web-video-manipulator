const REWIND_SECOND = 5;
const FORWARD_SECOND = 5;

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
    if (video.currentTime >= REWIND_SECOND) {
      video.currentTime -= REWIND_SECOND;
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
    if (video.currentTime + FORWARD_SECOND <= video.duration) {
      video.currentTime += FORWARD_SECOND;
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

function initializeExtension(): void {
  console.log('Video Control Extension loaded');
  document.addEventListener('keydown', handleKeyPress, true);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}