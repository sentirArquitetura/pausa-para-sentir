import { Component, inject, input, output, signal } from '@angular/core';
import { Backend } from '../../core/backend';
import { resizeImage } from '../../core/image';
import { FieldDef } from './schema';

@Component({
  selector: 'app-editor-field',
  template: `
    @let f = field();
    <div class="field">
      <span>{{ f.label }}</span>

      @switch (f.type) {
        @case ('text') {
          <input type="text" [value]="value() ?? ''" (input)="changed.emit(text($event))" />
        }
        @case ('textarea') {
          <textarea
            [rows]="rows()"
            [value]="value() ?? ''"
            (input)="changed.emit(text($event))"
          ></textarea>
        }
        @case ('image') {
          <div class="image-field">
            @if (value()) {
              <img [src]="value()" alt="" />
            }
            <div class="image-actions">
              <label class="btn btn-ghost btn-small">
                {{ uploading() ? 'Enviando…' : 'Trocar imagem' }}
                <input type="file" accept="image/*" hidden [disabled]="uploading()" (change)="upload($event)" />
              </label>
              <input
                type="text"
                placeholder="ou cole o endereço (URL) da imagem"
                [value]="value() ?? ''"
                (change)="changed.emit(text($event))"
              />
            </div>
          </div>
        }
        @case ('images') {
          <div class="gallery-field">
            @for (src of list(); track $index) {
              <figure>
                <img [src]="src" alt="" />
                <button type="button" class="remove" aria-label="Remover imagem" (click)="remove($index)">×</button>
              </figure>
            }
            <label class="add">
              {{ uploading() ? '…' : '+ Adicionar' }}
              <input type="file" accept="image/*" hidden [disabled]="uploading()" (change)="upload($event)" />
            </label>
          </div>
        }
      }

      @if (f.hint) {
        <small>{{ f.hint }}</small>
      }
      @if (error()) {
        <small class="error">{{ error() }}</small>
      }
    </div>
  `,
  styles: `
    .image-field {
      display: grid;
      gap: 0.7rem;
      img {
        width: 100%;
        max-height: 180px;
        object-fit: cover;
        border-radius: 10px;
      }
    }
    .image-actions {
      display: flex;
      gap: 0.6rem;
      align-items: center;
      label {
        flex-shrink: 0;
      }
    }
    .gallery-field {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
      gap: 0.6rem;
      figure {
        position: relative;
        margin: 0;
      }
      img,
      .add {
        width: 100%;
        aspect-ratio: 1;
        object-fit: cover;
        border-radius: 8px;
      }
      .add {
        display: grid;
        place-items: center;
        border: 1px dashed var(--salvia);
        font-size: 0.75rem;
        cursor: pointer;
        color: var(--oliva);
      }
      .remove {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 0;
        background: rgba(43, 51, 36, 0.8);
        color: #fff;
        cursor: pointer;
        line-height: 1;
      }
    }
    .error {
      color: var(--terracota) !important;
    }
  `,
})
export class EditorField {
  private readonly backend = inject(Backend);

  readonly field = input.required<FieldDef>();
  readonly value = input<any>();
  readonly changed = output<any>();

  protected readonly uploading = signal(false);
  protected readonly error = signal('');

  protected rows(): number {
    const lines = String(this.value() ?? '').split('\n').length;
    return Math.min(14, Math.max(3, lines + 1));
  }

  protected list(): string[] {
    return Array.isArray(this.value()) ? this.value() : [];
  }

  protected text(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected remove(index: number): void {
    this.changed.emit(this.list().filter((_, i) => i !== index));
  }

  protected async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.uploading.set(true);
    this.error.set('');
    try {
      const blob = await resizeImage(file);
      const url = await this.backend.uploadImage(blob, file.name.replace(/\.\w+$/, '.jpg'));
      this.changed.emit(this.field().type === 'images' ? [...this.list(), url] : url);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.uploading.set(false);
    }
  }
}
