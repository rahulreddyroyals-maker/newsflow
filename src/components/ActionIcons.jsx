// src/components/ActionIcons.jsx
// Shared, modern outlined-SVG icon set for the like/dislike/comment/save/share
// action bar — replaces the earlier emoji placeholders (👍👎💬☆↗) with a
// consistent visual language matching the rest of the app's icon style.
export const ThumbsUpIcon = ({ active, ...p }) => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} {...p}>
    <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3Zm0 0 4.5-7.2a1.5 1.5 0 0 1 2.7.7L13.5 9H19a2 2 0 0 1 1.94 2.49l-1.5 6A2 2 0 0 1 17.5 19H10a3 3 0 0 1-3-3v-5Z"
      stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
)

export const ThumbsDownIcon = ({ active, ...p }) => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} {...p}>
    <path d="M17 13V4h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3Zm0 0-4.5 7.2a1.5 1.5 0 0 1-2.7-.7L10.5 15H5a2 2 0 0 1-1.94-2.49l1.5-6A2 2 0 0 1 6.5 5H14a3 3 0 0 1 3 3v5Z"
      stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
)

export const CommentIcon = (p) => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8Z"
      stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
)

export const SaveIcon = ({ active, ...p }) => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} {...p}>
    <path d="M6 4h12v17l-6-4-6 4V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
)

// WhatsApp glyph — the dominant share channel for this audience, so the
// share action uses its recognizable speech-bubble-with-handset mark rather
// than a generic share/arrow icon.
export const WhatsAppIcon = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.77.46 3.45 1.27 4.93L2 22l5.31-1.39a9.86 9.86 0 0 0 4.73 1.2h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.84 14.04c-.25.7-1.25 1.29-2.04 1.46-.55.12-1.26.21-3.66-.78-3.07-1.27-5.04-4.38-5.2-4.58-.15-.2-1.24-1.65-1.24-3.15 0-1.5.78-2.23 1.07-2.53.25-.27.62-.39.95-.39h.27c.24 0 .37 0 .53.4.2.5.68 1.7.74 1.83.06.13.1.28.02.45-.08.17-.12.27-.24.41-.13.15-.27.34-.38.46-.13.13-.26.27-.11.53.15.27.66 1.09 1.42 1.77 1 .89 1.85 1.16 2.12 1.29.21.1.42.07.58-.09.2-.2.45-.53.7-.85.18-.23.4-.26.66-.16.27.1 1.69.8 1.98.94.29.15.48.22.55.34.07.13.07.73-.18 1.43Z" />
  </svg>
)
