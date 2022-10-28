attribute vec3 a_position;
attribute vec2 a_uv;
uniform mat3 u_matrix;

varying vec2 v_uv;

void main() {
  gl_Position = vec4(u_matrix * a_position, 1.0);
  v_uv = a_uv;
}