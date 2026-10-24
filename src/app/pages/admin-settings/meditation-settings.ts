import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Backend } from '../../core/backend';
import { Meditation } from '../../core/models';
import { SiteStore } from '../../core/site-store';

/** Tamanho máximo do arquivo: no modo demonstração ele fica no navegador (pouco espaço). */
const MAX_MB = { supabase: 30, demo: 2.5 };
/** A meditação completa costuma ser mais longa (o Supabase gratuito aceita até 50 MB por arquivo). */
const FULL_MAX_MB = { supabase: 50, demo: 2.5 };

/** Trecho da meditação guiada que toca no "Viver o ritual". */
@Component({
  selector: 'app-meditation-settings',
  imports: [FormsModule],
  template: `
    <section class="card">
      <h2>Meditação do ritual</h2>
      <p class="muted">
        Envie um trecho da meditação guiada (MP3, M4A ou MP4, até {{ maxMb }} MB). De um MP4, só o som é usado. Ele começa quando o visitante toca em
        <strong>“Viver o ritual”</strong> — que pode desligar a voz quando quiser. O áudio entra suave e, no final do
        trecho, o volume desce devagar até o silêncio.
      </p>

      @if (form.audio) {
        <audio class="preview" controls preload="metadata" [src]="form.audio"></audio>
      } @else {
        <p class="empty">Nenhum áudio enviado ainda.</p>
      }

      <div class="row">
        <label class="btn btn-ghost btn-small">
          {{ uploading() ? 'Enviando…' : form.audio ? 'Trocar áudio' : 'Enviar áudio' }}
          <input type="file" accept="audio/*,video/mp4,.mp4,.m4a" hidden [disabled]="uploading()" (change)="upload($event)" />
        </label>
        @if (form.audio) {
          <button type="button" class="link-btn" (click)="remove()">Remover</button>
        }
      </div>

      <label class="field">
        <span>Título</span>
        <input name="medTitle" [(ngModel)]="form.title" placeholder="Meditação para relaxar — Thiago Sousa" />
        <small>Aparece no aviso de som tocando.</small>
      </label>
      <label class="field">
        <span>Tocar só os primeiros (segundos)</span>
        <input name="medMax" type="number" min="0" step="5" [(ngModel)]="form.maxSeconds" />
        <small>0 = o arquivo inteiro. Útil para usar só o começo de um áudio mais longo; o final some devagar.</small>
      </label>

      <h3>Meditação completa</h3>
      <p class="muted">
        Só para clientes liberados (ao aprovar o pagamento de um kit, ou em <strong>Clientes</strong>). O arquivo fica
        num armazenamento privado: ninguém o acessa pelo endereço, e cada cliente liberado recebe um link temporário.
      </p>
      @if (form.fullAudio) {
        <p class="sent">✓ Meditação completa enviada.</p>
      } @else {
        <p class="empty">Nenhuma meditação completa enviada ainda.</p>
      }
      <div class="row">
        <label class="btn btn-ghost btn-small">
          {{ uploadingFull() ? 'Enviando…' : form.fullAudio ? 'Trocar meditação completa' : 'Enviar meditação completa' }}
          <input type="file" accept="audio/*,video/mp4,.mp4,.m4a" hidden [disabled]="uploadingFull()" (change)="upload($event, true)" />
        </label>
        @if (form.fullAudio) {
          <button type="button" class="link-btn" (click)="form = { ...form, fullAudio: '' }">Remover</button>
        }
      </div>
      <label class="field">
        <span>Título da meditação completa</span>
        <input name="medFullTitle" [(ngModel)]="form.fullTitle" placeholder="Meditação para relaxar — completa" />
      </label>

      @if (error()) {
        <p class="alert">{{ error() }}</p>
      }
      <div class="actions">
        @if (message()) {
          <span>{{ message() }} ✓</span>
        }
        <button type="button" class="btn" (click)="save()" [disabled]="saving() || uploading() || uploadingFull()">
          {{ saving() ? 'Salvando…' : 'Salvar meditação' }}
        </button>
      </div>
    </section>
  `,
  styles: `
    h2 {
      font-size: 1.6rem;
    }
    .preview {
      width: 100%;
      margin: 0.4rem 0 0.8rem;
    }
    .empty {
      padding: 0.9rem 1rem;
      border: 1px dashed var(--salvia);
      border-radius: 10px;
      color: var(--tinta-suave);
    }
    .row {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.2rem;
    }
    h3 {
      font-size: 1.3rem;
      margin: 1.6rem 0 0.3rem;
      padding-top: 1.2rem;
      border-top: 1px solid var(--linha);
    }
    .sent {
      color: var(--oliva);
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 1rem;
      justify-content: flex-end;
    }
  `,
})
export class MeditationSettings {
  private readonly store = inject(SiteStore);
  private readonly backend = inject(Backend);

  protected readonly maxMb = MAX_MB[this.backend.mode];
  protected form: Meditation = { ...this.store.content().senses.meditation };
  protected readonly uploading = signal(false);
  protected readonly uploadingFull = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly message = signal('');

  /** `full`: meditação completa (armazenamento privado); senão, o trecho público. */
  protected async upload(event: Event, full = false): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.error.set('');
    this.message.set('');
    // MP4 pode chegar como "video/mp4" (ou sem tipo, em alguns sistemas): só o som é tocado.
    const isMp4 = file.type === 'video/mp4' || /\.(mp4|m4a)$/i.test(file.name);
    if (!file.type.startsWith('audio/') && !isMp4) {
      return this.error.set('Escolha um arquivo de áudio (MP3, M4A, MP4, WAV…).');
    }
    const limit = full ? FULL_MAX_MB[this.backend.mode] : this.maxMb;
    if (file.size > limit * 1024 * 1024) {
      return this.error.set(
        `O arquivo tem ${(file.size / 1024 / 1024).toFixed(1)} MB; o limite é ${limit} MB. Use um trecho menor ou MP3 com menos qualidade (ex.: 96 kbps)${isMp4 ? ' — um MP4 com vídeo costuma ser bem maior que só o áudio' : ''}.`,
      );
    }
    const busy = full ? this.uploadingFull : this.uploading;
    busy.set(true);
    try {
      if (full) {
        this.form = { ...this.form, fullAudio: await this.backend.uploadPrivateAudio(file, file.name) };
        this.message.set('Meditação completa enviada — salve para valer.');
      } else {
        this.form = { ...this.form, audio: await this.backend.uploadImage(file, file.name) };
        this.message.set('Áudio enviado — confira na prévia e salve.');
      }
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      busy.set(false);
    }
  }

  protected remove(): void {
    this.form = { ...this.form, audio: '' };
    this.message.set('');
  }

  protected async save(): Promise<void> {
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const senses = this.store.content().senses;
      await this.store.saveSection('senses', {
        ...senses,
        meditation: {
          audio: this.form.audio,
          title: this.form.title.trim(),
          maxSeconds: Math.max(0, Math.floor(Number(this.form.maxSeconds) || 0)),
          fullAudio: this.form.fullAudio,
          fullTitle: this.form.fullTitle.trim(),
        },
      });
      this.message.set('Meditação salva');
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.saving.set(false);
    }
  }
}
