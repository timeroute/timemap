import { VectorTile } from '@mapbox/vector-tile';
import geojsonvt from 'geojson-vt';
import Protobuf from 'pbf';
import vtpbf from 'vt-pbf';
import { geometryToVertices } from '../utils/map-util';

class GeoJSONLayer {
  id: string;
  url: string;
  data: any;
  minZoom: number = 0;
  maxZoom: number = 22;
  tiles: Record<string, Float32Array> = {};

  constructor(id: string, props: GeoJSONLayerProps) {
    this.id = id;
    if (props.minZoom >=0 && props.minZoom < 22) {
      this.minZoom = props.minZoom;
    }
    if (props.maxZoom > props.minZoom && props.maxZoom < 23) {
      this.maxZoom = props.maxZoom;
    }
    if (typeof props.data === 'string') {
      this.url = props.data;
    } else {
      this.data = geojsonvt(props.data, {
        maxZoom: this.maxZoom,
      });
    }
  }

  get maxzoom() {
    return this.maxZoom;
  }

  async updateData() {
    const res = await fetch(this.url);
    const data = await res.json();
    this.data = geojsonvt(data, {
      maxZoom: this.maxZoom
    });
  }

  updateTiles(tilesInView: string[], tilesToLoad: string[]) {
    if (!this.data) return;
    tilesToLoad.forEach(async (tile) => {
      if (this.tiles[tile]) {
        return;
      }
      const [x, y, z] = tile.split('/').map(Number);
      const layerName = 'geojsonLayer'
      const geojsonLayer = this.data.getTile(z, x, y);
      if (!geojsonLayer) return;
      if (geojsonLayer.features.length === 0) return;

      const vectorTile = new VectorTile(new Protobuf(vtpbf.fromGeojsonVt({ geojsonLayer })));
      // @ts-ignore
      const numFeatures = vectorTile.layers[layerName]?._features?.length || 0;

      const vertices: number[] = [];
      for (let i = 0; i < numFeatures; i++) {
        const geojson = vectorTile.layers[layerName].feature(i).toGeoJSON(x, y, z);
        vertices.push(...geometryToVertices(geojson.geometry as any) as any);
      }
      this.tiles[tile] = new Float32Array(vertices);
    })
  }
}

export default GeoJSONLayer;