// 12 preset gradient + emoji avatars. We can't change a user's external photo,
// so identity is expressed through these presets.
export const AVATAR_PRESETS = [
  { id: 'sunset',  emoji: '🌅', gradient: 'linear-gradient(135deg,#FF8A3D,#FF5E62)' },
  { id: 'mint',    emoji: '🌿', gradient: 'linear-gradient(135deg,#2BC8A0,#0E8F5A)' },
  { id: 'berry',   emoji: '🫐', gradient: 'linear-gradient(135deg,#7B5BFF,#4E32C9)' },
  { id: 'peach',   emoji: '🍑', gradient: 'linear-gradient(135deg,#FFB199,#FF7A8A)' },
  { id: 'ocean',   emoji: '🌊', gradient: 'linear-gradient(135deg,#43C6FF,#2A6FF0)' },
  { id: 'lemon',   emoji: '🍋', gradient: 'linear-gradient(135deg,#FFE259,#FFA751)' },
  { id: 'rose',    emoji: '🌹', gradient: 'linear-gradient(135deg,#FF6FA5,#E83E8C)' },
  { id: 'forest',  emoji: '🌲', gradient: 'linear-gradient(135deg,#5FCB6B,#2E8B57)' },
  { id: 'grape',   emoji: '🍇', gradient: 'linear-gradient(135deg,#A66CFF,#6A2CC9)' },
  { id: 'coffee',  emoji: '☕', gradient: 'linear-gradient(135deg,#C99B6E,#8B5E34)' },
  { id: 'fire',    emoji: '🔥', gradient: 'linear-gradient(135deg,#FF7A18,#E52D27)' },
  { id: 'sky',     emoji: '⭐', gradient: 'linear-gradient(135deg,#6DD5FA,#2980B9)' },
];

export function getAvatar(presetId) {
  return AVATAR_PRESETS.find((a) => a.id === presetId) ?? null;
}
