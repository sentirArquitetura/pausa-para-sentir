import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { ViewportScroller, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { Backend } from './core/backend';
import { LocalBackend } from './core/local-backend';
import { SiteStore } from './core/site-store';
import { SupabaseBackend } from './core/supabase-backend';

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: Backend, useClass: environment.supabaseUrl ? SupabaseBackend : LocalBackend },
    provideAppInitializer(() => {
      // Ao pular para uma âncora (#loja, #kit…), desconta o cabeçalho fixo e um respiro.
      inject(ViewportScroller).setOffset(() => {
        const header = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 72;
        return [0, Math.max(0, header) + 16];
      });
      const backend = inject(Backend);
      const store = inject(SiteStore);
      return Promise.all([backend.ready(), store.load()]).then(() => undefined);
    }),
  ],
};
