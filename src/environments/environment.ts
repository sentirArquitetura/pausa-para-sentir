// Valores públicos: a "anon key" do Supabase foi feita para ficar no navegador.
// A segurança dos dados vem das regras RLS definidas em supabase/schema.sql.
// Deixe supabaseUrl vazio para rodar em MODO DEMONSTRAÇÃO (dados só no navegador).
export const environment = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  /** Login curto do administrador. Ao entrar com "pausa", o app usa o e-mail abaixo. */
  adminUsername: 'pausa',
  adminEmail: 'admin@pausaparasentir.com.br',
  imagesBucket: 'site-images',
};
