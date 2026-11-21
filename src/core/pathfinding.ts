import { Domain, MapPack, NavCell, Point } from './types';

export function isWalkable(cell: NavCell, domain: Domain): boolean {
  if (domain === 'air') return true;
  if (domain === 'land') return cell === 0 || cell === 3;
  if (domain === 'sea') return cell === 1 || cell === 3;
  return false;
}

export function findNearestWalkable(
  map: MapPack,
  gx: number,
  gy: number,
  domain: Domain,
  maxRadius: number
): [number, number] | null {
  const clamp = (v: number, max: number) => Math.max(0, Math.min(max - 1, v));
  const sx = clamp(gx, map.cols);
  const sy = clamp(gy, map.rows);
  if (isWalkable(map.navGrid[sy * map.cols + sx], domain)) return [sx, sy];

  for (let r = 1; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = sx + dx;
        const ny = sy + dy;
        if (nx >= 0 && ny >= 0 && nx < map.cols && ny < map.rows) {
          if (isWalkable(map.navGrid[ny * map.cols + nx], domain)) return [nx, ny];
        }
      }
    }
  }
  return null;
}

export function isPointNearWalkable(map: MapPack, pt: Point, domain: Domain, maxRadius = 2): boolean {
  if (domain === 'air') return true;
  const gx = Math.floor(pt.x / map.cellSize);
  const gy = Math.floor(pt.y / map.cellSize);
  return findNearestWalkable(map, gx, gy, domain, maxRadius) !== null;
}

export function hasLineOfSight(map: MapPack, a: Point, b: Point, domain: Domain): boolean {
  if (domain === 'air') return true;
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const stepSize = Math.max(1.5, map.cellSize * 0.2);
  const steps = Math.max(1, Math.ceil(dist / stepSize));
  const nx = dist > 0.001 ? -(b.y - a.y) / dist : 0;
  const ny = dist > 0.001 ? (b.x - a.x) / dist : 0;
  const pad = domain === 'sea' ? Math.max(4, map.cellSize * 0.62) : Math.min(4, map.cellSize * 0.22);
  const canalPad = domain === 'sea' ? Math.max(1.5, map.cellSize * 0.3) : Math.min(2.5, map.cellSize * 0.16);

  const cellAtGrid = (gx: number, gy: number): NavCell | -1 => {
    if (gx < 0 || gy < 0 || gx >= map.cols || gy >= map.rows) return -1;
    return map.navGrid[gy * map.cols + gx];
  };
  const cellAt = (px: number, py: number): NavCell | -1 =>
    cellAtGrid(Math.floor(px / map.cellSize), Math.floor(py / map.cellSize));

  const checkPt = (px: number, py: number) => {
    const c = cellAt(px, py);
    return c !== -1 && isWalkable(c, domain);
  };

  let prevGx = -1;
  let prevGy = -1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const gx = Math.floor(x / map.cellSize);
    const gy = Math.floor(y / map.cellSize);
    const c = cellAtGrid(gx, gy);
    if (c === -1 || !isWalkable(c, domain)) return false;

    // منع قص زوايا اليابسة عند الانتقال القطري بين خليتين متجاورتين
    if (prevGx !== -1 && gx !== prevGx && gy !== prevGy) {
      const c1 = cellAtGrid(gx, prevGy);
      const c2 = cellAtGrid(prevGx, gy);
      if (c1 === -1 || !isWalkable(c1, domain) || c2 === -1 || !isWalkable(c2, domain)) {
        return false;
      }
    }
    prevGx = gx;
    prevGy = gy;

    // هامش أمان جانبي (عريض في البحر المفتوح وضيق داخل القنوات والمضايق cell === 3)
    if (i > 0 && i < steps) {
      const effectivePad = c === 3 ? canalPad : pad;
      if (!checkPt(x + nx * effectivePad, y + ny * effectivePad) || !checkPt(x - nx * effectivePad, y - ny * effectivePad)) {
        return false;
      }
    }
  }
  return true;
}

export function smoothPath(map: MapPack, from: Point, rawPath: Point[], domain: Domain): Point[] {
  if (rawPath.length <= 2 || domain === 'air') return rawPath;
  const out: Point[] = [];
  let anchor = from;
  let i = 0;
  while (i < rawPath.length) {
    let furthest = i;
    for (let j = rawPath.length - 1; j > i; j--) {
      if (hasLineOfSight(map, anchor, rawPath[j], domain)) {
        furthest = j;
        break;
      }
    }
    out.push(rawPath[furthest]);
    anchor = rawPath[furthest];
    i = furthest + 1;
  }
  return out;
}

class MinHeap {
  private data: number[] = [];
  constructor(private score: Float32Array) {}

  get size(): number {
    return this.data.length;
  }

  push(node: number): void {
    this.data.push(node);
    let i = this.data.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.score[this.data[p]] <= this.score[this.data[i]]) break;
      [this.data[p], this.data[i]] = [this.data[i], this.data[p]];
      i = p;
    }
  }

  pop(): number {
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      let i = 0;
      const n = this.data.length;
      while (true) {
        let smallest = i;
        const l = i * 2 + 1;
        const r = l + 1;
        if (l < n && this.score[this.data[l]] < this.score[this.data[smallest]]) smallest = l;
        if (r < n && this.score[this.data[r]] < this.score[this.data[smallest]]) smallest = r;
        if (smallest === i) break;
        [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
        i = smallest;
      }
    }
    return top;
  }
}

export function findPath(map: MapPack, from: Point, to: Point, domain: Domain): Point[] {
  if (domain === 'air') return [{ ...to }];

  const startRaw: [number, number] = [Math.floor(from.x / map.cellSize), Math.floor(from.y / map.cellSize)];
  const endRaw: [number, number] = [Math.floor(to.x / map.cellSize), Math.floor(to.y / map.cellSize)];

  const start = findNearestWalkable(map, startRaw[0], startRaw[1], domain, 4);
  // للهدف: نسمح بالتقاط الساحل القريب جدًا فقط (خليتين)، أما وسط البحر للدبابة فيُرفض!
  const goal = findNearestWalkable(map, endRaw[0], endRaw[1], domain, 2);
  if (!start || !goal) return [];

  const total = map.cols * map.rows;
  const gScore = new Float32Array(total).fill(Infinity);
  const fScore = new Float32Array(total).fill(Infinity);
  const cameFrom = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);
  const inOpen = new Uint8Array(total);
  const heap = new MinHeap(fScore);

  const idx = (x: number, y: number) => y * map.cols + x;
  const sIdx = idx(start[0], start[1]);
  const gIdx = idx(goal[0], goal[1]);

  gScore[sIdx] = 0;
  fScore[sIdx] = Math.hypot(goal[0] - start[0], goal[1] - start[1]);
  heap.push(sIdx);
  inOpen[sIdx] = 1;

  const dirs = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, 1.414],
    [-1, 1, 1.414],
    [1, -1, 1.414],
    [-1, -1, 1.414]
  ];

  while (heap.size > 0) {
    const curr = heap.pop();
    if (curr === gIdx) {
      const pts: Point[] = [];
      let c = curr;
      while (c !== -1 && c !== sIdx) {
        const cx = c % map.cols;
        const cy = Math.floor(c / map.cols);
        pts.push({ x: (cx + 0.5) * map.cellSize, y: (cy + 0.5) * map.cellSize });
        c = cameFrom[c];
      }
      pts.reverse();
      const rawGoalValid =
        endRaw[0] >= 0 &&
        endRaw[0] < map.cols &&
        endRaw[1] >= 0 &&
        endRaw[1] < map.rows &&
        isWalkable(map.navGrid[idx(endRaw[0], endRaw[1])], domain);
      const goalWorld = {
        x: (goal[0] + 0.5) * map.cellSize,
        y: (goal[1] + 0.5) * map.cellSize
      };
      if (pts.length > 0) {
        pts[pts.length - 1] = rawGoalValid ? { ...to } : goalWorld;
      } else {
        pts.push(rawGoalValid ? { ...to } : goalWorld);
      }
      return smoothPath(map, from, pts, domain);
    }

    closed[curr] = 1;
    const cx = curr % map.cols;
    const cy = Math.floor(curr / map.cols);

    for (const [dx, dy, cost] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= map.cols || ny >= map.rows) continue;
      const nIdx = idx(nx, ny);
      const nCell = map.navGrid[nIdx];
      if (closed[nIdx] || !isWalkable(nCell, domain)) continue;
      if (dx !== 0 && dy !== 0) {
        if (!isWalkable(map.navGrid[idx(cx + dx, cy)], domain) || !isWalkable(map.navGrid[idx(cx, cy + dy)], domain)) {
          continue;
        }
      }
      // إبعاد السفن تدريجيًا عن الشواطئ لتبحر في عمق البحر بعيدًا عن حدود الدول
      let coastPenalty = 0;
      if (domain === 'sea' && nCell === 1 && nIdx !== gIdx) {
        for (let oy = -1; oy <= 1 && coastPenalty === 0; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const ax = nx + ox;
            const ay = ny + oy;
            if (ax >= 0 && ay >= 0 && ax < map.cols && ay < map.rows) {
              const adj = map.navGrid[idx(ax, ay)];
              if (adj === 0 || adj === 2) {
                coastPenalty = 2.6;
                break;
              }
            }
          }
        }
      }
      const tentative = gScore[curr] + cost + coastPenalty;
      if (tentative < gScore[nIdx]) {
        cameFrom[nIdx] = curr;
        gScore[nIdx] = tentative;
        fScore[nIdx] = tentative + Math.hypot(goal[0] - nx, goal[1] - ny);
        if (!inOpen[nIdx]) {
          heap.push(nIdx);
          inOpen[nIdx] = 1;
        }
      }
    }
  }

  return []; // لا يوجد مسار متصل (مثلًا بين قارتين عبر البحر)
}
