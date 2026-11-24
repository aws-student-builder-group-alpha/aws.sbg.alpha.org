# Hero video

Source: user-provided `AWS SCD VIDEO_2.mp4` (1920×1080, 154.43 seconds).

The web copies use the first 99 seconds, excluding the closing title and 44-second black tail. A centered `1424:1064:248:8` crop removes the encoded side bars and narrow dark frame. The original file remains untouched.

- Desktop uses H.264 at 1280 pixels wide and 24 fps, with CRF 29, a 1250 kbps bitrate cap and the fast preset.
- Mobile uses H.264 at 720 pixels wide and 24 fps, with CRF 31, a 470 kbps bitrate cap and the slow preset.
- Both copies omit audio.
- Both use MP4 fast-start metadata and fill the hero with `object-fit: cover`.
- The WebP poster uses the same crop at eight seconds.

The browser starts loading the video when the hero is visible in the active tab. Playback pauses when the hero leaves the viewport or the tab is hidden. Reduced motion shows the poster alone.
