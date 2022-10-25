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

  addLayer(options: VectorLayerProps) {
    const {id, type, ...props} = options;
    if (type === 'vector') {
      this.renderer.layers.push(new VectorLayer(id, props));
      this.renderer.updateTiles();
    }
  }

  getBounds() {
    return this.renderer.calcBounds();
  }
}

export default Map;