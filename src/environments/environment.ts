// Valores públicos: a "anon key" do Supabase foi feita para ficar no navegador.
// A segurança dos dados vem das regras RLS definidas em supabase/schema.sql.
// Deixe supabaseUrl vazio para rodar em MODO DEMONSTRAÇÃO (dados só no navegador).
export const environment = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  /** Username do administrador. */
  adminUsername: 'pausa',
  /**
   * O Supabase exige e-mail no login; o app transforma o username em
   * "<username>@<loginDomain>". Nenhum e-mail é enviado para esse endereço.
   */
  loginDomain: 'usuarios.pausaparasentir.com.br',
  imagesBucket: 'site-images',
};
