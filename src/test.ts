import { Map, version } from ".";

console.log('version:', version);

document.body.style.margin = '0';

// init div
const div = document.createElement('div');
div.style.height = '100vh';
div.style.width = '100%';
div.style.position = 'relative';

// init canvas
const dom = document.createElement('canvas');
dom.style.height = '100%';
dom.style.width = '100%';
dom.style.position = 'absolute';
dom.width = div.clientWidth;
dom.height = div.clientHeight;

div.appendChild(dom);
document.body.appendChild(div);

const map = new Map(dom, {
  center: [120, 30],
  zoom: 4,
  debug: true
});
map.addLayer({
  id: 'vec',
  type: 'vector',
  url: 'http://a.tiles.mapbox.com/v4/mapbox.mapbox-streets-v8/{z}/{x}/{y}.mvt?access_token=pk.eyJ1IjoiY2hpbmVzZWphciIsImEiOiJjanU5bXFpZ28wN3JtNGRwZGM5MW84czVsIn0.DhHUA_m4clzrzHFGtj97kQ',
})
console.log(map);