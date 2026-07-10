# Simulador de venda · Parkside

App web autônoma (HTML/CSS/JS puro, sem build) para simular planos de venda das unidades
do empreendimento **Parkside**. Feita para uso da equipe de vendas.

## Como usar

Abra o arquivo **`index.html`** no navegador (duplo-clique). Não precisa instalar nada.

Para hospedar (link compartilhável), qualquer host estático serve: GitHub Pages, Netlify,
Vercel, ou uma pasta no servidor. São apenas 4 arquivos estáticos.

## Funcionalidades

- **Seleção de unidade** — lista só as disponíveis (as `RESERVADO` e as sem preço na
  tabela ficam de fora). Mostra valor, área privativa e R$/m².
- **Identidade visual Dinamize** — dourado `#ca9722`, carvão, creme; tipografia Cinzel (títulos)
  e Jost (texto); logo oficial no cabeçalho.
- **Modelo de venda único:** entrada → parcelamento até as chaves → quitação na entrega.
  - **Entrada** — mínimo de 10% (travado no slider), parcelável em N vezes, com desconto à vista opcional.
  - **Parcelamento até as chaves** — parcelas mensais durante a obra (% do valor × meses até a entrega),
    com correção INCC e reforços/balões.
  - **Saldo nas chaves** — o resultado apenas informa o saldo remanescente a quitar na entrega
    (o financiamento bancário / recurso próprio fica fora do escopo da simulação).
- **Proposta em PDF** — botão "Imprimir / salvar proposta" usa a impressão do navegador
  (layout com cabeçalho da marca e dados do cliente).

## Arquivos

| Arquivo | Papel |
|---|---|
| `index.html` | Estrutura da página |
| `styles.css` | Estilos (tema claro/escuro automático) |
| `data.js` | Base de dados das unidades (preços, áreas, status) |
| `app.js` | Lógica do simulador e cálculos |
| `logo.png` / `symbol.png` | Logo oficial Dinamize (lockup e símbolo) |

## Base de dados

Extraída da *Tabela de Preço Parkside* (PDF, 3 páginas). Torres A e B, andares 5 a 13,
unidades 01–08. Para atualizar preços/status, edite o mapa `PRECOS` em `data.js`.

## Premissas de cálculo

- Parcelas por **Tabela Price** quando há juros; divisão simples quando juros = 0.
- INCC anual convertido para taxa mensal equivalente e combinado à taxa de juros sobre o
  saldo. A parcela exibida é uma **equivalente constante** (aproximação; na prática o saldo
  é reajustado mês a mês pelo índice).
- "Renda aproximada exigida" assume parcela ≤ 30% da renda familiar.

Simulação de caráter informativo — não constitui proposta formal.

## Próximos passos (ideias)

- Reforços/balões semestrais ou anuais.
- Desconto para pagamento à vista.
- Mapa visual de disponibilidade (grade de andares/torres).
- Exportar proposta com dados do cliente.
