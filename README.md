# SGS — Sistema de Gestão Sindical (Centriax)

Sistema SaaS para gestão financeira condominial e prestação de contas transparente para síndicos, construído com **React + Vite, TypeScript, Tailwind CSS, Lucide Icons, Recharts e Supabase**.

---

## 1. Identidade Visual & Design System
- **Logo Oficial:** Centriax
- **Dark Navy:** `#0E1B2B` (Fundo Modo Escuro) / `#15263B` (Superfícies/Cards Escuros)
- **Light Ice:** `#E6EAED` (Fundo Modo Claro) / `#FFFFFF` (Superfícies/Cards Claros)
- **Primary Blue:** `#1A73E9` (Ações primárias, destaques e linha de saldo)
- **Emerald Green:** `#2AC38B` (Entradas efetivadas e tom pastel `rgba(42, 195, 139, 0.45)` para entradas previstas)
- **Semantic Red:** `#EF4444` (Saídas efetivadas e tom pastel `rgba(239, 68, 68, 0.45)` para saídas previstas)

---

## 2. Autenticação, Controle de Acesso e Multi-Condomínio
- **Administrador Master (`/admin/login`):**
  - E-mails autorizados por padrão: `brunoallan004@gmail.com` e `admin@sindicocontas.com.br` (ou qualquer lista separada por vírgula em `VITE_ADMIN_EMAIL`).
  - O Admin tem controle exclusivo sobre os 16 slots da matriz 4x4, cadastra novos condomínios com seus respectivos e-mails autorizados e pode ativar/desativar ou agendar a inativação de qualquer condomínio.
- **Lista de Autorização Estrita (Whitelist Fechada para Síndicos):**
  - O síndico só consegue acessar o sistema se o seu e-mail tiver sido previamente cadastrado pelo Administrador ao criar um condomínio.
  - Tentativas com e-mails não cadastrados são bloqueadas com erro de acesso não autorizado.
  - Se o condomínio for inativado pelo Admin, o acesso do síndico àquele condomínio é revogado imediatamente.
- **Suporte a Múltiplos Condomínios por Síndico:**
  - O mesmo e-mail de síndico pode gerenciar 2 ou mais condomínios.
  - Ao fazer login no `/login`, se o síndico possuir mais de um condomínio ativo, o sistema exibe uma tela com menu suspenso para escolher qual condomínio deseja acessar.
  - Dentro do painel (`/app`), o cabeçalho superior inclui um seletor para alternar entre seus condomínios a qualquer momento sem precisar deslogar.

---

## 3. Configuração do Supabase
1. No seu projeto do Supabase, acesse o **SQL Editor** -> **New query**.
2. Cole e execute o arquivo [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql).
   *(Se você já tinha executado a versão anterior, ele remove automaticamente a restrição de unicidade do e-mail do síndico para permitir múltiplos condomínios).*
3. Configure as variáveis de ambiente na Vercel (ou em `.env`):
   ```env
   VITE_SUPABASE_URL=https://chsdqrhrtwehxhooqmlp.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_RUDF0ltMCGpW1ByuTdlD1Q_iwta5DHB
   VITE_ADMIN_EMAIL=brunoallan004@gmail.com
   ```
   *(O projeto aceita tanto prefixos `VITE_` quanto `NEXT_PUBLIC_`)*.

---

## 4. Execução Local
```bash
npm install
npm run dev
```

---

## 5. Módulo de Gestão de Funcionários (CNPJ Próprio) & Calendário Condominial
- **Regime por Condomínio:** Cada condomínio pode habilitar ou desabilitar o sistema de RH próprio (contratação direta pelo CNPJ do condomínio) tanto no Painel Master (`/admin/dashboard`) quanto na aba **Gestão de Funcionários** (`/app/funcionarios`).
- **Escalas Automáticas & Cobertura 24/7:** Geração automática contínua de escalas `12x36` (diurna e noturna) e comercial (`44h`), com edição manual célula-a-célula, sinalização automática de períodos com desfalque de pessoal e sugestão automática de cobertura.
- **Validação Oficial e Exportação PDF:** Registro obrigatório de **Data de Validação** e **Data de Exportação** com código de autenticidade para impressão do Quadro Geral + Protocolo Individual de Entrega e Assinatura presencial dos colaboradores.
- **Prontuário de Colaboradores e Férias:** Lista dos 10 colaboradores fictícios pré-cadastrados com controle de validade de exames admissionais/periódicos (ASO NR-07), certificados de Brigada de Incêndio (NR-23), NR-10, NR-35 e gestão de férias integrada à escala.
- **Calendário do Condomínio (`/app/calendario`):** Centraliza aniversários dos 10 colaboradores, reservas do salão de festas, vencimento de documentos prediais/trabalhistas e contratos, com filtros por categoria/urgência e barra de pesquisa global.
