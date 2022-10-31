class BaseEvent {
  canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    console.log('listen mousedown and wheel');
    
    // this.canvas.addEventListener('mousedown', this.mousedown);
    // this.canvas.addEventListener('wheel', this.mousezoom);
  }

  mousemove = (e: MouseEvent) => {}

  mousedown = (e: MouseEvent) => {}

  mousedbclick = (e: MouseEvent) => {}

  mouseup = (e: MouseEvent) => {}

  mousezoom = (e: MouseEvent) => {}

  touchstart = (e: TouchEvent) => {}

  touchdbstart = (e: TouchEvent) => {}

  touchmove = (e: TouchEvent) => {}

  touchend = (e: TouchEvent) => {}
}

export default BaseEvent;
