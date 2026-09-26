import { SCENE_HEIGHT, SCENE_WIDTH } from "./layout";

/** Grass under everything. */
export function Ground() {
  return <rect width={SCENE_WIDTH} height={SCENE_HEIGHT} fill="#79a64a" />;
}
