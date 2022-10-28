import tilebelt from "@mapbox/tilebelt";
import { fetchImageTile, fetchTile } from "../utils/map-util";
import MercatorCoordinate from "../utils/mercator-coordinate";

class ImageLayer {
  id: string;
  url: string;
  tileSize: number = 512;
  minZoom: number = 0;
  maxZoom: number = 22;
  worker: Worker;
  tiles: Record<string, ImageTileDataProps> = {};

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
    this.worker.addEventListener('message', this.workerMsg);
    this.worker.addEventListener('error', this.workerErr);
  }

  get maxzoom() {
    return this.maxZoom;
  }

  updateTiles(tilesInView: string[], tilesToLoad: string[]) {
    tilesToLoad.forEach(async (tile) => {
      if (this.tiles[tile]) {
        return;
      }
      const [x, y, z] = tile.split('/').map(Number);
      
      const [minlng, minlat, maxlng, maxlat] = tilebelt.tileToBBOX([x, y, z]);
      
      const [minx, miny] = MercatorCoordinate.fromLngLat([minlng, minlat]);
      const [maxx, maxy] = MercatorCoordinate.fromLngLat([maxlng, maxlat]);
      const image = new Image();
      image.onload = () => {
        this.tiles[tile] = {
          vertices: new Float32Array([
            minx, miny, 1, 0, 0,
            maxx, miny, 1, 1, 0,
            minx, maxy, 1, 0, 1,
            minx, maxy, 1, 0, 1,
            maxx, miny, 1, 1, 0,
            maxx, maxy, 1, 1, 1
          ]),
          image,
        }
      }
      image.onerror = (err) => {
        console.warn(`Error loading tile ${tile}`, err);
        this.tiles[tile] = undefined;
      }
      image.crossOrigin = 'Anonymous'
      image.src = this.url.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
    })
  }

  workerMsg = (event: MessageEvent) => {
    const {tile, tileData} = event.data;
    this.tiles[tile] = tileData;
  }

  workerErr = (error: ErrorEvent) => {
    console.error('Uncaught worker error.', error);
  }

  destroy() {
    this.tiles = {};
    this.worker.removeEventListener('message', this.workerMsg);
    this.worker.removeEventListener('error', this.workerErr);
    this.worker.terminate();
  }
}

export default ImageLayer;