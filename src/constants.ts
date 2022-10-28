export const TILE_SIZE = 256;
export const MIN_ZOOM = 0;
export const MAX_ZOOM = 22;
export const LAYERS: Record<string, number[]> = {
  water: [180, 240, 250, 255],
  landcover: [202, 246, 193, 255],
  park: [202, 255, 193, 255],
  building: [185, 175, 139, 191],
};

export const TILE_BUFFER = 1; 