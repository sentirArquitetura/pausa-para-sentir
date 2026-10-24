// Valores públicos: a "anon key" do Supabase foi feita para ficar no navegador.
// A segurança dos dados vem das regras RLS definidas em supabase/schema.sql.
// Deixe supabaseUrl vazio para rodar em MODO DEMONSTRAÇÃO (dados só no navegador).
export const environment = {
  supabaseUrl: 'https://jfmakxjasdjfhdnzqsfq.supabase.co',
  /** Publishable key (Supabase → Connect, ou Settings → API Keys). Nunca use a secret key aqui. */
  supabaseAnonKey: 'sb_publishable_Wn1zBcGm6qnzWTa70V7H-Q_S13eJKuF',
  /** Username do administrador. */
  adminUsername: 'pausa',
  /**
   * O Supabase exige e-mail no login; o app transforma o username em
   * "<username>@<loginDomain>". Nenhum e-mail é enviado para esse endereço.
   */
  loginDomain: 'usuarios.pausaparasentir.com.br',
  imagesBucket: 'site-images',
  /** Bucket privado da meditação completa (acesso por link temporário). */
  privateAudioBucket: 'meditacao-completa',
};
