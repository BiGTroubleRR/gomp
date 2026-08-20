'use client';

import { useEffect, useRef } from 'react';
import { createBuildScene, type CompId } from '@/lib/build-scene';
import type { Component } from '@/lib/component-db-seed';

export type CompDb = Partial<Record<CompId, Component[]>>;

type Config = {
  selected: Partial<Record<string, boolean>>;
  selections: Partial<Record<string, string>>;
  compDb: CompDb;
};

// Renders the saved build using the exact same engine as the Build page's live configurator
// (build-scene.ts's createBuildScene + applyBuildSnapshot) instead of a separate simplified
// stand-in, so what the customer sees at checkout matches what they actually assembled. Wired
// up once from a finished snapshot rather than driven incrementally — checkout has no per-part
// UI to call toggleComponent/setSizeScale/etc. as the user picks things, it just has the final
// (selected, selections, compDb) state to render as-is.
export default function Case3DViewer({ config }: { config: Config | null }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !config) return;

    const scene = createBuildScene(container);
    scene.applyBuildSnapshot(config.compDb, config.selected, config.selections);

    return () => {
      scene.dispose();
    };
  }, [config]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} />;
}
