import { Component, inject, input, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { Backend } from '../../core/backend';
import { SiteStore } from '../../core/site-store';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly backend = inject(Backend);
  private readonly store = inject(SiteStore);
  private readonly router = inject(Router);

  /** Para onde voltar depois do login (query param ?voltar=). */
  readonly voltar = input<string>();

  protected readonly tab = signal<'entrar' | 'criar'>('entrar');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly info = signal('');

  protected readonly signin = { login: '', password: '' };
  protected readonly signup = { name: '', email: '', phone: '', password: '', confirm: '' };

  protected switchTab(tab: 'entrar' | 'criar'): void {
    this.tab.set(tab);
    this.error.set('');
    this.info.set('');
  }

  protected async submitSignIn(form: NgForm): Promise<void> {
    if (form.invalid) return;
    await this.run(async () => {
      const user = await this.store.signIn(this.signin.login, this.signin.password);
      this.router.navigateByUrl(this.voltar() || (user.isAdmin ? '/admin' : '/'));
    });
  }

  protected async submitSignUp(form: NgForm): Promise<void> {
    if (form.invalid) return;
    if (this.signup.password !== this.signup.confirm) {
      this.error.set('As senhas não conferem.');
      return;
    }
    await this.run(async () => {
      const result = await this.backend.signUp(this.signup);
      if (result.loggedIn) {
        this.router.navigateByUrl(this.voltar() || '/comprar');
      } else {
        this.tab.set('entrar');
        this.signin.login = this.signup.email;
        this.info.set('Conta criada! Enviamos um link de confirmação para o seu e-mail. Depois de confirmar, é só entrar.');
      }
    });
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    this.info.set('');
    try {
      await action();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
