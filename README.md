# SíndicoContas — SaaS de Gestão Financeira e Prestação de Contas

Sistema SaaS para gestão financeira condominial e prestação de contas transparente para síndicos, construído com **React + Vite, TypeScript, Tailwind CSS, Lucide Icons, Recharts e Supabase**.

---

## 1. Identidade Visual & Temas
- **Dark Navy:** `#0E1B2B` (Fundo Modo Escuro) / `#15263B` (Superfícies/Cards Escuros)
- **Light Ice:** `#E6EAED` (Fundo Modo Claro) / `#FFFFFF` (Superfícies/Cards Claros)
- **Primary Blue:** `#1A73E9` (Ações primárias, destaques e linha de saldo)
- **Emerald Green:** `#2AC38B` (Entradas efetivadas e tom pastel `rgba(42, 195, 139, 0.45)` para entradas previstas)
- **Semantic Red:** `#EF4444` (Saídas efetivadas e tom pastel `rgba(239, 68, 68, 0.45)` para saídas previstas)

---

## 2. Configuração do Supabase
1. Crie um projeto no [Supabase](https://supabase.com/).
2. No **SQL Editor** do Supabase, execute integralmente o script:
   - [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql)
   - Ele cria as tabelas `clients`, `account_categories` e `transactions`, políticas **RLS**, bucket Storage `receipts`, gatilho de semeadura automática do Plano de Contas hierárquico e a função `enforce_scheduled_inactivations()`.
3. Copie `.env.example` para `.env` e informe suas chaves:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-anon-key
   VITE_ADMIN_EMAIL=admin@seudominio.com.br
   ```
4. Para definir um usuário como Administrador Master no Supabase Auth, atribua `{"role": "admin"}` em `raw_app_meta_data` (ou configure `VITE_ADMIN_EMAIL`).

> **Modo Demonstrativo Automático:** Caso `.env` ainda não esteja configurado, o sistema opera automaticamente com persistência local (`localStorage`), permitindo testar todos os fluxos imediatamente:
> - **Login Síndico (`/login`):** `sindico@jardins.com.br` / `123456`
> - **Login Administrador (`/admin/login`):** `admin@sindicocontas.com.br` / `admin123`

---

## 3. Execução Local
```bash
npm install
npm run dev
```
