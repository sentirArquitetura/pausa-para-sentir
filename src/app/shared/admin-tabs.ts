import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-admin-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="admin-tabs">
      <a routerLink="/admin" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">Pedidos</a>
      <a routerLink="/admin/produtos" routerLinkActive="on">Produtos e kits</a>
      <a routerLink="/admin/vitrine" routerLinkActive="on">Seções da vitrine</a>
      <a routerLink="/admin/configuracoes" routerLinkActive="on">Configurações</a>
      <a routerLink="/">Vitrine</a>
    </nav>
  `,
  styles: `
    .admin-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0 2rem;
      border-bottom: 1px solid var(--linha);
      margin-bottom: 2rem;
      font-size: 0.78rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
    }
    a {
      padding: 0.8rem 0;
      text-decoration: none;
      color: var(--tinta-suave);
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }
    a.on,
    a:hover {
      color: var(--oliva);
      border-bottom-color: var(--terracota);
    }
  `,
})
export class AdminTabs {}
