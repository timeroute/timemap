import { MAX_ZOOM, TILE_BUFFER, TILE_SIZE } from "./constants";
import RendererEvent from "./events/renderer-event";
import VectorLayer from "./layers/vector-layer";
import { createProgram, createShader, renderDebugLayer, renderGeoJSONLayer, renderImageLayer, renderVectorLayer } from "./utils/webgl-util";
import vs from './shaders/vs.glsl';
import fs from './shaders/fs.glsl';
import imageVS from './shaders/image-vs.glsl';
import imageFS from './shaders/image-fs.glsl';
import { mat3 } from "gl-matrix";
import tilebelt from "@mapbox/tilebelt";
import GeoJSONLayer from "./layers/geojson-layer";
import ImageLayer from "./layers/image-layer";

class Renderer extends RendererEvent {
  gl: WebGLRenderingContext;
  vecProgram: WebGLProgram;
  imgProgram: WebGLProgram;
  layers: (VectorLayer | ImageLayer | GeoJSONLayer)[] = [];
  tilesInView: string[] = [];
  tilesToLoad: string[] = [];

  constructor(canvas: HTMLCanvasElement, options: RendererProps) {
    super(canvas, options);
    this.gl = this.canvas.getContext('webgl', { antialias: true });
    window.addEventListener('resize', this.resize);
    this.resize();
    this.initGL();
    this.updateMatrix();
    this.updateTiles();
    requestAnimationFrame(this.render)
  }

  initProgram(vs: string, fs: string) {
    const vertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, vs);
    const fragShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, fs);
    const program = createProgram(this.gl, vertexShader, fragShader);
    return program;
  }
  
  initGL() {
    this.vecProgram = this.initProgram(vs, fs);
    this.imgProgram = this.initProgram(imageVS, imageFS);
    this.gl.clearColor(0, 0, 0, 0);
  }

  resize = () => {
    console.log('resize');
    let w = this.canvas.clientWidth;
    let h = this.canvas.clientHeight;
    if (window.devicePixelRatio) {
      this.canvas.width = w * window.devicePixelRatio;
      this.canvas.height = h * window.devicePixelRatio;
    }
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.updateMatrix();
    this.updateTiles();
  }

  getLayer(id: string) {
    return this.layers.find(layer => layer.id === id);
  }

  removeLayer(id: string) {
    const index = this.layers.findIndex(layer => layer.id === id);
    if (index > -1) {
      this.layers[index].destroy();
      this.layers.splice(index, 1);
    }
  }

  dataLoaded = () => {
    this.updateTiles();
  }

  addLayer(options: VectorLayerProps | GeoJSONLayerProps | ImageLayerProps) {
    const {id, type} = options;
    if (type === 'vector') {
      this.layers.push(new VectorLayer(id, options as VectorLayerProps));
      this.updateTiles();
    } else if (type === 'geojson') {
      const layer = new GeoJSONLayer(id, options as GeoJSONLayerProps);
      if (!layer.data) {
        layer.updateData(this.dataLoaded);
      }
      this.layers.push(layer);
    } else if (type === 'image') {
      this.layers.push(new ImageLayer(id, options as ImageLayerProps));
      this.updateTiles();
    }
  }

  updateMatrix() {
    const cameraMat = mat3.create();
    mat3.translate(cameraMat, cameraMat, [this.camera.x, this.camera.y]);
    const zoomScale = 1 / Math.pow(2, this.camera.z);
    const widthScale = TILE_SIZE / this.gl.canvas.width;
    const heightScale = TILE_SIZE / this.gl.canvas.height;
    mat3.scale(cameraMat, cameraMat, [zoomScale/widthScale, zoomScale/heightScale]);
    this.matrix = mat3.multiply(mat3.create(), mat3.create(), mat3.invert(mat3.create(), cameraMat));
  }

  updateTiles(): void {
    this.getTilesInView();
    this.layers.forEach(layer => {
      if (this.camera.z > layer.maxzoom) return;
      layer.updateTiles(this.tilesInView, this.tilesToLoad);
    })
  }

  getTilesInView(): void {
    const bbox = this.calcBounds();
    const z = Math.min(Math.trunc(this.camera.z), MAX_ZOOM);
    const minTile = tilebelt.pointToTile(bbox[0], bbox[3], z);
    const maxTile=  tilebelt.pointToTile(bbox[2], bbox[1], z);
    const tilesInView = [];
    const [minX, maxX] = [Math.max(minTile[0], 0), maxTile[0]];
    const [minY, maxY] = [Math.max(minTile[1], 0), maxTile[1]];
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        tilesInView.push([x, y, z].join('/'));
      }
    }
    this.tilesInView = tilesInView;

    let bufferedTiles = [];
    for (let bufX = minX - TILE_BUFFER; bufX <= maxX + TILE_BUFFER; bufX++) {
      for (let bufY = minY - TILE_BUFFER; bufY <= maxY + TILE_BUFFER; bufY++) {
        bufferedTiles.push([bufX, bufY, z].join('/'));
        bufferedTiles.push(tilebelt.getParent([bufX, bufY, z]).join('/'));
        bufferedTiles.push(tilebelt.getParent(tilebelt.getParent([bufX, bufY, z])).join('/'));
      }
    }

    let tilesToLoad = [
      ...new Set([
        ...tilesInView,
        ...bufferedTiles
      ])
    ];
    tilesToLoad = tilesToLoad.filter((tile) => {
      const [x, y, z] = tile.split('/').map(Number);
      const N = Math.pow(2, z);
      const validX = x >= 0 && x < N;
      const validY = y >= 0 && y < N;
      const validZ = z >= 0 && z <= MAX_ZOOM;
      return validX && validY && validZ;
    })
    this.tilesToLoad = tilesToLoad;
  }

  render = () => {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.layers.forEach((layer) => {
      if (layer instanceof VectorLayer) {
        renderVectorLayer(this.gl, this.vecProgram, this.matrix, this.tilesInView, layer);
      } else if (layer instanceof ImageLayer) {
        renderImageLayer(this.gl, this.imgProgram, this.matrix, this.tilesInView, layer);
      } else if (layer instanceof GeoJSONLayer) {
        renderGeoJSONLayer(this.gl, this.vecProgram, this.matrix, this.tilesInView, layer);
      }
    })
    
    if (this.debug) {
      renderDebugLayer(this.gl, this.vecProgram, this.matrix, this.tilesInView);
    }
    
    requestAnimationFrame(this.render)
  }
}

export default Renderer;
