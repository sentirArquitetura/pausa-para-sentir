import { Component, inject } from '@angular/core';
import { AmbientSound, SOUNDS, SOUND_GROUPS, SoundGroup, SoundId } from '../../../core/ambient-sound';

@Component({
  selector: 'app-sound-mixer',
  template: `
    <div class="mixer">
      @for (g of groups; track g.id) {
        <section class="grp grp-{{ g.id }}">
        <p class="group">{{ g.label }}</p>
        <div class="chips" [class.tones]="g.id !== 'natureza'">
          @for (s of byGroup(g.id); track s.id) {
            <button
              type="button"
              class="chip"
              [class.on]="sound.isOn(s.id)"
              [attr.aria-pressed]="sound.isOn(s.id)"
              [title]="s.hint"
              (click)="sound.toggle(s.id)"
            >
              <span class="eq" [class.on]="sound.isOn(s.id)" aria-hidden="true"><i></i><i></i><i></i></span>
              <span class="txt">
                {{ s.label }}
                @if (g.id !== 'natureza') {
                  <small>{{ s.hint }}</small>
                }
              </span>
            </button>
          }
        </div>
        @if (g.note) {
          <p class="group-note">{{ g.note }}</p>
        }
        </section>
      }

      @if (sound.active().length) {
        <div class="vols">

          @for (id of sound.active(); track id) {
        <label class="vol">
          <span>{{ label(id) }}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            [value]="sound.volumes()[id]"
            (input)="sound.setVolume(id, +$any($event.target).value)"
          />
        </label>
          }
        </div>
      }

      <p class="note">Sons criados ao vivo no seu navegador. Combine à vontade — durante a meditação, eles ficam mais baixinhos, como fundo.</p>
    </div>
  `,
  styles: `
    .mixer {
      padding-top: 0.5rem;
    }
    // Tela larga: Natureza + Binaurais à esquerda, Frequências à direita; volumes embaixo.
    @media (min-width: 900px) {
      .mixer {
        display: grid;
        grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.4fr);
        grid-template-areas: 'nat freq' 'bin freq' 'vols vols' 'note note';
        column-gap: 2.2rem;
        align-items: start;
      }
      .grp-natureza {
        grid-area: nat;
      }
      .grp-binaural {
        grid-area: bin;
      }
      .grp-frequencia {
        grid-area: freq;
      }
      .vols {
        grid-area: vols;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        column-gap: 2rem;
      }
      .note {
        grid-area: note;
      }
    }
    .group {
      margin: 0.9rem 0 0.5rem;
      font-size: 0.7rem;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: rgba(239, 232, 221, 0.55);
    }
    .group-note {
      margin: 0.45rem 0 0;
      font-size: 0.76rem;
      color: rgba(239, 232, 221, 0.45);
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    // Frequências: grade de cartões pequenos com nome e objetivo.
    .chips.tones {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      .chip {
        border-radius: 12px;
        padding: 0.5em 0.8em;
        align-items: flex-start;
        text-align: left;
      }
      .eq {
        margin-top: 0.3em;
      }
    }
    .txt {
      display: flex;
      flex-direction: column;
      line-height: 1.25;
      small {
        font-size: 0.74rem;
        color: rgba(239, 232, 221, 0.6);
      }
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.5em 1.05em;
      border-radius: 999px;
      border: 1px solid rgba(239, 232, 221, 0.25);
      background: rgba(239, 232, 221, 0.04);
      color: rgba(239, 232, 221, 0.82);
      font: inherit;
      font-size: 0.86rem;
      cursor: pointer;
      transition:
        background 0.3s,
        border-color 0.3s,
        color 0.3s;
      &:hover {
        border-color: rgba(232, 180, 166, 0.6);
        color: var(--creme);
      }
      &.on {
        background: rgba(232, 180, 166, 0.16);
        border-color: var(--blush);
        color: #fff;
      }
      &:focus-visible {
        outline: 2px solid var(--blush);
        outline-offset: 2px;
      }
    }
    .vol {
      display: grid;
      grid-template-columns: 9rem 1fr;
      align-items: center;
      gap: 1rem;
      margin-top: 0.9rem;
      font-size: 0.8rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(239, 232, 221, 0.7);
      animation: fade-in 0.6s ease both;
      input {
        padding: 0;
        border: 0;
        background: none;
        box-shadow: none;
        accent-color: var(--blush);
      }
    }
    .note {
      margin: 1.1rem 0 0;
      font-size: 0.82rem;
      color: rgba(239, 232, 221, 0.55);
    }
    @keyframes fade-in {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
    }
  `,
})
export class SoundMixer {
  protected readonly sound = inject(AmbientSound);
  protected readonly groups = SOUND_GROUPS;

  protected byGroup(group: SoundGroup) {
    return SOUNDS.filter((s) => s.group === group);
  }

  protected label(id: SoundId): string {
    return SOUNDS.find((s) => s.id === id)!.label;
  }
}
