// PROTOTYPE (lab). Fit and orientation rules shared by the v2 scene and the lab page.
//
// Two separate questions:
//  1. Does a part physically fit a case at all?  -> fitProblem (reuses the site's own fitsInCase rules,
//     the same ones /build uses to filter its pickers, plus a human-readable reason for the lab UI).
//  2. How should a GPU be mounted in this case? -> gpuMountFor: vertical (riser) for cases that are built
//     that way (the site's own list, e.g. NZXT H1 V2), for very small cases, and for a card that is too
//     long to lie flat in the case but does fit standing up. The 3D scene applies the same geometric
//     rule internally (see effectiveGpuVertical in scene-v2.ts) so a page never has to remember it.
import { caseHasVerticalGpuMount, fitsInCase, type Category, type Component } from '@/lib/component-db-seed';
import type { RadiatorMount } from './layout';

export { caseHasVerticalGpuMount, fitsInCase };

// Clearance kept between a card and the case walls when judging whether it fits, in mm.
const GPU_WALL_CLEARANCE_MM = 45;
// At or below this interior depth a case is treated as "very small" (SFF-class): no horizontal mounts.
const TINY_CASE_DEPTH_MM = 170;

export function fitProblem(category: Category, comp: Component, caseComp: Component | undefined): string | null {
  if (!caseComp || fitsInCase(category, comp, caseComp)) return null;
  if (category === 'gpu') return `${comp.gpuLengthMm} mm card, case takes ${caseComp.maxGpuLengthMm} mm`;
  if (category === 'cooler') {
    return comp.coolerRadiatorMm
      ? `${comp.coolerRadiatorMm} mm radiator, case takes ${caseComp.maxRadiatorMm} mm`
      : `${comp.coolerHeightMm} mm tower, case takes ${caseComp.maxCoolerHeightMm} mm`;
  }
  if (category === 'psu') return `${comp.psuLengthMm} mm PSU, case takes ${caseComp.maxPsuLengthMm} mm`;
  if (category === 'mobo') return `${comp.formFactor ?? 'board'} doesn't fit a ${caseComp.category ?? 'this'} case`;
  return 'does not fit';
}

// Where this case lets an AIO radiator stand, in order of preference. Driven purely by the case's own fan mounts, so
// new cases of any layout work without code: a front mount that can hold the radiator's fans wins (the radiator takes
// the front fans' place); otherwise a side mount (the fan column beside the board, e.g. Cooler Master Elite 600, Lian Li
// O11D), where the radiator replaces those fans; otherwise today's default (front, then the roof as a fallback in layout.ts).
export function radiatorMountsFor(caseComp: Component | undefined, radiatorMm: number): RadiatorMount[] {
  const mounts = caseComp?.fanMounts ?? [];
  const need = Math.max(1, Math.round(radiatorMm / 120));
  const holds = (position: string) => mounts.some((m) => m.position === position && m.maxCount >= need);
  if (holds('front')) return ['front'];
  if (holds('side')) return ['side'];
  return ['front'];
}

export function gpuMountFor(caseComp: Component | undefined, gpuComp: Component | undefined): 'horizontal' | 'vertical' {
  if (!caseComp) return 'horizontal';
  if (caseHasVerticalGpuMount(caseComp.name)) return 'vertical';
  const depth = caseComp.caseDepthMm;
  const height = caseComp.caseHeightMm;
  if (depth && depth <= TINY_CASE_DEPTH_MM) return 'vertical';
  const len = gpuComp?.gpuLengthMm;
  if (len && depth && height) {
    const horizontalFits = len <= (caseComp.maxGpuLengthMm ?? depth - GPU_WALL_CLEARANCE_MM);
    const verticalFits = len <= height - 2 * GPU_WALL_CLEARANCE_MM;
    if (!horizontalFits && verticalFits) return 'vertical';
  }
  return 'horizontal';
}
