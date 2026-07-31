'use client';

import { useEffect } from 'react';
import { initCursorDust } from '@/lib/cursor-dust';

export default function CursorDustMount() {
  useEffect(() => {
    initCursorDust();
  }, []);
  return null;
}
