import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  text: string;
  /** Link opcional (ex.: "Ver sacola"). */
  link?: { label: string; url: string };
}

/** Avisos curtos no canto da tela (saudação, item adicionado à sacola…). */
@Injectable({ providedIn: 'root' })
export class Toast {
  readonly current = signal<ToastMessage | null>(null);
  private nextId = 0;
  private timer = 0;

  show(text: string, link?: ToastMessage['link'], ms = 4200): void {
    clearTimeout(this.timer);
    this.current.set({ id: ++this.nextId, text, link });
    this.timer = window.setTimeout(() => this.current.set(null), ms);
  }

  dismiss(): void {
    clearTimeout(this.timer);
    this.current.set(null);
  }
}
