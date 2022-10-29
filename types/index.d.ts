/// <reference types="webpack/module" />
/// <reference types="geojson" />
/// <reference types="geojson-vt" />

interface MapOptions {
  center?: [number, number];
  zoom?: number;
  bearing?: number;
  pitch?: number;
  debug?: boolean;
}

interface VectorLayerProps {
  id: string;
  type: string;
  url: string;
  tileSize?: number;
  maxZoom?: number;
  minZoom?: number;
}

interface ImageLayerProps {
  id: string;
  type: string;
  url: string;
  tileSize?: number;
  maxZoom?: number;
  minZoom?: number;
}

interface GeoJSONLayerProps {
  id: string;
  type: string;
  data: string | GeoJSON.GeoJSON;
  minZoom?: number;
  maxZoom?: number;
  style?: GeoJSONStyleProps;
}

interface GeoJSONStyleProps {
  color?: [number, number, number];
  opacity?: number;
}

interface CameraProps {
  x: number;
  y: number;
  z: number;
}

interface RendererProps {
  camera: CameraProps;
  debug: boolean;
}

interface TileWorkerMessageData {
  tile: string;
  layers: any;
  url: string;
}

interface ImageTileDataProps {
  image: HTMLImageElement;
  vertices: Float32Array;
}

interface TileDataProps {
  layer: string;
  vertices: Float32Array;
}

interface TileUrlProps {
  url: string;
  x: number;
  y: number;
  z: number;
}

interface TileProps {
  tile: string;
  layers: any;
  url: string;
}