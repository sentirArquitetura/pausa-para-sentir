import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Backend } from './backend';

export const authGuard: CanActivateFn = async (_route, state) => {
  const backend = inject(Backend);
  const router = inject(Router);
  await backend.ready();
  return backend.user() ? true : router.createUrlTree(['/entrar'], { queryParams: { voltar: state.url } });
};

export const adminGuard: CanActivateFn = async (_route, state) => {
  const backend = inject(Backend);
  const router = inject(Router);
  await backend.ready();
  const user = backend.user();
  if (user?.isAdmin) return true;
  return user ? router.createUrlTree(['/']) : router.createUrlTree(['/entrar'], { queryParams: { voltar: state.url } });
};
