import Phaser from "phaser";

// Shader del piso: alrededor del hoyo el suelo se retuerce (gira) y se hunde (se estira hacia el centro),
// y se oscurece un poco. Solo funciona con WebGL; con Canvas el piso queda normal.
const FRAG = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform vec2 uResolucion;
uniform vec2 uCentro;
uniform float uRadio;
uniform float uTiempo;
uniform float uGiro;
uniform float uHundir;
uniform float uOscuro;
uniform float uInclinacion;
varying vec2 outTexCoord;

void main() {
  vec2 px = vec2(outTexCoord.x, 1.0 - outTexCoord.y) * uResolucion;
  vec2 d = px - uCentro;
  d.y /= uInclinacion; // el hoyo inclinado es un óvalo: se trabaja "desaplastado"
  float dist = length(d);
  if (dist >= uRadio) {
    gl_FragColor = texture2D(uMainSampler, outTexCoord);
    return;
  }
  float t = 1.0 - dist / uRadio;
  float t2 = t * t;
  float ang = uGiro * t2 * (1.0 + 0.2 * sin(uTiempo * 2.3));
  float s = sin(ang);
  float c = cos(ang);
  vec2 r = vec2(c * d.x - s * d.y, s * d.x + c * d.y) * (1.0 + uHundir * t2);
  r.y *= uInclinacion;
  vec2 src = uCentro + r;
  vec4 color = texture2D(uMainSampler, vec2(src.x / uResolucion.x, 1.0 - src.y / uResolucion.y));
  color.rgb *= 1.0 - uOscuro * t2;
  gl_FragColor = color;
}
`;

export const CLAVE_DISTORSION = "DistorsionFX";

/** Distorsión del piso alrededor del hoyo. Los valores se cambian cada cuadro desde la escena. */
export class DistorsionFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  /** Centro del hoyo en píxeles de pantalla (arriba a la izquierda = 0,0). */
  centro = { x: 0, y: 0 };
  radio = 100;
  giro = 1;
  hundir = 0.3;
  oscuro = 0.25;
  inclinacion = 1;

  constructor(game: Phaser.Game) {
    super({ game, name: CLAVE_DISTORSION, fragShader: FRAG });
  }

  onPreRender(): void {
    this.set2f("uResolucion", this.renderer.width, this.renderer.height);
    this.set2f("uCentro", this.centro.x, this.centro.y);
    this.set1f("uRadio", this.radio);
    this.set1f("uTiempo", this.game.loop.time / 1000);
    this.set1f("uGiro", this.giro);
    this.set1f("uHundir", this.hundir);
    this.set1f("uOscuro", this.oscuro);
    this.set1f("uInclinacion", this.inclinacion);
  }
}

/** Registra el shader una vez (si el juego corre con WebGL). Devuelve false si no se puede. */
export function registrarDistorsion(game: Phaser.Game): boolean {
  if (game.renderer.type !== Phaser.WEBGL) return false;
  const r = game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
  if (!r.pipelines.postPipelineClasses.has(CLAVE_DISTORSION)) r.pipelines.addPostPipeline(CLAVE_DISTORSION, DistorsionFX);
  return true;
}
