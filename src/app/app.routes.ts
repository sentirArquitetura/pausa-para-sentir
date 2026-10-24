import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/guards';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home').then((m) => m.Home) },
  {
    path: 'entrar',
    title: 'Entrar · Pausa para Sentir',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'sacola',
    title: 'Sacola · Pausa para Sentir',
    loadComponent: () => import('./pages/bag/bag').then((m) => m.Bag),
  },
  {
    path: 'comprar',
    title: 'Comprar · Pausa para Sentir',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/checkout/checkout').then((m) => m.Checkout),
  },
  {
    path: 'meus-pedidos',
    title: 'Meus pedidos · Pausa para Sentir',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/my-orders/my-orders').then((m) => m.MyOrders),
  },
  {
    path: 'meus-pedidos/:id',
    title: 'Pedido · Pausa para Sentir',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/order-detail/order-detail').then((m) => m.OrderDetail),
  },
  {
    path: 'admin',
    title: 'Pedidos · Administração',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin-orders/admin-orders').then((m) => m.AdminOrders),
  },
  {
    path: 'admin/produtos',
    title: 'Produtos e kits · Administração',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin-catalog/admin-catalog').then((m) => m.AdminCatalog),
  },
  {
    path: 'admin/configuracoes',
    title: 'Configurações · Administração',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin-settings/admin-settings').then((m) => m.AdminSettings),
  },
  { path: '**', redirectTo: '' },
];
