import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Backend } from '../../core/backend';
import { Order, UserSummary } from '../../core/models';
import { AdminTabs } from '../../shared/admin-tabs';

interface Row extends UserSummary {
  orders: number;
  paid: number;
}

/** Clientes cadastrados, com a liberação da meditação completa. */
@Component({
  selector: 'app-admin-customers',
  imports: [AdminTabs, DatePipe],
  template: `
    <div class="page">
      <div class="container">
        <p class="eyebrow">Administração</p>
        <h1 class="page-title">Clientes</h1>
        <app-admin-tabs />

        <div class="toolbar">
          <input
            type="search"
            placeholder="Buscar por usuário, nome, e-mail ou celular"
            [value]="search()"
            (input)="search.set($any($event.target).value)"
          />
          <span class="muted">
            {{ visible().length }} cliente(s) · {{ liberados() }} com a meditação completa
          </span>
        </div>

        @if (error()) {
          <p class="alert">{{ error() }}</p>
        }

        @if (loading()) {
          <p class="muted">Carregando…</p>
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contato</th>
                  <th>Cadastro</th>
                  <th class="num">Pedidos</th>
                  <th class="center">Meditação completa</th>
                </tr>
              </thead>
              <tbody>
                @for (u of visible(); track u.id) {
                  <tr>
                    <td>
                      <strong>{{ u.name || '—' }}</strong>
                      <small>usuário {{ u.username }}</small>
                    </td>
                    <td>
                      @if (u.phone) {
                        {{ u.phone }}
                        @if (u.whatsapp) {
                          <span class="tag">WhatsApp</span>
                        }
                        <br />
                      }
                      @if (u.email) {
                        <span class="muted">{{ u.email }}</span>
                      }
                      @if (!u.phone && !u.email) {
                        <span class="muted">—</span>
                      }
                    </td>
                    <td>{{ u.createdAt ? (u.createdAt | date: 'dd/MM/yy') : '—' }}</td>
                    <td class="num">
                      {{ u.orders }}
                      @if (u.paid) {
                        <small class="paid">{{ u.paid }} pago(s)</small>
                      }
                    </td>
                    <td class="center">
                      @if (u.isAdmin) {
                        <span class="muted">admin</span>
                      } @else {
                        <label class="check" [class.busy]="saving() === u.id">
                          <input
                            type="checkbox"
                            [checked]="u.fullMeditation"
                            [disabled]="saving() === u.id"
                            (change)="toggle(u, $any($event.target).checked)"
                            [attr.aria-label]="'Meditação completa para ' + (u.name || u.username)"
                          />
                          <span>{{ u.fullMeditation ? 'Liberada' : 'Bloqueada' }}</span>
                        </label>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="muted center">Nenhum cliente encontrado.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.8rem 1.5rem;
      margin-bottom: 1.2rem;
      input {
        max-width: 420px;
      }
    }
    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--linha);
      border-radius: var(--radius);
      background: #fffdf9;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
    }
    th,
    td {
      padding: 0.8rem 1rem;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid var(--linha);
    }
    th {
      font-size: 0.7rem;
      font-weight: 400;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--tinta-suave);
      white-space: nowrap;
    }
    tbody tr:last-child td {
      border-bottom: 0;
    }
    td strong {
      font-weight: 400;
      font-family: var(--serif);
      font-size: 1.15rem;
      color: var(--oliva);
      display: block;
    }
    td small {
      display: block;
      color: var(--tinta-suave);
      font-size: 0.8rem;
    }
    .num {
      text-align: right;
    }
    .center {
      text-align: center;
    }
    .paid {
      color: var(--oliva) !important;
    }
    .tag {
      display: inline-block;
      margin-left: 0.3rem;
      padding: 0 0.5em;
      border-radius: 999px;
      background: var(--salvia-claro);
      color: var(--oliva);
      font-size: 0.7rem;
    }
    .check {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      input {
        width: 18px;
        height: 18px;
        accent-color: var(--oliva);
      }
      span {
        font-size: 0.85rem;
        color: var(--tinta-suave);
        min-width: 5.5em;
        text-align: left;
      }
      &.busy {
        opacity: 0.5;
      }
    }
  `,
})
export class AdminCustomers implements OnInit {
  private readonly backend = inject(Backend);

  protected readonly rows = signal<Row[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly search = signal('');
  protected readonly saving = signal<string | null>(null);

  protected readonly visible = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.rows().filter(
      (u) => !term || [u.username, u.name, u.email, u.phone].some((v) => v.toLowerCase().includes(term)),
    );
  });
  protected readonly liberados = computed(() => this.rows().filter((u) => u.fullMeditation && !u.isAdmin).length);

  async ngOnInit(): Promise<void> {
    try {
      const [users, orders] = await Promise.all([this.backend.listUsers(), this.backend.allOrders()]);
      const count = (id: string, filter: (o: Order) => boolean = () => true) =>
        orders.filter((o) => o.userId === id && filter(o)).length;
      this.rows.set(
        users.map((u) => ({
          ...u,
          orders: count(u.id),
          paid: count(u.id, (o) => ['pago', 'em_preparacao', 'enviado', 'entregue'].includes(o.status)),
        })),
      );
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  protected async toggle(user: Row, enabled: boolean): Promise<void> {
    this.saving.set(user.id);
    this.error.set('');
    try {
      await this.backend.setFullMeditation(user.id, enabled);
      this.rows.update((list) => list.map((u) => (u.id === user.id ? { ...u, fullMeditation: enabled } : u)));
    } catch (e) {
      this.error.set((e as Error).message);
      // desfaz a marcação visual
      this.rows.update((list) => [...list]);
    } finally {
      this.saving.set(null);
    }
  }
}
