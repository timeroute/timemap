export function hexToRGB(color: string): [number, number, number] {
  if (!color.startsWith('#') || color.length !== 7) {
    throw new Error('hex color not illege');
  }
  const rgb = color.match(/.{1,2}/g);
  return [
    parseInt(rgb[0], 16) / 255,
    parseInt(rgb[1], 16) / 255,
    parseInt(rgb[2], 16) / 255,
  ]
}