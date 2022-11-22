import tilebelt from "@mapbox/tilebelt";
import { mat3 } from "gl-matrix";
import { LAYERS } from "../constants";
import GeoJSONLayer from "../layers/geojson-layer";
import ImageLayer from "../layers/image-layer";
import VectorLayer from "../layers/vector-layer";
import { geometryToVertices } from "./map-util";

export const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
  let shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

export const createProgram = (gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) => {
  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  let success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }
  console.error(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

export const renderVectorLayer = (
  gl: WebGLRenderingContext, 
  program: WebGLProgram, 
  matrix: mat3, 
  tilesInView: string[], 
  layer: VectorLayer
) => {
  gl.useProgram(program);

  const matrixLocation = gl.getUniformLocation(program, 'u_matrix');
  gl.uniformMatrix3fv(matrixLocation, false, matrix);

  tilesInView.forEach((tile) => {
    const tileData = layer.tiles[tile];
    (tileData || []).forEach((tileLayer) => {
      const { layer, vertices } = tileLayer;
      if (LAYERS[layer]) {
        const color = LAYERS[layer].map(n => n / 255);
        const colorLocation = gl.getUniformLocation(program, 'u_color');
        gl.uniform4fv(colorLocation, color);
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        const positionAttribLocation = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionAttribLocation);

        const size = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        let offset = 0;
        gl.vertexAttribPointer(positionAttribLocation, size, type, normalize, stride, offset);
        const primitiveType = gl.TRIANGLES;
        offset = 0;
        const count = vertices.length / 3;
        gl.drawArrays(primitiveType, offset, count);
        gl.deleteBuffer(positionBuffer);
        gl.disableVertexAttribArray(positionAttribLocation);
      }
    })
  })
}

export const renderImageLayer = (
  gl: WebGLRenderingContext, 
  program: WebGLProgram, 
  matrix: mat3, 
  tilesInView: string[], 
  layer: ImageLayer
) => {
  gl.useProgram(program);
  const matrixLocation = gl.getUniformLocation(program, 'u_matrix');
  gl.uniformMatrix3fv(matrixLocation, false, matrix);

  gl.uniformMatrix3fv(matrixLocation, false, matrix);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const positionBuffer = gl.createBuffer();
  // image layer
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  tilesInView.filter(tile => layer.tiles[tile]).forEach((tile) => {
    const { image, vertices } = layer.tiles[tile];
    
    // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const positionAttribLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionAttribLocation);
    const size = 5;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = size * 4;
    let offset = 0;
    gl.vertexAttribPointer(positionAttribLocation, 3, type, normalize, stride, offset);

    const uvAttribLocation = gl.getAttribLocation(program, 'a_uv');
    gl.enableVertexAttribArray(uvAttribLocation);
    offset = 3;
    gl.vertexAttribPointer(uvAttribLocation, 2, type, normalize, stride, offset * 4);

    const primitiveType = gl.TRIANGLES;
    offset = 0;
    const count = vertices.length / size;
    gl.drawArrays(primitiveType, offset, count);

    gl.disableVertexAttribArray(positionAttribLocation);
    gl.disableVertexAttribArray(uvAttribLocation);
  })
  gl.deleteTexture(texture);
  gl.deleteBuffer(positionBuffer);
  gl.disable(gl.BLEND);
}

export const renderGeoJSONLayer = (
  gl: WebGLRenderingContext, 
  program: WebGLProgram, 
  matrix: mat3, 
  tilesInView: string[], 
  layer: GeoJSONLayer
) => {
  gl.useProgram(program);
  const matrixLocation = gl.getUniformLocation(program, 'u_matrix');
  gl.uniformMatrix3fv(matrixLocation, false, matrix);
  // gl.enable(gl.BLEND);
  // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  // geojson data
  tilesInView.forEach((tile) => {
    const vertices: any = layer.tiles[tile];
    if (!vertices) return;
    
    const { color: rgb, opacity } = layer.style;
    const color = [...rgb, opacity];
    const colorLocation = gl.getUniformLocation(program, 'u_color');
    gl.uniform4fv(colorLocation, color);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const positionAttribLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionAttribLocation);
    const size = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    let offset = 0;
    gl.vertexAttribPointer(positionAttribLocation, size, type, normalize, stride, offset);

    const primitiveType = gl.TRIANGLES;
    offset = 0;
    const count = vertices.length / 3;
    gl.drawArrays(primitiveType, offset, count);
    gl.deleteBuffer(positionBuffer);
    gl.disableVertexAttribArray(positionAttribLocation);
  })
  // gl.disable(gl.BLEND);
}

export const renderDebugLayer = (
  gl: WebGLRenderingContext, 
  program: WebGLProgram, 
  matrix: mat3, 
  tilesInView: string[]
) => {
  gl.useProgram(program);
  const matrixLocation = gl.getUniformLocation(program, 'u_matrix');
  gl.uniformMatrix3fv(matrixLocation, false, matrix);
  tilesInView.forEach((tile) => {
    const tileArray = tile.split('/').map(Number);
    const colorLocation = gl.getUniformLocation(program, 'u_color');
    gl.uniform4fv(colorLocation, [1, 0, 0, 1]);
    const tileVertices = geometryToVertices(tilebelt.tileToGeoJSON(tileArray));

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, tileVertices, gl.STATIC_DRAW);
    const positionAttribLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionAttribLocation);
    const size = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    let offset = 0;
    gl.vertexAttribPointer(positionAttribLocation, size, type, normalize, stride, offset);
    
    const primitiveType = gl.LINES;
    offset = 0;
    const count = tileVertices.length / 3;
    gl.drawArrays(primitiveType, offset, count);
    
    gl.deleteBuffer(positionBuffer);
    gl.disableVertexAttribArray(positionAttribLocation);
  })
}