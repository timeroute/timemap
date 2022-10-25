/// <reference types="webpack/module" />

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


interface LayerProps {
  url: string;
  tileSize?: number;
  maxZoom?: number;
  minZoom?: number;
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