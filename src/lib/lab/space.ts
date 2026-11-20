// The "void" around the configurator: a deep-space backdrop so the PC floats in the universe instead of an empty dark
// box. Everything here is far away and follows the camera (the group is re-centred on it every frame), so it behaves
// like infinitely distant sky: no parallax, never clipped by the camera, never near the PC.
//   - a field of twinkling stars (soft round points, white / blue / warm, a few brand green & gold)
//   - a faint Milky-Way band: a dense, dim ribbon of stars around a tilted great circle
//   - a few big soft nebula clouds (additive radial gradients, brand teal / violet / gold)
//   - one distant banded planet with an atmosphere glow
import * as THREE from 'three';

const STAR_R = 120; // radius of the star shell (camera far plane must be larger)

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function starMaterial(pixelRatio: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPixel: { value: pixelRatio }, uTwinkle: { value: 1 } },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      uniform float uPixel;
      uniform float uTwinkle;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = aColor;
        float tw = 1.0 - uTwinkle * 0.35 * (0.5 + 0.5 * sin(uTime * (0.6 + aPhase * 1.4) + aPhase * 40.0));
        vAlpha = tw;
        gl_PointSize = aSize * uPixel;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = 1.0 - smoothstep(0.18, 0.5, d); // bright core, soft edge (a 2 px sprite must still read as a star)
        gl_FragColor = vec4(vColor, a * vAlpha);
      }`,
  });
}

function starPoints(count: number, pos: (i: number) => THREE.Vector3, size: (i: number) => number, color: (i: number) => THREE.Color, pixelRatio: number) {
  const p = new Float32Array(count * 3);
  const c = new Float32Array(count * 3);
  const s = new Float32Array(count);
  const ph = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const v = pos(i); // may be a shared temp vector: read it right away
    const o = i * 3;
    p[o] = v.x;
    p[o + 1] = v.y;
    p[o + 2] = v.z;
    const col = color(i);
    c[o] = col.r;
    c[o + 1] = col.g;
    c[o + 2] = col.b;
    s[i] = size(i);
    ph[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(c, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(s, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  const pts = new THREE.Points(g, starMaterial(pixelRatio));
  pts.frustumCulled = false;
  return pts;
}

// The two big star fields (15 500 points) ask for a position and a colour per point. Reusing one temp Vector3 / Color for them
// (starPoints copies the numbers out immediately) avoids ~100 000 short-lived allocations while the configurator scene is built.
const tmpV = new THREE.Vector3();
const tmpC = new THREE.Color();
const onSphereTmp = (r = STAR_R) => {
  const u = Math.random() * 2 - 1;
  const t = Math.random() * Math.PI * 2;
  const k = Math.sqrt(1 - u * u);
  return tmpV.set(k * Math.cos(t) * r, u * r, k * Math.sin(t) * r);
};
function starColor(): THREE.Color {
  const r = Math.random();
  if (r < 0.55) return tmpC.setHSL(0.6, 0.15, rand(0.78, 1)); // white-blue
  if (r < 0.78) return tmpC.setHSL(0.58, 0.55, rand(0.7, 0.85)); // blue
  if (r < 0.9) return tmpC.setHSL(0.11, 0.6, rand(0.72, 0.88)); // warm
  if (r < 0.95) return tmpC.set(0x3fae74); // brand green
  return tmpC.set(0xc9a95e); // brand gold
}

// Soft radial gradient used for the nebulae / glows.
function glowTexture(inner: string, outer = 'rgba(0,0,0,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.45, inner.replace(/[\d.]+\)$/, '0.35)'));
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function planetTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d')!;
  const bands = ['#1d3a30', '#27493c', '#173026', '#33594a', '#1f3f33', '#2c4f42', '#142a21'];
  const h = 256 / bands.length;
  bands.forEach((col, i) => {
    g.fillStyle = col;
    g.fillRect(0, i * h, 512, h + 2);
  });
  g.globalAlpha = 0.25;
  for (let i = 0; i < 90; i++) {
    g.fillStyle = Math.random() > 0.5 ? '#6fb596' : '#0c1a14';
    g.fillRect(Math.random() * 512, Math.random() * 256, rand(20, 120), rand(1, 4));
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSpace(pixelRatio = 1) {
  const group = new THREE.Group();
  group.renderOrder = -10;
  const textures: THREE.Texture[] = [];
  const mats: THREE.Material[] = [];

  // 1) the star field
  const stars = starPoints(
    6500,
    () => onSphereTmp(),
    () => (Math.random() < 0.06 ? rand(5, 8) : Math.random() < 0.3 ? rand(3.2, 4.4) : rand(2.2, 3.2)),
    starColor,
    pixelRatio,
  );
  group.add(stars);

  // 2) the Milky-Way band: stars scattered around a tilted great circle, thick in the middle, dim
  const bandNormal = new THREE.Vector3(0.36, 0.3, -0.88).normalize();
  const ref = new THREE.Vector3(1, 0, 0).cross(bandNormal).normalize();
  const ref2 = bandNormal.clone().cross(ref).normalize();
  const band = starPoints(
    9000,
    () => {
      const ang = Math.random() * Math.PI * 2;
      const gauss = (Math.random() + Math.random() + Math.random() - 1.5) * 0.28; // soft thickness
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      return tmpV
        .set(ref.x * ca + ref2.x * sa + bandNormal.x * gauss, ref.y * ca + ref2.y * sa + bandNormal.y * gauss, ref.z * ca + ref2.z * sa + bandNormal.z * gauss)
        .normalize()
        .multiplyScalar(STAR_R * 0.98);
    },
    () => rand(2, 3),
    () => tmpC.setHSL(rand(0.5, 0.68), 0.4, rand(0.55, 0.8)),
    pixelRatio,
  );
  group.add(band);

  // 3) nebula clouds
  const clouds: { dir: THREE.Vector3; color: string; size: number; opacity: number }[] = [
    { dir: new THREE.Vector3(-0.85, -0.05, -0.5), color: 'rgba(31,138,85,0.9)', size: 110, opacity: 0.3 },
    { dir: new THREE.Vector3(-0.55, 0.3, -0.78), color: 'rgba(110,86,200,0.9)', size: 120, opacity: 0.26 },
    { dir: new THREE.Vector3(-0.95, -0.35, -0.1), color: 'rgba(40,120,170,0.9)', size: 90, opacity: 0.22 },
    { dir: new THREE.Vector3(0.2, 0.7, 0.7), color: 'rgba(201,169,94,0.9)', size: 80, opacity: 0.12 },
    { dir: new THREE.Vector3(-0.3, -0.35, 0.9), color: 'rgba(40,120,170,0.9)', size: 100, opacity: 0.14 },
    { dir: new THREE.Vector3(0.9, -0.2, 0.3), color: 'rgba(31,138,85,0.9)', size: 70, opacity: 0.12 },
  ];
  clouds.forEach((cl) => {
    const tex = glowTexture(cl.color);
    textures.push(tex);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: cl.opacity, depthWrite: false, blending: THREE.AdditiveBlending });
    mats.push(mat);
    const sp = new THREE.Sprite(mat);
    sp.position.copy(cl.dir.clone().normalize().multiplyScalar(STAR_R * 0.92));
    sp.scale.setScalar(cl.size);
    group.add(sp);
  });

  // 4) a distant banded planet with an atmosphere glow
  const planetTex = planetTexture();
  textures.push(planetTex);
  const planetDir = new THREE.Vector3(-0.72, 0.08, -0.68).normalize();
  const planet = new THREE.Mesh(new THREE.SphereGeometry(7, 40, 28), new THREE.MeshBasicMaterial({ map: planetTex, depthWrite: false }));
  planet.position.copy(planetDir.clone().multiplyScalar(STAR_R * 0.7));
  planet.rotation.z = 0.35;
  group.add(planet);
  const haloTex = glowTexture('rgba(95,185,138,0.55)');
  textures.push(haloTex);
  const haloMat = new THREE.SpriteMaterial({ map: haloTex, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  mats.push(haloMat);
  const halo = new THREE.Sprite(haloMat);
  halo.position.copy(planet.position);
  halo.scale.setScalar(26);
  group.add(halo);

  const starMats = [stars.material as THREE.ShaderMaterial, band.material as THREE.ShaderMaterial];

  return {
    group,
    // Call every frame: keeps the sky centred on the camera and drives the twinkle / slow drift.
    update(camera: THREE.Camera, t: number, motion: boolean) {
      group.position.copy(camera.position);
      starMats.forEach((m) => {
        m.uniforms.uTime.value = t;
        m.uniforms.uTwinkle.value = motion ? 1 : 0;
      });
      if (motion) {
        stars.rotation.y = t * 0.002;
        band.rotation.y = t * 0.002;
        planet.rotation.y = t * 0.01;
      }
    },
    dispose() {
      textures.forEach((x) => x.dispose());
      mats.forEach((x) => x.dispose());
    },
  };
}
