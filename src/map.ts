import greatCircle from '@turf/great-circle';
import GeoJSONLayer from './layers/geojson-layer';
import ImageLayer from './layers/image-layer';
import VectorLayer from './layers/vector-layer';
import Renderer from './renderer';
import MercatorCoordinate from './utils/mercator-coordinate';

const defaultMapOptions: MapOptions = {
  center: [0, 0],
  zoom: 1,
  bearing: 0,
  pitch: 0, 
  debug: false,
}

class Map {
  options: MapOptions;
  renderer: Renderer;

  constructor(canvas: HTMLCanvasElement, options: MapOptions) {
    this.options = Object.assign(defaultMapOptions, options);
    const [x, y] = MercatorCoordinate.fromLngLat(this.options.center);
    this.renderer = new Renderer(canvas, {
      camera: {
        x, y, z: this.options.zoom
      },
      debug: this.options.debug
    });
  }

  set debug(flag: boolean) {
    this.renderer.debug = flag;
  }

  set center(center: [number, number]) {
    const [x, y] = MercatorCoordinate.fromLngLat(center);
    this.renderer.camera = {
      x, y, z: this.renderer.camera.z
    }
    this.renderer.updateMatrix();
    this.renderer.updateTiles();
  }

  get center() {
    const {x, y} = this.renderer.camera;
    return MercatorCoordinate.fromXY([x, y]);
  }

  flyTo(destination: [number, number]) {
    const line = greatCircle(this.center, destination, { npoints: 1000 });
    const coordinates = line.geometry.coordinates;
    let startTime = Date.now();
    const animate = () => {
      let diffTime = Date.now() - startTime;
      if (diffTime >= 1000) {
        this.center = destination;
        return;
      } else {
        this.center = coordinates[diffTime] as [number, number];
      }
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  addLayer(options: VectorLayerProps | ImageLayerProps | GeoJSONLayerProps) {
    this.renderer.addLayer(options);
  }

  removeLayer(id: string) {
    this.renderer.removeLayer(id);
  }

  getLayer(id: string) {
    return this.renderer.getLayer(id);
  }

  getBounds() {
    return this.renderer.calcBounds();
  }
}

export default Map;