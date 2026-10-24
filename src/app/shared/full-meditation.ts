import { Component, computed, inject, input, signal } from '@angular/core';
import { AmbientSound } from '../core/ambient-sound';
import { Backend } from '../core/backend';
import { SiteStore } from '../core/site-store';
import { MeditationPlayer } from '../pages/home/senses/meditation-player';

/**
 * "Ouvir a meditação completa": aparece só para clientes liberados (e quando o admin já enviou o áudio).
 * Pede um link temporário ao servidor e toca no mesmo player da meditação do ritual.
 */
@Component({
  selector: 'app-full-meditation',
  imports: [MeditationPlayer],
  host: { '[class.dark]': "tone() === 'dark'" },
  template: `
    @if (available()) {
      @if (playingThis()) {
        <!-- No ritual, o player já aparece junto ao "Viver o ritual" -->
        @if (tone() === 'light') {
          <app-meditation-player [light]="true" />
        }
      } @else {
        <button type="button" class="listen" (click)="play()" [disabled]="loading()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>
          {{ loading() ? 'Preparando…' : 'Ouvir a meditação completa' }}
        </button>
      }
      @if (error()) {
        <p class="err">{{ error() }}</p>
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .listen {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.7em 1.4em;
      border-radius: 999px;
      border: 1px solid var(--oliva);
      background: var(--oliva);
      color: var(--creme);
      font-family: 'Italiana', var(--serif);
      font-size: 0.9rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      cursor: pointer;
      svg {
        width: 16px;
        height: 16px;
        fill: currentColor;
      }
    }
    :host(.dark) .listen {
      border-color: rgba(232, 180, 166, 0.55);
      background: rgba(232, 180, 166, 0.1);
    }
    .err {
      margin: 0.5rem 0 0;
      font-size: 0.85rem;
      color: var(--terracota);
    }
    :host(.dark) .err {
      color: var(--blush);
    }
  `,
})
export class FullMeditation {
  private readonly store = inject(SiteStore);
  private readonly backend = inject(Backend);
  private readonly sound = inject(AmbientSound);

  /** 'dark' sobre o céu/mar do ritual; 'light' nas páginas claras. */
  readonly tone = input<'light' | 'dark'>('light');

  private readonly med = computed(() => this.store.content().senses.meditation);
  protected readonly available = computed(() => !!this.store.user()?.fullMeditation && !!this.med().fullAudio);
  protected readonly playingThis = computed(() => this.sound.meditation() === this.title());
  private readonly title = computed(() => this.med().fullTitle || 'Meditação guiada completa');
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  protected async play(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const url = await this.backend.fullMeditationUrl(this.med().fullAudio);
      this.sound.playMeditation(url, this.title(), 0);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
}
