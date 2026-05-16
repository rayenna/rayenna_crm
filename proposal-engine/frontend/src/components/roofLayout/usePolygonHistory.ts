import { useCallback, useRef, useState } from 'react';

export type PolygonPoint = { x: number; y: number };

const MAX_HISTORY = 50;

function clonePolygon(pts: PolygonPoint[]): PolygonPoint[] {
  return pts.map((p) => ({ x: p.x, y: p.y }));
}

function polygonsEqual(a: PolygonPoint[], b: PolygonPoint[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((p, i) => p.x === b[i]!.x && p.y === b[i]!.y);
}

export function usePolygonHistory() {
  const pastRef = useRef<PolygonPoint[][]>([]);
  const futureRef = useRef<PolygonPoint[][]>([]);
  const [revision, setRevision] = useState(0);

  const bump = useCallback(() => setRevision((r) => r + 1), []);

  const resetHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    bump();
  }, [bump]);

  const recordSnapshot = useCallback(
    (current: PolygonPoint[] | null) => {
      if (!current || current.length < 3) return;
      pastRef.current.push(clonePolygon(current));
      if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
      futureRef.current = [];
      bump();
    },
    [bump],
  );

  const commitChange = useCallback(
    (current: PolygonPoint[] | null, next: PolygonPoint[] | null): boolean => {
      if (current && next && current.length >= 3 && next.length >= 3) {
        if (!polygonsEqual(current, next)) {
          recordSnapshot(current);
          return true;
        }
      }
      return false;
    },
    [recordSnapshot],
  );

  const undo = useCallback(
    (current: PolygonPoint[] | null): PolygonPoint[] | null => {
      const prev = pastRef.current.pop();
      if (!prev) return current;
      if (current && current.length >= 3) {
        futureRef.current.push(clonePolygon(current));
      }
      bump();
      return clonePolygon(prev);
    },
    [bump],
  );

  const redo = useCallback(
    (current: PolygonPoint[] | null): PolygonPoint[] | null => {
      const next = futureRef.current.pop();
      if (!next) return current;
      if (current && current.length >= 3) {
        pastRef.current.push(clonePolygon(current));
      }
      bump();
      return clonePolygon(next);
    },
    [bump],
  );

  return {
    resetHistory,
    recordSnapshot,
    commitChange,
    undo,
    redo,
    canUndo: revision >= 0 && pastRef.current.length > 0,
    canRedo: revision >= 0 && futureRef.current.length > 0,
  };
}
