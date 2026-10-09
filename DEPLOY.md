# 🚀 Colocar o Mary Delivery no ar (Supabase + GitHub + Vercel)

Guia passo a passo, na ordem. Cada etapa leva poucos minutos e nada é instalado
no computador — tudo acontece no navegador. Dúvida em qualquer ponto, me chama.

---

## 1) Criar o projeto no Supabase (o banco de dados)

1. Acesse **supabase.com** → entre na sua conta → **New project**.
2. Preencha:
   - **Name**: `mary-delivery`
   - **Database password**: clique em **Generate** e **guarde essa senha** num lugar seguro (vai precisar dela no passo 3).
   - **Region**: **South America (São Paulo)** — a mais rápida pro Brasil.
3. Clique em **Create new project** e espere ~2 minutos (o banco está sendo criado).
4. Copie o endereço de conexão: menu lateral **Project Settings** (⚙️) → **Database** →
   aba **Connection pooling** → copie a string **URI**.
   Ela é parecida com:
   `postgresql://postgres.abcdefghij:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`
5. Troque o `[YOUR-PASSWORD]` pela senha que você guardou no passo 2.
   Guarde essa string completa — é a **DATABASE_URL** que a Vercel vai usar (passo 8).

> É a string da aba **Connection pooling** mesmo (porta 6543) — ela é a recomendada
> para sites na Vercel. O `.env.example` do projeto já usa esse formato.

## 2) Criar as tabelas

1. No Supabase: menu lateral **SQL Editor** → **New query**.
2. Abra o arquivo `supabase/schema.sql` desta pasta, copie **todo** o conteúdo e cole no editor.
3. Clique em **Run**.
4. O Supabase vai perguntar sobre **Row Level Security (RLS)** → escolha **"Run and enable RLS"**.
   É uma trava de segurança extra: o site conecta como dono do banco (não é afetado) e a
   chave pública do projeto fica 100% bloqueada.
5. Deve aparecer **Success** e a lista com as 9 tabelas.

## 3) Subir o código para o GitHub (repositório PRIVADO)

No computador, abra o terminal **na pasta do projeto** (Digite "cmd" no menu Iniciar,
ou clique com o botão direito dentro da pasta → "Abrir no Terminal"). Cole:

```bash
cd "C:\Users\Dell\Downloads\marydelivery web"
git init
git add .
git commit -m "Mary Delivery: cardápio digital com pedidos pelo WhatsApp"
```

Depois, no site do GitHub:

1. **github.com** → **New repository**.
2. Nome: `mary-delivery` · visibilidade: **Private** (é o negócio de verdade, com o
   WhatsApp no código) → **Create repository**.
3. O GitHub mostra os comandos de "push an existing repository" — copie e cole os três
   no terminal. Vão ser algo como:

```bash
git remote add origin https://github.com/SEU-USUARIO/mary-delivery.git
git branch -M main
git push -u origin main
```

> O `.env` **nunca** vai para o GitHub (o `.gitignore` já bloqueia) — e nesta fase ele
> nem precisa existir: a senha do banco vai direto para a Vercel.

## 4) Publicar na Vercel

1. **vercel.com** → entre → **Add New... → Project**.
2. Clique em **Import** no repositório `mary-delivery`.
3. Em **Environment Variables**, adicione:
   - **Key**: `DATABASE_URL`
   - **Value**: a string completa do passo 1.5 (com a senha já trocada)
   - Environment: deixe marcado **Production** e **Preview**.
4. Clique em **Deploy** e espere 2–3 minutos.

Se aparecer **Congratulations** 🎉 o site já está no ar no link
`mary-delivery-xxxx.vercel.app`. A partir de agora, todo `git push` no repositório
publica uma versão nova automaticamente.

## 5) Primeira visita (o site se prepara sozinho)

Abra o link no navegador. Na **primeira** visita o site cria sozinho:

- o estabelecimento **Mary Delivery** (com o WhatsApp (21) 96628-6896 já cadastrado);
- um cardápio **de exemplo** (uns lanches só pra você ver funcionando — troque no painel);
- o acesso ao painel: **usuário `admin`** / senha **`mary-lanches-2026`**.

O cardápio nasce **PAUSADO** de propósito — os clientes só passam a ver o cardápio
quando você clicar em **REABRIR PEDIDOS** no painel, depois de montar o cardápio real.

## 6) Checklist depois de no ar

1. Entre em `SEU-LINK/admin/login` com `admin` / `mary-lanches-2026`.
2. **Troque a senha**: Configurações → Meu acesso (o painel fica lembrando até trocar).
3. Cardápio → Produtos: cadastre os lanches reais (os de exemplo podem ser editados ou
   excluídos), com fotos e preços.
4. Configurações: confira WhatsApp, Entrega, Pagamentos e Horários.
5. Faça um pedido de teste no celular: montar → enviar pelo WhatsApp → ver se chega
   no (21) 96628-6896 → aparecer na aba **Pedidos** do painel.
6. Tudo certo? Tela inicial do painel → **REABRIR PEDIDOS** 🟢.
7. Instale o painel no celular: abra `/admin` no Chrome → "Instalar aplicativo"
   (Android) ou Compartilhar → Adicionar à Tela de Início (iPhone).
8. (Opcional, depois) Compre um domínio e conecte em **Settings → Domains** na Vercel.

---

## Rodar no computador (opcional — só se quiser desenvolver local)

O site vive na Vercel; rodar local é só para testar mudanças de código:

```bash
npm install
# crie um arquivo .env com:  DATABASE_URL=<a mesma string da Vercel>
npx drizzle-kit push   # ou rode o supabase/schema.sql no SQL Editor, uma vez só
npm run dev            # abre em http://localhost:3000
```
