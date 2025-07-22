import * as fabric from "fabric";

export class SelectionToolManager {
  private canvas: fabric.Canvas;
  private selectionRectangle: fabric.Rect | null = null;
  private lassoPolygon: fabric.Polygon | null = null;
  private polygonPoints: fabric.Point[] = [];

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  // Rectangle selection: Users click and drag to create a selection box
  createRectangleSelector(_callback: (rect: fabric.Rect) => void) {
    this.canvas.on("mouse:down", (e) => {
      const pointer = this.canvas.getPointer(e.e);
      this.selectionRectangle = new fabric.Rect({
        left: pointer.x,
        top: pointer.y,
        width: 0,
        height: 0,
        fill: "rgba(0, 120, 255, 0.2)",
        stroke: "#0078ff",
        strokeWidth: 2,
        selectable: false,
        hasBorders: false,
        hasControls: false,
      });

      this.canvas.add(this.selectionRectangle);
    });

    this.canvas.on("mouse:move", (e) => {
      if (!this.selectionRectangle) return;
      const pointer = this.canvas.getPointer(e.e);
      const width = pointer.x - this.selectionRectangle.left!;
      const height = pointer.y - this.selectionRectangle.top!;
      this.selectionRectangle.set({ width, height });
      this.canvas.renderAll();
    });

    this.canvas.on("mouse:up", () => {
      if (this.selectionRectangle) {
        this.cropImageWithRectangle(this.selectionRectangle);  // Crop image based on the selection
        this.canvas.remove(this.selectionRectangle);
        this.selectionRectangle = null;
      }
    });
  }

  // Crop the image based on the rectangle selection
  private cropImageWithRectangle(rect: fabric.Rect) {
    const activeObject = this.canvas.backgroundImage; // Assuming the image is the background image
    if (!activeObject) return;

    const imgLeft = activeObject.left!;
    const imgTop = activeObject.top!;

    // Get coordinates relative to the image
    const left = rect.left! - imgLeft;
    const top = rect.top! - imgTop;
    const width = rect.width!;
    const height = rect.height!;

    // Create the cropped image from the selected area
    const croppedDataUrl = this.canvas.toDataURL({
      left: left,
      top: top,
      width: width,
      height: height,
      format: "png",
      multiplier: 1,
    });

    // Create a new image object from the cropped data
    fabric.Image.fromURL(croppedDataUrl, {}, (croppedImg: fabric.Image) => {

      croppedImg.set({
        left: rect.left!,
        top: rect.top!,
        selectable: true,
        evented: true,
      });

      // Adding the cropped image to the canvas
      this.canvas.add(croppedImg);
      this.canvas.renderAll();
    });
  }

  // Lasso selection: Users click to add points and form a free selection area
  createLassoSelector(_callback: (polygon: fabric.Polygon) => void) {
    this.canvas.on("mouse:down", (e) => {
      const pointer = this.canvas.getPointer(e.e);
      this.polygonPoints.push(new fabric.Point(pointer.x, pointer.y));

      if (this.polygonPoints.length > 1) {
        this.lassoPolygon = new fabric.Polygon(this.polygonPoints, {
          fill: "rgba(0, 255, 120, 0.2)",
          stroke: "#00cc88",
          strokeWidth: 2,
          selectable: false,
          objectCaching: false,
        });

        this.canvas.add(this.lassoPolygon);
        this.canvas.renderAll();
      }
    });

    this.canvas.on("mouse:move", (e) => {
      if (this.polygonPoints.length > 0) {
        const pointer = this.canvas.getPointer(e.e);
        this.polygonPoints[this.polygonPoints.length - 1] = new fabric.Point(pointer.x, pointer.y);
        const polygon = new fabric.Polygon(this.polygonPoints, {
          fill: "rgba(0, 255, 120, 0.2)",
          stroke: "#00cc88",
          strokeWidth: 2,
          selectable: false,
          objectCaching: false,
        });

        this.canvas.remove(this.lassoPolygon!);
        this.canvas.add(polygon);
        this.canvas.renderAll();
        this.lassoPolygon = polygon;
      }
    });

    this.canvas.on("mouse:up", () => {
      if (this.lassoPolygon) {
        this.selectWithLasso(this.lassoPolygon);
        this.canvas.remove(this.lassoPolygon);
        this.lassoPolygon = null;
        this.polygonPoints = [];
      }
      this.canvas.requestRenderAll();
    });
  }
  public selectWithRectangle(rect: fabric.Rect) {
    const selected = this.canvas.getObjects().filter((obj) =>
      this._intersects(rect, obj)  // Check if object intersects with rectangle
    );

    if (selected.length) {
      const selection = new fabric.ActiveSelection(selected, { canvas: this.canvas });
      this.canvas.setActiveObject(selection);
    }

    this.canvas.requestRenderAll();
  }

  private _intersects(rect: fabric.Rect, obj: fabric.Object) {
    const r = rect.getBoundingRect();
    const o = obj.getBoundingRect();
    return !(r.left > o.left + o.width || r.left + r.width < o.left || r.top > o.top + o.height || r.top + r.height < o.top);
  }
  // Handle selection of objects inside the lasso polygon
  public selectWithLasso(polygon: fabric.Polygon) {
    const selected = this.canvas.getObjects().filter((obj) =>
      this._polygonIntersectsObject(polygon, obj)
    );

    if (selected.length) {
      const selection = new fabric.ActiveSelection(selected, { canvas: this.canvas });
      this.canvas.setActiveObject(selection);
    }

    this.canvas.requestRenderAll();
  }

  // Check if a polygon intersects with an object
  private _polygonIntersectsObject(polygon: fabric.Polygon, obj: fabric.Object) {
    const objBox = obj.getBoundingRect();
    const testPoints = [
      new fabric.Point(objBox.left, objBox.top),
      new fabric.Point(objBox.left + objBox.width, objBox.top),
      new fabric.Point(objBox.left, objBox.top + objBox.height),
      new fabric.Point(objBox.left + objBox.width, objBox.top + objBox.height),
    ];
    const polygonPoints = polygon.points.map((p) => new fabric.Point(p.x, p.y));
    return testPoints.some((pt) => this._pointInPolygon(pt, polygonPoints));
  }

  // Check if a point is inside a polygon using the ray-casting algorithm
  private _pointInPolygon(point: fabric.Point, polygonPoints: fabric.Point[]) {
    let inside = false;
    for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
      const xi = polygonPoints[i].x,
        yi = polygonPoints[i].y;
      const xj = polygonPoints[j].x,
        yj = polygonPoints[j].y;
      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }
}
