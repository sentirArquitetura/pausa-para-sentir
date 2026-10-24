import { Component, input } from '@angular/core';

/**
 * A vela do ritual: chama que dança, halo de luz, fumaça subindo,
 * ondas (som/água) e o círculo da respiração guiada.
 */
@Component({
  selector: 'app-ritual-candle',
  templateUrl: './ritual-candle.html',
  styleUrl: './ritual-candle.scss',
  host: {
    '[style.--tint]': 'tint()',
    '[style.--smoke]': 'smoke()',
  },
})
export class RitualCandle {
  /** Cor (r, g, b) que tinge o halo conforme o sentido. */
  readonly tint = input('232, 180, 166');
  /** Intensidade da fumaça (0–1). */
  readonly smoke = input(0.3);
  readonly waves = input(false);
  readonly breath = input<'in' | 'out' | null>(null);
}
