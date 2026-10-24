/**
 * "Modo leve" para celulares e aparelhos mais simples: tira os efeitos que mais pesam
 * (ruído animado nas fumaças, mais fios, mais beija-flores), mantendo a cena.
 */
export const LITE =
  typeof matchMedia !== 'undefined' &&
  (matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency ?? 8) <= 4);
