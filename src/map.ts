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

  async addLayer(options: VectorLayerProps | ImageLayerProps | GeoJSONLayerProps) {
    const {id, type} = options;
    if (type === 'vector') {
      this.renderer.layers.push(new VectorLayer(id, options as VectorLayerProps));
    } else if (type === 'geojson') {
      const layer = new GeoJSONLayer(id, options as GeoJSONLayerProps);
      if (!layer.data) {
        await layer.updateData();
      }
      this.renderer.layers.push(layer);
    } else if (type === 'image') {
      this.renderer.layers.push(new ImageLayer(id, options as ImageLayerProps));
    }
    this.renderer.updateTiles();
  }

  removeLayer(id: string) {
    const index = this.renderer.layers.findIndex(layer => layer.id === id);
    if (index > -1) {
      this.renderer.layers[index].destroy();
      this.renderer.layers.splice(index, 1);
    }
  }

  getLayer(id: string) {
    return this.renderer.layers.find(layer => layer.id === id);
  }

  getBounds() {
    return this.renderer.calcBounds();
  }
}

export default Map;