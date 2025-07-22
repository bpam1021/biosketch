import * as fabric from "fabric";

let _layerLabelPatched = false;

if (!_layerLabelPatched) {
  fabric.Object.prototype.toObject = (function (toObject) {
    return function (this: fabric.Object, propertiesToInclude: string[] = []) {
      propertiesToInclude = [...(propertiesToInclude || []), "layerLabel"];
      return toObject.call(this, propertiesToInclude);
    };
  })(fabric.Object.prototype.toObject);
  _layerLabelPatched = true;
}
