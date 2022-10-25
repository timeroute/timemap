class MercatorCoordinate {
  static mercatorXfromLng(lng: number) {
    return (180 + lng) / 360;
  }

  static mercatorYfromLat(lat: number) {
    return (180 - (180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)))) / 360;
  }

  static fromLngLat(lngLat: [number, number]) {
    let x = MercatorCoordinate.mercatorXfromLng(lngLat[0]);
    let y = MercatorCoordinate.mercatorYfromLat(lngLat[1]);

    x = -1 + (x * 2);
    y = 1 - (y * 2);

    return [x, y];
  }

  static lngFromMercatorX(x: number) {
    return x * 360 - 180;
  }

  static latFromMercatorY(y: number) {
    const y2 = 180 - y * 360;
    return 360 / Math.PI * Math.atan(Math.exp(y2 * Math.PI / 180)) - 90;
  }

  static fromXY(xy: [number, number]) {
    let [x, y] = xy;
    const lng = MercatorCoordinate.lngFromMercatorX((1 + x) / 2);
    const lat = MercatorCoordinate.latFromMercatorY((1 - y) / 2);
    return [lng, lat];
  }
}

export default MercatorCoordinate;
