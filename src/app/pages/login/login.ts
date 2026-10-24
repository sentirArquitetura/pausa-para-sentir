import { Component, inject, input, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { PASSWORD_MIN_LENGTH, normalizeUsername, usernameError } from '../../core/models';
import { SiteStore } from '../../core/site-store';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly store = inject(SiteStore);
  private readonly router = inject(Router);

  /** Para onde voltar depois do login (query param ?voltar=). */
  readonly voltar = input<string>();

  protected readonly minLength = PASSWORD_MIN_LENGTH;
  protected readonly tab = signal<'entrar' | 'criar'>('entrar');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly showPassword = signal(false);

  protected readonly form = { username: '', password: '' };

  protected switchTab(tab: 'entrar' | 'criar'): void {
    this.tab.set(tab);
    this.error.set('');
  }

  protected async submit(f: NgForm): Promise<void> {
    if (f.invalid) return;
    const creating = this.tab() === 'criar';
    if (creating) {
      const problem = usernameError(normalizeUsername(this.form.username));
      if (problem) return this.error.set(problem);
      if (this.form.password.length < PASSWORD_MIN_LENGTH) {
        return this.error.set(`A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`);
      }
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const user = creating
        ? await this.store.signUp(this.form.username, this.form.password)
        : await this.store.signIn(this.form.username, this.form.password);
      const fallback = user.isAdmin ? '/admin' : creating ? '/comprar' : '/';
      this.router.navigateByUrl(this.voltar() || fallback);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
