import { Component, inject } from '@angular/core';
import { AmbientSound, SOUNDS, SoundId } from '../../../core/ambient-sound';

@Component({
  selector: 'app-sound-mixer',
  template: `
    <div class="mixer">
      <div class="chips">
        @for (s of sounds; track s.id) {
          <button
            type="button"
            class="chip"
            [class.on]="sound.isOn(s.id)"
            [attr.aria-pressed]="sound.isOn(s.id)"
            [title]="s.hint"
            (click)="sound.toggle(s.id)"
          >
            <span class="eq" [class.on]="sound.isOn(s.id)" aria-hidden="true"><i></i><i></i><i></i></span>
            {{ s.label }}
          </button>
        }
      </div>

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

      <p class="note">Sons criados ao vivo no seu navegador. Combine à vontade — durante a meditação, eles ficam mais baixinhos, como fundo.</p>
    </div>
  `,
  styles: `
    .mixer {
      padding-top: 0.9rem;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
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
  protected readonly sounds = SOUNDS;

  protected label(id: SoundId): string {
    return SOUNDS.find((s) => s.id === id)!.label;
  }
}
