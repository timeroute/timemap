import { mat3, vec3 } from "gl-matrix";
import { MAX_ZOOM, MIN_ZOOM, TILE_SIZE } from "../constants";
import MercatorCoordinate from "../utils/mercator-coordinate";
import BaseEvent from "./base";

class RendererEvent extends BaseEvent {
  debug: boolean = false;
  startX: number;
  startY: number;
  matrix: mat3 = mat3.create();
  camera: CameraProps;

  constructor(canvas: HTMLCanvasElement, options: RendererProps) {
    super(canvas);
    const {camera, debug} = options;
    this.camera = camera;
    this.debug = debug;
    this.canvas.addEventListener('mousedown', this.mousedown);
    this.canvas.addEventListener('wheel', this.mousezoom);
  }

  mousemove = (e: MouseEvent) => {
    const [x, y] = this.getClipSpacePosition(e);
    
    const [preX, preY] = vec3.transformMat3(vec3.create(), [this.startX, this.startY, 0], mat3.invert(mat3.create(), this.matrix));
    const [postX, postY] = vec3.transformMat3(vec3.create(), [x, y, 0], mat3.invert(mat3.create(), this.matrix));
    
    const deltaX = preX - postX;
    const deltaY = preY - postY;
    
    if (isNaN(deltaX) || isNaN(deltaY)) {
      return;
    }
    this.camera.x += deltaX;
    this.camera.y += deltaY;
    this.updateMatrix();
    if (this.atLimits()) {
      this.camera.x -= deltaX;
      this.camera.y -= deltaY;
      this.updateMatrix();
      return;
    }
    this.startX = x;
    this.startY = y;

    this.updateMatrix();
    this.updateTiles();
  }

  mousedown = (e: MouseEvent) => {
    const [startX, startY] = this.getClipSpacePosition(e);
    
    this.startX = startX;
    this.startY = startY;
    
    this.canvas.style.cursor = 'grabbing';
    this.canvas.addEventListener('mousemove', this.mousemove);
    this.canvas.addEventListener('mouseup', this.mouseup);
  }

  mouseup = (e: MouseEvent) => {
    this.canvas.style.cursor = 'grab';
    this.canvas.removeEventListener('mousemove', this.mousemove);
    this.canvas.removeEventListener('mouseup', this.mouseup);
  }

  mousezoom = (e: WheelEvent) => {
    e.preventDefault();
    const [x, y] = this.getClipSpacePosition(e);
    const [preZoomX, preZoomY] = vec3.transformMat3(vec3.create(), [x, y, 0], mat3.invert(mat3.create(), this.matrix));
    
    const prevZoom = this.camera.z;
    const zoomDelta = -e.deltaY * (1 / 500);
    this.camera.z += zoomDelta;
    this.camera.z = Math.max(MIN_ZOOM, Math.min(this.camera.z, MAX_ZOOM));
    this.updateMatrix();

    if (this.atLimits()) {
      this.camera.z = prevZoom;
      this.updateMatrix();
      return;
    }

    const [postZoomX, postZoomY] = vec3.transformMat3(vec3.create(), [x, y, 0], mat3.invert(mat3.create(), this.matrix));
    this.camera.x += preZoomX - postZoomX;
    this.camera.y += preZoomY - postZoomY;
    this.updateMatrix();
    this.updateTiles();
  }

  getClipSpacePosition(e: MouseEvent | WheelEvent) {
    const [x, y] = [e.clientX, e.clientY];
    const rect = this.canvas.getBoundingClientRect();
    const cssX = x - rect.left;
    const cssY = y - rect.top;
    const normalizedX = cssX / this.canvas.clientWidth;
    const normalizedY = cssY / this.canvas.clientHeight;
    const clipX = normalizedX * 2 - 1;
    const clipY = normalizedY * -2 + 1;
    return [clipX, clipY];
  }

  getTilesInView() {
    
  }
  
  updateMatrix() {
  }

  updateTiles() {}

  calcBounds() {
    const zoomScale = Math.pow(2, this.camera.z);
    const px = (1 + this.camera.x) / 2;
    const py = (1 - this.camera.y) / 2;
    const wx = px * TILE_SIZE;
    const wy = py * TILE_SIZE;
    const zx = wx * zoomScale;
    const zy = wy * zoomScale;
    let x1 = zx - (this.canvas.width / 2);
    let y1 = zy + (this.canvas.height / 2);
    let x2 = zx + (this.canvas.width / 2);
    let y2 = zy - (this.canvas.height / 2);
    x1 = x1 / zoomScale / TILE_SIZE;
    y1 = y1 / zoomScale / TILE_SIZE;
    x2 = x2 / zoomScale / TILE_SIZE;
    y2 = y2 / zoomScale / TILE_SIZE;

    const bbox = [
      Math.max(MercatorCoordinate.lngFromMercatorX(x1), -180),
      Math.max(MercatorCoordinate.latFromMercatorY(y1), -85.05),
      Math.min(MercatorCoordinate.lngFromMercatorX(x2), 180),
      Math.min(MercatorCoordinate.latFromMercatorY(y2), 85.05),
    ]
    
    return bbox;
  }

  atLimits() {
    const bbox = this.calcBounds();
    return bbox[0] === -180 || bbox[1] === -85.05 || bbox[2] === 180 || bbox[3] === 85.05;
  }
}

export default RendererEvent;
