import "./ui.css";

import OBR, {
  buildCurve,
  isImage,
  type Item,
  type Vector2
} from "@owlbear-rodeo/sdk";
import { getTrailColor, mountColorPicker } from "./ui";

const EXTENSION_ID = "com.owlbear.trail";
const CURVE_LAYER = "DRAWING";
const INACTIVITY_MS = 320;
const STROKE_WIDTH = 4;
const STROKE_OPACITY = 0.9;

const dragPoints = new Map<string, Vector2[]>();
const lastTrailId = new Map<string, string>();
const debounceTimers = new Map<string, number>();
const lastPositions = new Map<string, Vector2>();

mountColorPicker();

function hasMoved(prev: Vector2 | undefined, next: Vector2 | undefined): next is Vector2 {
  if (!next) return false;
  if (!prev) return true;
  return prev.x !== next.x || prev.y !== next.y;
}

function cloneVector(point: Vector2): Vector2 {
  return { x: point.x, y: point.y };
}

function scheduleFinalize(tokenId: string) {
  const existing = debounceTimers.get(tokenId);
  if (existing !== undefined) {
    window.clearTimeout(existing);
  }
  const handle = window.setTimeout(() => {
    debounceTimers.delete(tokenId);
    finalizeTrail(tokenId).catch((error) => console.error("Failed to finalize trail", error));
  }, INACTIVITY_MS);
  debounceTimers.set(tokenId, handle);
}

async function finalizeTrail(tokenId: string) {
  const points = dragPoints.get(tokenId);
  if (!points || points.length < 2) {
    dragPoints.delete(tokenId);
    return;
  }

  const color = getTrailColor();
  const curve = buildCurve()
    .layer(CURVE_LAYER)
    .points(points)
    .strokeColor(color)
    .strokeWidth(STROKE_WIDTH)
    .strokeOpacity(STROKE_OPACITY)
    .metadata({
      [EXTENSION_ID]: {
        trailOf: tokenId
      }
    })
    .build();

  try {
    const [created] = await OBR.scene.items.addItems([curve]);
    if (created?.id) {
      lastTrailId.set(tokenId, created.id);
    }
  } catch (error) {
    console.error("Failed to add trail", error);
  } finally {
    dragPoints.delete(tokenId);
  }
}

async function removePreviousTrail(tokenId: string) {
  const existingId = lastTrailId.get(tokenId);
  if (!existingId) return;
  try {
    await OBR.scene.items.deleteItems([existingId]);
  } catch (error) {
    console.warn("Failed to remove previous trail", error);
  }
  lastTrailId.delete(tokenId);
}

function ensureTrailBuffer(tokenId: string, startPosition?: Vector2) {
  if (!dragPoints.has(tokenId)) {
    dragPoints.set(tokenId, []);
    if (startPosition) {
      pushPoint(tokenId, startPosition);
    }
  }
}

function pushPoint(tokenId: string, position: Vector2) {
  const points = dragPoints.get(tokenId);
  if (!points) {
    dragPoints.set(tokenId, [cloneVector(position)]);
    return;
  }
  const last = points[points.length - 1];
  if (!last || last.x !== position.x || last.y !== position.y) {
    points.push(cloneVector(position));
  }
}

function trackTokenMovement(token: Item) {
  if (!isImage(token) || token.layer !== "CHARACTER") return;

  const previous = lastPositions.get(token.id);
  if (!hasMoved(previous, token.position)) {
    if (!previous && token.position) {
      lastPositions.set(token.id, cloneVector(token.position));
    }
    return;
  }

  if (!dragPoints.has(token.id)) {
    void removePreviousTrail(token.id);
    ensureTrailBuffer(token.id, previous ?? token.position);
  }

  pushPoint(token.id, token.position);
  lastPositions.set(token.id, cloneVector(token.position));
  scheduleFinalize(token.id);
}

function recordLastPosition(token: Item) {
  if (!isImage(token) || token.layer !== "CHARACTER") return;
  if (!lastPositions.has(token.id)) {
    lastPositions.set(token.id, cloneVector(token.position));
  }
}

OBR.onReady(() => {
  console.log(`${EXTENSION_ID} ready`);

  OBR.scene.items.getItems().then((items) => {
    items.forEach(recordLastPosition);
  });

  OBR.scene.items.onChange((items) => {
    items.forEach((item) => {
      trackTokenMovement(item);
      recordLastPosition(item);
    });
  });
});
