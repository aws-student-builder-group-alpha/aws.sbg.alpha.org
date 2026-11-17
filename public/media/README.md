# Hero video

Source: user-provided `AWS SCD VIDEO_2.mp4` (1920×1080, 154.43 seconds).

The web copies use the first 99 seconds, excluding the closing title and 44-second black tail. A centered `1424:1064:248:8` crop removes the encoded side bars and narrow dark frame. The original file remains untouched.

- Desktop: H.264, 1280 pixels wide, 24 fps, CRF 27, no audio.
- Mobile: H.264, 720 pixels wide, 24 fps, CRF 29, no audio.
- Both use MP4 fast-start metadata and fill the hero with `object-fit: cover`.
- The poster uses the same crop at eight seconds.

Playback pauses outside the hero, when the tab is hidden, or with the pause control. Reduced motion uses the poster without loading the video.
