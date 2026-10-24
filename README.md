# Pausa para Sentir — vitrine, área do cliente e administração

Aplicação Angular 22 (sem servidor próprio) publicada no **GitHub Pages**, com
**Supabase** fazendo o papel de servidor: login, banco de dados, regras de acesso e imagens.

```
Navegador (Angular no GitHub Pages)  ──►  Supabase (Auth + Postgres + Storage)
```

| Quem | O que pode fazer |
|---|---|
| Visitante | Ver a vitrine |
| Cliente (e-mail + senha) | Comprar via Pix (QR Code ou copia e cola) e acompanhar o status dos pedidos |
| Admin (`pausa`) | Tudo acima, mais: editar textos e imagens de cada seção da vitrine, gerenciar pedidos e configurar preço e chave Pix |

## Rodar localmente

```bash
npm install
npm start          # http://localhost:4200
```

Sem configurar nada, o app abre em **modo demonstração**: os dados ficam salvos só no
navegador (localStorage). Use para testar o fluxo; **não serve para vender**.
No modo demonstração, o login do admin é `pausa` / `admin12345`.

## Configurar o Supabase (produção)

1. Crie um projeto grátis em <https://supabase.com>.
2. **SQL Editor → New query**: cole o conteúdo de [supabase/schema.sql](supabase/schema.sql) e clique em **Run**.
3. **Authentication → Users → Add user → Create new user**
   - e-mail: `admin@pausaparasentir.com.br` (o mesmo de `adminEmail` em `src/environments/environment.ts`)
   - senha: a senha do admin (marque *Auto Confirm User*)
4. No SQL Editor, promova esse usuário a admin:
   ```sql
   update public.profiles set is_admin = true where email = 'admin@pausaparasentir.com.br';
   ```
5. **Project Settings → API**: copie a *Project URL* e a *anon public key* para
   `src/environments/environment.ts` (`supabaseUrl` e `supabaseAnonKey`).
   Esses dois valores são públicos por natureza; quem protege os dados são as regras RLS do SQL.
6. **Authentication → URL Configuration**: em *Site URL*, coloque o endereço do site
   (ex.: `https://SEU-USUARIO.github.io/pausa-para-sentir/`).
7. Opcional: em **Authentication → Providers → Email**, desligue *Confirm email* se não
   quiser exigir a confirmação por e-mail no cadastro dos clientes.

Depois disso, entre com `pausa` + senha e abra **Configurações** para cadastrar o **preço**
e a **chave Pix**. Sem os dois, a vitrine mostra "Em breve" e não aceita pedidos.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub (ex.: `pausa-para-sentir`) e envie este projeto para a branch `main`.
2. No repositório: **Settings → Pages → Source: GitHub Actions**.
3. Cada push na `main` dispara o workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml),
   que compila e publica em `https://SEU-USUARIO.github.io/pausa-para-sentir/`.

Com domínio próprio, troque `--base-href` no workflow por `/`.

## Como funciona o Pix

- O QR Code e o "copia e cola" são gerados no próprio navegador (padrão BR Code do Banco Central),
  com o valor exato do pedido e o código do pedido (ex.: `PPS7K2M9Q`) como identificador.
- O pagamento cai direto na chave Pix cadastrada, sem intermediário e sem taxa.
- **A confirmação é manual**: o admin confere o extrato e clica em *Confirmar pagamento* no pedido.
  O cliente vê o novo status na hora.
- Para confirmação automática, o próximo passo é integrar um provedor de Pix com webhook
  (Mercado Pago, Efí, Asaas…) usando uma *Edge Function* do Supabase.

## Estrutura

```
src/app/
  core/            modelos, conteúdo padrão, gerador Pix, backends (Supabase e demonstração)
  pages/home       vitrine (todas as seções do CLAUDE.md)
  pages/login      entrar / criar conta
  pages/checkout   dados de entrega + gerar Pix
  pages/my-orders, order-detail   área do cliente
  pages/admin-*    pedidos e configurações
  shared/          editor de seções, componente Pix, abas do admin
supabase/schema.sql  tabelas, triggers e regras de acesso
```
