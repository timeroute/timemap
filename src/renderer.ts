import { LAYERS, MAX_ZOOM, TILE_BUFFER, TILE_SIZE } from "./constants";
import RendererEvent from "./events/renderer-event";
import VectorLayer from "./layers/vector-layer";
import { createProgram, createShader } from "./utils/webgl-util";
import vs from './shaders/vs.glsl';
import fs from './shaders/fs.glsl';
import imageVS from './shaders/image-vs.glsl';
import imageFS from './shaders/image-fs.glsl';
import { mat3 } from "gl-matrix";
import tilebelt from "@mapbox/tilebelt";
import { geometryToVertices } from "./utils/map-util";
import GeoJSONLayer from "./layers/geojson-layer";
import ImageLayer from "./layers/image-layer";

class Renderer extends RendererEvent {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  imageProgram: WebGLProgram;
  positionBuffer: WebGLBuffer;
  layers: (VectorLayer | ImageLayer | GeoJSONLayer)[] = [];
  tilesInView: string[] = [];
  tilesToLoad: string[] = [];

  constructor(canvas: HTMLCanvasElement, options: RendererProps) {
    super(canvas, options);
    this.gl = this.canvas.getContext('webgl');
    this.gl.canvas.width = this.canvas.clientWidth;
    this.gl.canvas.height = this.canvas.clientHeight;
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
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.program = this.initProgram(vs, fs);
    this.imageProgram = this.initProgram(imageVS, imageFS);
    this.gl.useProgram(this.program);
    this.gl.clearColor(0, 0, 0, 0);
    this.positionBuffer = this.gl.createBuffer();
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
    const matrixLocation = this.gl.getUniformLocation(this.program, "u_matrix");
    const imageMatrixLocation = this.gl.getUniformLocation(this.imageProgram, "u_matrix");
    
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.layers.forEach((layer) => {
      if (layer instanceof VectorLayer) {
        this.gl.useProgram(this.program);
        this.gl.uniformMatrix3fv(matrixLocation, false, this.matrix);
        this.tilesInView.forEach((tile) => {
          const tileData = layer.tiles[tile];
          (tileData || []).forEach((tileLayer) => {
            const { layer, vertices } = tileLayer;
            if (LAYERS[layer]) {
              const color = LAYERS[layer].map(n => n / 255);
              const colorLocation = this.gl.getUniformLocation(this.program, 'u_color');
              this.gl.uniform4fv(colorLocation, color);
              this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
              this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
              const positionAttribLocation = this.gl.getAttribLocation(this.program, 'a_position');
              this.gl.enableVertexAttribArray(positionAttribLocation);
              const size = 3;
              const type = this.gl.FLOAT;
              const normalize = false;
              const stride = 0;
              let offset = 0;
              this.gl.vertexAttribPointer(positionAttribLocation, size, type, normalize, stride, offset);
              const primitiveType = this.gl.TRIANGLES;
              offset = 0;
              const count = vertices.length / 3;
              this.gl.drawArrays(primitiveType, offset, count);
            }
          })
        })
      } else if (layer instanceof ImageLayer) {
        this.gl.useProgram(this.imageProgram);
        this.gl.uniformMatrix3fv(imageMatrixLocation, false, this.matrix);
        // image layer
        this.tilesInView.forEach((tile) => {
          if (!layer.tiles[tile]) return;
          const { image, vertices } = layer.tiles[tile];
          
          const texture = this.gl.createTexture();
          this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
          
          this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
          this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
          this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
          this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
          this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, 1)
          this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
          
          this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
          this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
          const positionAttribLocation = this.gl.getAttribLocation(this.imageProgram, 'a_position');
          this.gl.enableVertexAttribArray(positionAttribLocation);
          const size = 5;
          const type = this.gl.FLOAT;
          const normalize = false;
          const stride = size * 4;
          let offset = 0;
          this.gl.vertexAttribPointer(positionAttribLocation, 3, type, normalize, stride, offset);
          const uvAttribLocation = this.gl.getAttribLocation(this.imageProgram, 'a_uv');
          this.gl.enableVertexAttribArray(uvAttribLocation);
          offset = 3;
          this.gl.vertexAttribPointer(uvAttribLocation, 2, type, normalize, stride, offset*4);
          const primitiveType = this.gl.TRIANGLES;
          offset = 0;
          const count = vertices.length / size;
          this.gl.drawArrays(primitiveType, offset, count);
          // layer.tiles[tile] = undefined;
          this.gl.deleteTexture(texture);
        })
      } else if (layer instanceof GeoJSONLayer) {
        this.gl.useProgram(this.program);
        this.gl.uniformMatrix3fv(matrixLocation, false, this.matrix);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        // geojson data
        this.tilesInView.forEach((tile) => {
          const vertices: any = layer.tiles[tile];
          if (!vertices) return;
          
          const color = [1, 0, 0, 0.5];
          const colorLocation = this.gl.getUniformLocation(this.program, 'u_color');
          this.gl.uniform4fv(colorLocation, color);
          this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
          this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
          const positionAttribLocation = this.gl.getAttribLocation(this.program, 'a_position');
          this.gl.enableVertexAttribArray(positionAttribLocation);
          const size = 3;
          const type = this.gl.FLOAT;
          const normalize = false;
          const stride = 0;
          let offset = 0;
          this.gl.vertexAttribPointer(positionAttribLocation, size, type, normalize, stride, offset);
          const primitiveType = this.gl.TRIANGLES;
          offset = 0;
          const count = vertices.length / 3;
          this.gl.drawArrays(primitiveType, offset, count);
        })
        this.gl.disable(this.gl.BLEND);
      }
    })
    
    if (this.debug) {
      this.gl.useProgram(this.program);
      this.gl.uniformMatrix3fv(matrixLocation, false, this.matrix);
      this.tilesInView.forEach((tile) => {
        const tileArray = tile.split('/').map(Number);
        const colorLocation = this.gl.getUniformLocation(this.program, 'u_color');
        this.gl.uniform4fv(colorLocation, [1, 0, 0, 1]);
        const tileVertices = geometryToVertices(tilebelt.tileToGeoJSON(tileArray));
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, tileVertices, this.gl.STATIC_DRAW);
        const positionAttribLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.gl.enableVertexAttribArray(positionAttribLocation);
        const size = 3;
        const type = this.gl.FLOAT;
        const normalize = false;
        const stride = 0;
        let offset = 0;
        this.gl.vertexAttribPointer(positionAttribLocation, size, type, normalize, stride, offset);
        const primitiveType = this.gl.LINES;
        offset = 0;
        const count = tileVertices.length / 3;
        this.gl.drawArrays(primitiveType, offset, count);
      })
    }
    
    requestAnimationFrame(this.render)
  }
}

export default Renderer;
