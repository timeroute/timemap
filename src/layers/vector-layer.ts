import { LAYERS } from "../constants";
import { fetchTile } from "../utils/map-util";

class VectorLayer {
  id: string;
  url: string;
  tileSize: number = 512;
  minZoom: number = 0;
  maxZoom: number = 22;
  worker: Worker;
  tiles: Record<string, TileDataProps[]> = {};

  constructor(id: string, props: VectorLayerProps) {
    this.id = id;
    this.url = props.url;
    if (props.tileSize !== undefined) {
      this.tileSize = props.tileSize;
    }
    if (props.minZoom >=0 && props.minZoom < 22) {
      this.minZoom = props.minZoom;
    }
    if (props.maxZoom > props.minZoom && props.maxZoom < 23) {
      this.maxZoom = props.maxZoom;
    }
    this.worker = new Worker(new URL('../workers/tile-worker.ts', import.meta.url));
    this.worker.onmessage = this.workerMsg;
    this.worker.onerror = this.workerErr;
  }

  get maxzoom() {
    return this.maxZoom;
  }

  updateTiles(tilesInView: string[], tilesToLoad: string[]) {
    tilesToLoad.forEach(async (tile) => {
      if (this.tiles[tile]) {
        return;
      }
      this.tiles[tile] = [];
      try {
        if (tilesInView.includes(tile)) {
          const tileData = await fetchTile({ tile, layers: LAYERS, url: this.url});
          this.tiles[tile] = tileData;
        } else {
          this.worker.postMessage({ tile, layers: LAYERS, url: this.url });
        }
      } catch (err) {
        console.warn(`Error loading tile ${tile}`, err);
        this.tiles[tile] = undefined;
      }
    })
  }

  workerMsg = (event: MessageEvent) => {
    const {tile, tileData} = event.data;
    this.tiles[tile] = tileData;
  }

  workerErr = (error: ErrorEvent) => {
    console.error('Uncaught worker error.', error);
    
  }
}

export default VectorLayer;