import { TaskGroup, TaskItem } from "../model/task";
import { BoardHost } from "./board-host";

const EDGE = 60;
const SPEED = 12;

export class DragController {
  private dragged: TaskItem | null = null;
  private marked: HTMLElement | null = null;
  private scroller: HTMLElement | null = null;
  private frame: number | null = null;
  private pointerY = 0;

  constructor(private readonly host: BoardHost) {}

  attachRow(element: HTMLElement, group: TaskGroup, index: number, task: TaskItem): void {
    element.draggable = true;

    element.addEventListener("dragstart", (event) => {
      this.dragged = task;
      element.addClass("is-dragging");
      event.dataTransfer?.setData("text/plain", task.file.path);
      if (event.dataTransfer !== null) event.dataTransfer.effectAllowed = "move";
      this.startScrolling(element);
    });

    element.addEventListener("dragend", () => {
      element.removeClass("is-dragging");
      this.reset();
    });

    element.addEventListener("dragover", (event) => {
      if (this.dragged === null) return;
      event.preventDefault();
      event.stopPropagation();

      const rect = element.getBoundingClientRect();
      const after = event.clientY > rect.top + rect.height / 2;
      this.mark(element, after ? "drop-after" : "drop-before");
    });

    element.addEventListener("drop", (event) => {
      const dragged = this.dragged;
      if (dragged === null) return;
      event.preventDefault();
      event.stopPropagation();

      const rect = element.getBoundingClientRect();
      const after = event.clientY > rect.top + rect.height / 2;
      this.clearMark();
      this.dragged = null;
      this.host.moveTask(dragged, group, index + (after ? 1 : 0));
    });
  }

  attachGroup(element: HTMLElement, group: TaskGroup, index: number): void {
    element.addEventListener("dragover", (event) => {
      if (this.dragged === null) return;
      event.preventDefault();
      this.mark(element, "tl-drop-zone");
    });

    element.addEventListener("dragleave", () => {
      if (this.marked === element) this.clearMark();
    });

    element.addEventListener("drop", (event) => {
      const dragged = this.dragged;
      if (dragged === null) return;
      event.preventDefault();
      this.clearMark();
      this.dragged = null;
      this.host.moveTask(dragged, group, index);
    });
  }

  private mark(element: HTMLElement, cls: string): void {
    if (this.marked === element && element.hasClass(cls)) return;
    this.clearMark();
    element.addClass(cls);
    this.marked = element;
  }

  private clearMark(): void {
    if (this.marked === null) return;
    this.marked.removeClasses(["drop-before", "drop-after", "tl-drop-zone"]);
    this.marked = null;
  }

  private startScrolling(element: HTMLElement): void {
    // A full tab scrolls the frame; a note scrolls the editor.
    this.scroller = element.closest<HTMLElement>(
      ".tl-view .tl-frame, .markdown-preview-view, .cm-scroller"
    );
    if (this.scroller === null) return;

    this.pointerY = 0;
    document.addEventListener("dragover", this.trackPointer, true);
    this.frame = window.requestAnimationFrame(this.scrollStep);
  }

  private trackPointer = (event: DragEvent): void => {
    this.pointerY = event.clientY;
  };

  private scrollStep = (): void => {
    const scroller = this.scroller;
    if (scroller === null) return;

    const rect = scroller.getBoundingClientRect();
    if (this.pointerY > 0) {
      if (this.pointerY - rect.top < EDGE) scroller.scrollBy(0, -SPEED);
      else if (rect.bottom - this.pointerY < EDGE) scroller.scrollBy(0, SPEED);
    }
    this.frame = window.requestAnimationFrame(this.scrollStep);
  };

  private reset(): void {
    this.dragged = null;
    this.clearMark();
    document.removeEventListener("dragover", this.trackPointer, true);
    if (this.frame !== null) window.cancelAnimationFrame(this.frame);
    this.frame = null;
    this.scroller = null;
  }

  destroy(): void {
    this.reset();
  }
}
