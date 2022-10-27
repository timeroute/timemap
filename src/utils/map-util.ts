import axios from 'axios';
import earcut from 'earcut';
import Protobuf from 'pbf';
import { VectorTile } from '@mapbox/vector-tile';
import MercatorCoordinate from './mercator-coordinate';

export const geometryToVertices = (geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon) => {
  const verticesFromPolygon = (coordinates: GeoJSON.Position[][]) => {
    const data = earcut.flatten(coordinates);
    const triangles = earcut(data.vertices, data.holes, 2);

    const vertices = new Float32Array(triangles.length * 3);
    for (let i = 0; i < triangles.length; i++) {
      const point = triangles[i];
      const lng = data.vertices[point * 2];
      const lat = data.vertices[point * 2 + 1];
      const [x, y] = MercatorCoordinate.fromLngLat([lng, lat]);
      vertices[i * 3] = x;
      vertices[i * 3 + 1] = y;
      vertices[i * 3 + 2] = 1.0;
    }
    return vertices;
  }

  if (geometry.type === 'Polygon') {
    return verticesFromPolygon(geometry.coordinates);
  }

  if (geometry.type === 'MultiPolygon') {
    const positions: number[] = [];
    geometry.coordinates.forEach((polygon) => {
      positions.push(...verticesFromPolygon([polygon[0]]) as any);
    });
    return Float32Array.from(positions);
  }

  // only support Polygon & Multipolygon for now
  return new Float32Array([]);
};

const getTileURL = ({ url, x, y, z }: TileUrlProps) => (
  url
    .replace('{x}', String(x))
    .replace('{y}', String(y))
    .replace('{z}', String(z))
);

export const fetchImageTile = async ({ tile, url }: Partial<TileProps>) => {
  const [x, y, z] = tile.split('/').map(Number);

  const res = await axios.get(getTileURL({ url, x, y, z}), {
    responseType: 'arraybuffer',
  })

  console.log(res);
}

export const fetchTile = async ({ tile, layers, url }: TileProps) => {
  const [x, y, z] = tile.split('/').map(Number);

  const res = await axios.get(getTileURL({ url, x, y, z }), {
    responseType: 'arraybuffer',
  });

  const pbf = new Protobuf(res.data);
  const vectorTile = new VectorTile(pbf);

  const tileData: TileDataProps[] = [] // layers -> features
  Object.keys(layers).forEach((layer) => {
    if (vectorTile?.layers?.[layer]) {
      // @ts-ignore
      const numFeatures = vectorTile.layers[layer]?._features?.length || 0;

      const vertices: number[] = [];
      for (let i = 0; i < numFeatures; i++) {
        const geojson = vectorTile.layers[layer].feature(i).toGeoJSON(x, y, z);
        vertices.push(...geometryToVertices(geojson.geometry as any) as any);
      }
      tileData.push({ layer, vertices: Float32Array.from(vertices) });
    }
  });

  return tileData;
}