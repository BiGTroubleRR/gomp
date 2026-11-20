// Small pieces shared by the configurator scene (scene-v2.ts): the label font, the 500 ml can used as a size reference, and the
// scene callbacks type. Split out of the old build-scene.ts when that file's legacy scene was deleted.
import * as THREE from 'three';
import { mmToUnits } from '@/lib/build-scene-data';

// Canvas text can't read a CSS variable, so this resolves the site's one typeface (--font-sans, DM Sans via
// next/font in layout.tsx) to its real family list for ctx.font. The page has already used that font by the
// time a scene draws labels, so it is loaded; before that (or outside a page) it falls back to system sans.
export function sceneLabelFont(): string {
  if (typeof document === 'undefined') return 'sans-serif';
  const family = getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim();
  return family ? `${family}, sans-serif` : 'sans-serif';
}

// A real 500ml beverage can (66mm diameter x 168mm tall — Crown Cork's own published spec for
// the standard 16.9oz/500ml can) as a familiar object to gauge every other part's size against.
// Branded "GOMPA COLA" purely as an in-scene joke — deliberately GOMP's own maroon/gold instead
// of copying an actual soft-drink brand's real trade dress, since this ships to a live site.
export const CAN_DIAMETER_MM = 66;
export const CAN_HEIGHT_MM = 168;

function makeCanLabelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0F5C3A';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#C4A35A';
  ctx.fillRect(0, canvas.height * 0.38, canvas.width, canvas.height * 0.1);
  ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.03);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height * 0.24);
  ctx.font = 'italic bold 64px Georgia, serif';
  ctx.fillStyle = '#FDFAF4';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GOMPA', 0, 0);
  ctx.restore();
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height * 0.58);
  // A generic flowing script gives it a fun soda-label feel without tracing any real brand's
  // specific lettering — the exact Coca-Cola script is itself the protected trade dress, not
  // just the wordmark, so this deliberately doesn't reach for that.
  ctx.font = 'bold 92px "Brush Script MT", "Segoe Script", cursive';
  ctx.fillStyle = '#0F5C3A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Cola', 0, 0);
  ctx.restore();
  ctx.font = '600 22px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(253,250,244,0.8)';
  ctx.textAlign = 'center';
  ctx.fillText('500 ml · NET 0.5 L', canvas.width / 2, canvas.height * 0.86);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildCanMesh(): THREE.Group {
  const group = new THREE.Group();
  const radius = mmToUnits(CAN_DIAMETER_MM) / 2;
  const height = mmToUnits(CAN_HEIGHT_MM);
  const bodyGeo = new THREE.CylinderGeometry(radius, radius, height, 32);
  const bodyMat = new THREE.MeshStandardMaterial({ map: makeCanLabelTexture(), roughness: 0.35, metalness: 0.6 });
  group.add(new THREE.Mesh(bodyGeo, bodyMat));
  const capMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.3, metalness: 0.8 });
  const topCap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.96, radius, height * 0.03, 32), capMat);
  topCap.position.y = height / 2;
  group.add(topCap);
  const botCap = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.96, height * 0.03, 32), capMat);
  botCap.position.y = -height / 2;
  group.add(botCap);
  return group;
}

export type SceneCallbacks = {
  onCompletionStart?: () => void;
  onCompletionEnd?: () => void;
  // When true, replaces the default continuous OrbitControls.autoRotate spin with a bounded
  // back-and-forth sway (see the oscillate branch in tick() below) — used by the read-only
  // checkout preview (Case3DViewer.tsx), which wants to show every side of the build without a
  // never-ending one-direction rotation. /build never sets this, so its own continuous auto-rotate
  // is completely unchanged.
  oscillate?: boolean;
};
