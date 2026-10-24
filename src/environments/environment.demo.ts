// Modo demonstração local: `ng serve --configuration demo`.
// Usa só o navegador (localStorage) — nada é gravado no Supabase de produção.
// (Este arquivo substitui o environment.ts nessa configuração; mantenha os mesmos campos.)
export const environment = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  adminUsername: 'pausa',
  loginDomain: 'usuarios.pausaparasentir.com.br',
  imagesBucket: 'site-images',
  /** Bucket privado da meditação completa (acesso por link temporário). */
  privateAudioBucket: 'meditacao-completa',
};
