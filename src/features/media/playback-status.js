// Native media state only; never a platform view counter.
export function describePlayback(video, event = "") {
  if (video.error || event === "error") return {label:"Playback error",hint:"The source or format may be unavailable"};
  if (video.ended) return {label:"Playback ended",hint:"Local playback only · not a platform view count"};
  if (video.seeking) return {label:"Seeking",hint:"Waiting for the selected position"};
  if (video.readyState === 0) return {label:"Loading video",hint:"Waiting for media data"};
  if (video.paused) return {label:"Paused",hint:"Press play to continue"};
  if (video.readyState < 3 || event === "waiting") return {label:"Buffering",hint:"Waiting for playable media"};
  if (event === "playing") {
    return {label:"Playing locally",hint:"Local playback only · not a platform view count"};
  }
  return {label:"Starting playback",hint:"Waiting for playback confirmation"};
}
