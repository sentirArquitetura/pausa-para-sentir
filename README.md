# Pausa para Sentir — vitrine, área do cliente e administração

Aplicação Angular 22 (sem servidor próprio) publicada no **GitHub Pages**, com
**Supabase** fazendo o papel de servidor: login, banco de dados, regras de acesso e imagens.

```
Navegador (Angular no GitHub Pages)  ──►  Supabase (Auth + Postgres + Storage)
```

| Quem | O que pode fazer |
|---|---|
| Visitante | Ver a vitrine e montar a sacola (kits e produtos avulsos) |
| Cliente (usuário + senha) | Comprar via Pix (QR Code ou copia e cola) e acompanhar o status dos pedidos. Os dados de entrega são pedidos na primeira compra e ficam salvos |
| Admin (`pausa`) | Tudo acima, mais: editar textos e imagens de cada seção, cadastrar **produtos e kits** (preço, fotos, composição), gerenciar pedidos e a chave Pix |

## Rodar localmente

```bash
npm install
npm start                                # usa o Supabase de produção
npx ng serve --configuration demo        # modo demonstração: dados só no navegador
```

No **modo demonstração** nada é gravado no Supabase: use para testar à vontade.
O login do admin é `pausa` / `admin12345`, e o catálogo vem com preços de exemplo.

## Loja: produtos e kits

Em **Administração → Produtos e kits**:
- **Produto**: nome, descrição, preço, fotos (a primeira é a capa) e "À venda na vitrine".
- **Kit**: os mesmos campos + os produtos que o compõem (com quantidade). Produtos fora da
  vitrine podem compor kits. Marque **Kit principal** para o kit da seção "O que vem no seu kit".
- Os demais itens à venda aparecem na seção **Loja** da vitrine. O cliente monta a **sacola**
  e paga tudo num Pix só. Nome e preço de cada item ficam gravados no pedido.

## Configurar o Supabase (produção)

1. Crie um projeto grátis em <https://supabase.com>.
2. **SQL Editor → New query**: cole o conteúdo de [supabase/schema.sql](supabase/schema.sql) e clique em **Run**.
3. **Authentication → Sign In / Providers → Email**: **desligue "Confirm email"** (obrigatório).
   O login é por *username*: o app transforma `maria` em `maria@usuarios.pausaparasentir.com.br`
   (veja `loginDomain` em `src/environments/environment.ts`). Nenhum e-mail é enviado para esse endereço.
4. **Authentication → Users → Add user → Create new user**
   - e-mail: `pausa@usuarios.pausaparasentir.com.br` (= username `pausa`)
   - senha: a senha do admin (marque *Auto Confirm User*)
5. No SQL Editor, promova esse usuário a admin:
   ```sql
   update public.profiles set is_admin = true where username = 'pausa';
   ```
6. Botão verde **Connect** (topo do painel): copie a URL (`https://<projeto>.supabase.co`) e a
   **publishable key** (`sb_publishable_...`) para `src/environments/environment.ts`
   (`supabaseUrl` e `supabaseAnonKey`). A mesma chave fica em **Settings → API Keys**.
   Esses dois valores são públicos por natureza; quem protege os dados são as regras RLS do SQL.
   **Nunca** use a *secret key* (`sb_secret_...`) nem a *service_role* no site.

Depois disso, entre com `pausa` + senha e abra **Configurações** para cadastrar o **preço**.
A chave Pix já vem preenchida com o CNPJ **57.341.335/0001-90**. Sem preço, a vitrine mostra
"Em breve" e não aceita pedidos.

### Senhas curtas
Os clientes podem usar senhas a partir de **4 caracteres**. O Supabase exige no mínimo 6, então
o app acrescenta `#pausa` às senhas com menos de 6 caracteres antes de enviá-las (sempre do
mesmo jeito, então o login funciona normalmente). Se você criar pelo painel do Supabase um
usuário com senha curta (ex.: `1234`), cadastre-a lá como `1234#pausa`.

## Publicar no GitHub Pages

1. Repositório: <https://github.com/sentirArquitetura/pausa-para-sentir> (branch `main`).
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
