import type { Object as FabricObject } from "fabric";

declare module "fabric" {
  interface Object {
    layerLabel?: string;
    erasable?: boolean;
  }
}
