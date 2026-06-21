// src/utils/video.js
export const MAX_VIDEO_SECONDS = 90
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024 // 25MB hard ceiling regardless of duration

// Reads a video file's actual duration in the browser before upload, so a
// 90-second cap is enforced even for files picked from the gallery (not just
// ones recorded in-app, where we can stop the recorder ourselves).
export function validateVideoFile(file) {
  return new Promise((resolve) => {
    if (file.size > MAX_VIDEO_BYTES) {
      resolve({ valid: false, error: `Video is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Keep it under ${MAX_VIDEO_BYTES / 1024 / 1024}MB.` })
      return
    }
    const videoEl = document.createElement('video')
    videoEl.preload = 'metadata'
    const url = URL.createObjectURL(file)
    videoEl.src = url
    videoEl.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      if (videoEl.duration > MAX_VIDEO_SECONDS) {
        resolve({ valid: false, error: `Video is ${Math.round(videoEl.duration)}s — please trim it to ${MAX_VIDEO_SECONDS} seconds or less.`, duration: videoEl.duration })
      } else {
        resolve({ valid: true, duration: videoEl.duration })
      }
    }
    videoEl.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({ valid: false, error: 'Could not read this video file. Try a different format (MP4 or WebM work best).' })
    }
  })
}
