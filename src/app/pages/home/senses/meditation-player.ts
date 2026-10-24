import { Component, computed, inject, input } from '@angular/core';
import { AmbientSound } from '../../../core/ambient-sound';

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Player da meditação guiada: botão redondo de pausar/continuar com um anel que
 * mostra o progresso, o tempo decorrido/total e quantos minutos faltam.
 */
@Component({
  selector: 'app-meditation-player',
  host: { '[class.light]': 'light()' },
  template: `
    @if (sound.meditation(); as title) {
      <div class="player" [class.paused]="sound.meditationPaused()">
        <button
          type="button"
          class="play"
          [attr.aria-label]="sound.meditationPaused() ? 'Continuar a meditação' : 'Pausar a meditação'"
          (click)="sound.toggleMeditationPause()"
        >
          <svg class="ring" viewBox="0 0 44 44" aria-hidden="true">
            <circle class="track" cx="22" cy="22" r="20" />
            <circle class="done" cx="22" cy="22" r="20" pathLength="100" [style.stroke-dashoffset]="100 - progress()" />
          </svg>
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
            @if (sound.meditationPaused()) {
              <path d="M8 5.5v13l10.5-6.5z" />
            } @else {
              <path d="M7.5 5h3v14h-3zM13.5 5h3v14h-3z" />
            }
          </svg>
        </button>
        <div class="info">
          <span class="title">{{ title }}</span>
          <span class="time" aria-live="off">
            {{ elapsed() }}
            @if (total()) {
              <span class="sep">/</span> {{ total() }}
              <span class="left">· {{ remaining() }}</span>
            }
          </span>
        </div>
      </div>
    }
  `,
  styles: `
    .player {
      display: inline-flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.35rem 1.1rem 0.35rem 0.35rem;
      border-radius: 999px;
      border: 1px solid rgba(232, 180, 166, 0.35);
      background: rgba(29, 35, 24, 0.45);
      backdrop-filter: blur(6px);
      animation: in 0.6s ease both;
    }
    @keyframes in {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
    }
    .play {
      position: relative;
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      border: 0;
      border-radius: 50%;
      background: rgba(232, 180, 166, 0.12);
      color: var(--creme);
      cursor: pointer;
      transition: background 0.3s;
      &:hover {
        background: rgba(232, 180, 166, 0.24);
      }
      &:focus-visible {
        outline: 2px solid var(--blush);
        outline-offset: 2px;
      }
    }
    .ring {
      position: absolute;
      inset: 0;
      transform: rotate(-90deg);
      circle {
        fill: none;
        stroke-width: 1.6;
      }
      .track {
        stroke: rgba(239, 232, 221, 0.15);
      }
      .done {
        stroke: var(--blush);
        stroke-linecap: round;
        stroke-dasharray: 100;
        transition: stroke-dashoffset 0.3s linear;
      }
    }
    .icon {
      position: relative;
      width: 18px;
      height: 18px;
      fill: currentColor;
    }
    .info {
      display: flex;
      flex-direction: column;
      line-height: 1.25;
      min-width: 0;
    }
    .title {
      font-family: var(--serif);
      font-style: italic;
      font-size: 1rem;
      color: var(--creme);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 22ch;
    }
    .time {
      font-size: 0.78rem;
      letter-spacing: 0.06em;
      font-variant-numeric: tabular-nums;
      color: var(--blush);
    }
    .sep {
      opacity: 0.6;
    }
    .left {
      color: rgba(239, 232, 221, 0.55);
    }
    .paused .title {
      opacity: 0.7;
    }
    // Versão para fundos claros (Meus pedidos).
    :host(.light) {
      .player {
        background: #fffdf9;
        border-color: rgba(58, 69, 48, 0.2);
        backdrop-filter: none;
      }
      .play {
        background: var(--oliva);
        color: var(--creme);
        &:hover {
          background: var(--oliva-escuro);
        }
      }
      .ring .track {
        stroke: rgba(58, 69, 48, 0.15);
      }
      .ring .done {
        stroke: var(--terracota);
      }
      .title {
        color: var(--oliva);
      }
      .time {
        color: var(--terracota);
      }
      .left {
        color: var(--tinta-suave);
      }
    }
  `,
})
export class MeditationPlayer {
  protected readonly sound = inject(AmbientSound);
  /** Cores para fundo claro. */
  readonly light = input(false);

  protected readonly progress = computed(() => {
    const total = this.sound.meditationTotal();
    return total ? Math.min(100, (this.sound.meditationTime() / total) * 100) : 0;
  });
  protected readonly elapsed = computed(() => clock(this.sound.meditationTime()));
  protected readonly total = computed(() => {
    const t = this.sound.meditationTotal();
    return t ? clock(t) : '';
  });
  protected readonly remaining = computed(() => {
    const left = Math.max(0, this.sound.meditationTotal() - this.sound.meditationTime());
    if (left < 60) return 'menos de 1 min';
    const min = Math.ceil(left / 60);
    return `faltam ${min} min`;
  });
}
