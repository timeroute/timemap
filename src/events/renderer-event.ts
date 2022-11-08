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
  mousecache: number;

  constructor(canvas: HTMLCanvasElement, options: RendererProps) {
    super(canvas);
    const {camera, debug} = options;
    this.camera = camera;
    this.debug = debug;
    this.canvas.addEventListener('mousedown', this.mousedown);
    this.canvas.addEventListener('touchstart', this.touchstart);
    this.canvas.addEventListener('wheel', this.mousezoom);
  }

  resize = () => {}

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

  touchmove = (e: TouchEvent) => {
    e.preventDefault();
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
    e.preventDefault();
    if (this.mousecache) {
      if (Date.now() - this.mousecache < 400) {
        this.mousedbclick(e);
        return;
      }
    }
    this.mousecache = Date.now();
    const [startX, startY] = this.getClipSpacePosition(e);
    
    this.startX = startX;
    this.startY = startY;
    
    this.canvas.style.cursor = 'grabbing';
    this.canvas.addEventListener('mousemove', this.mousemove);
    this.canvas.addEventListener('mouseup', this.mouseup);
  }
  
  touchstart = (e: TouchEvent) => {
    e.preventDefault();
    if (this.mousecache) {
      if (Date.now() - this.mousecache < 400) {
        this.touchdbstart(e);
        return;
      }
    }
    this.mousecache = Date.now();
    const [startX, startY] = this.getClipSpacePosition(e);
    
    this.startX = startX;
    this.startY = startY;
    
    this.canvas.addEventListener('touchmove', this.touchmove);
    this.canvas.addEventListener('touchend', this.touchend);
  }

  mouseup = (e: MouseEvent) => {
    e.preventDefault();
    this.canvas.style.cursor = 'grab';
    this.canvas.removeEventListener('mousemove', this.mousemove);
    this.canvas.removeEventListener('mouseup', this.mouseup);
  }

  touchend = (e: TouchEvent) => {
    e.preventDefault();
    this.canvas.removeEventListener('touchmove', this.touchmove);
    this.canvas.removeEventListener('touchend', this.touchend);
  }

  handleZoom(e: MouseEvent | WheelEvent | TouchEvent, zoomDelta: number) {
    e.preventDefault();
    const [x, y] = this.getClipSpacePosition(e);
    const [preZoomX, preZoomY] = vec3.transformMat3(vec3.create(), [x, y, 0], mat3.invert(mat3.create(), this.matrix));
    
    const prevZoom = this.camera.z;
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

  mousezoom = (e: WheelEvent) => {
    this.handleZoom(e, -e.deltaY * (1 / 500));
  }

  mousedbclick = (e: MouseEvent) => {
    e.preventDefault();
    const startTime = Date.now();
    let curTime = startTime;
    const animate = () => {
      let tempTime = Date.now();
      const deltaTime = tempTime - curTime;
      const diffTime = tempTime - startTime;
      curTime = tempTime;
      if (diffTime > 300) return;
      this.handleZoom(e, deltaTime / 300);
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  touchdbstart = (e: TouchEvent) => {
    e.preventDefault();
    const startTime = Date.now();
    let curTime = startTime;
    const animte = () => {
      let tempTime = Date.now();
      const deltaTime = tempTime - curTime;
      const diffTime = tempTime - startTime;
      curTime = tempTime;
      if (diffTime > 300) return;
      this.handleZoom(e, deltaTime / 300);
      requestAnimationFrame(animte);
    }
    requestAnimationFrame(animte);
  }

  getClipSpacePosition(e: MouseEvent | WheelEvent | TouchEvent) {
    let x, y;
    if (e instanceof MouseEvent || e instanceof WheelEvent) {
      [x, y] = [e.clientX, e.clientY];
    } else if (e instanceof TouchEvent) {
      [x, y] = [e.targetTouches[0].pageX, e.targetTouches[0].pageY];
    }
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
      Math.max(MercatorCoordinate.lngFromMercatorX(x1), -179.5),
      Math.max(MercatorCoordinate.latFromMercatorY(y1), -85.05),
      Math.min(MercatorCoordinate.lngFromMercatorX(x2), 179.5),
      Math.min(MercatorCoordinate.latFromMercatorY(y2), 85.05),
    ]
    
    return bbox;
  }

  atLimits() {
    return false;
    // const bbox = this.calcBounds();
    // return bbox[0] === -180 || bbox[1] === -85.05 || bbox[2] === 180 || bbox[3] === 85.05;
  }
}

export default RendererEvent;
