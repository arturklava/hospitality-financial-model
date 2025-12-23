/**
 * Financial Glossary (v3.0 - Multi-language Support)
 * 
 * Executive-friendly definitions for key financial terms used throughout
 * the hospitality financial modeling application.
 * 
 * Now supports both English (en) and Portuguese (pt).
 */

export interface MultiLangString {
  en: string;
  pt: string;
}

/**
 * Financial term definition.
 * 
 * Enhanced with multi-language support for internationalization.
 */
export interface FinancialTerm {
  /** The term acronym or ID (e.g., "NOI", "DSCR") */
  term: string;
  /** The term acronym to display (e.g., "NOI", "DSCR") */
  acronym: string;
  /** Full name of the term */
  meaning: MultiLangString;
  /** Executive-friendly explanation text */
  explanation: MultiLangString;
  /** Mathematical representation of the calculation */
  calculation: MultiLangString;

  // Legacy fields removed - ensure Views use the new structure
}

/**
 * Financial glossary containing definitions for key terms.
 * 
 * Provides clear, executive-friendly explanations of financial metrics
 * and concepts used in hospitality financial modeling.
 */
export const FINANCIAL_GLOSSARY: Record<string, FinancialTerm> = {
  NOI: {
    term: 'NOI',
    acronym: 'NOI',
    meaning: {
      en: 'Net Operating Income',
      pt: 'Resultado Operacional Líquido'
    },
    explanation: {
      en: 'Net Operating Income represents the total revenue minus operating expenses, before tax and debt service. It is a key metric for evaluating property performance and represents cash flow available to service debt and provide returns to equity investors.',
      pt: 'O Resultado Operacional Líquido representa a receita total menos as despesas operacionais, antes de impostos e serviço da dívida. É uma métrica chave para avaliar o desempenho da propriedade e representa o fluxo de caixa disponível para pagar a dívida e fornecer retornos aos investidores.'
    },
    calculation: {
      en: 'NOI = GOP - Undistributed Expenses - Management Fees - Non-Operating Income/Expense - Maintenance Capex',
      pt: 'NOI = GOP - Despesas Não-Distribuídas - Taxas de Gestão - Receitas/Despesas Não-Operacionais - Capex de Manutenção'
    }
  },
  DSCR: {
    term: 'DSCR',
    acronym: 'DSCR',
    meaning: {
      en: 'Debt Service Coverage Ratio',
      pt: 'Índice de Cobertura do Serviço da Dívida'
    },
    explanation: {
      en: 'Debt Service Coverage Ratio measures how many times the property\'s net operating income covers its debt service obligations. A DSCR above 1.0x indicates sufficient cash flow to service debt. Lenders typically require minimum DSCR of 1.20x to 1.35x for commercial real estate loans.',
      pt: 'O Índice de Cobertura mede quantas vezes o NOI da propriedade cobre suas obrigações de dívida. Um DSCR acima de 1.0x indica fluxo de caixa suficiente. Credores geralmente exigem um mínimo de 1.20x a 1.35x.'
    },
    calculation: {
      en: 'DSCR = NOI / Debt Service',
      pt: 'DSCR = NOI / Serviço da Dívida'
    }
  },
  LTV: {
    term: 'LTV',
    acronym: 'LTV',
    meaning: {
      en: 'Loan to Value',
      pt: 'Relação Empréstimo/Valor'
    },
    explanation: {
      en: 'Loan to Value ratio represents the percentage of the property\'s total value (initial investment) that is funded by debt. A lower LTV indicates less leverage and lower risk for lenders. Typical commercial real estate LTV ranges from 60% to 80%.',
      pt: 'LTV representa a porcentagem do valor total da propriedade financiada por dívida. Um LTV menor indica menos alavancagem e menor risco. O LTV típico varia de 60% a 80%.'
    },
    calculation: {
      en: 'LTV = (Total Debt / Initial Investment) × 100%',
      pt: 'LTV = (Dívida Total / Investimento Inicial) × 100%'
    }
  },
  IRR: {
    term: 'IRR',
    acronym: 'IRR / TIR',
    meaning: {
      en: 'Internal Rate of Return',
      pt: 'Taxa Interna de Retorno (TIR)'
    },
    explanation: {
      en: 'Internal Rate of Return is the annualized effective compounded return rate that makes the net present value of all cash flows equal to zero. IRR represents the discount rate at which the investment breaks even and is a key metric for comparing investment opportunities.',
      pt: 'A Taxa Interna de Retorno é a taxa de retorno anualizada que torna o Valor Presente Líquido (VPL) de todos os fluxos de caixa igual a zero. É a métrica chave para comparar oportunidades de investimento.'
    },
    calculation: {
      en: 'IRR = Discount rate where NPV = 0',
      pt: 'TIR = Taxa de desconto onde VPL = 0'
    }
  },
  EQUITY_MULTIPLE: {
    term: 'Equity Multiple',
    acronym: 'MOIC',
    meaning: {
      en: 'Equity Multiple (Multiple on Invested Capital)',
      pt: 'Múltiplo de Capital Investido (MOIC)'
    },
    explanation: {
      en: 'Equity Multiple represents the total cash returned divided by total cash invested. A multiple of 2.0x means investors received twice what they invested over the investment period. Unlike IRR, Equity Multiple does not consider the time value of money.',
      pt: 'Representa o total de dinheiro retornado dividido pelo total investido. Um múltiplo de 2.0x significa que os investidores receberam o dobro do investimento. Diferente da TIR, não considera o valor do dinheiro no tempo.'
    },
    calculation: {
      en: 'Equity Multiple = Total Distributions / Total Contributions',
      pt: 'MOIC = Distribuições Totais / Contribuições Totais'
    }
  },
  NPV: {
    term: 'NPV',
    acronym: 'NPV / VPL',
    meaning: {
      en: 'Net Present Value',
      pt: 'Valor Presente Líquido (VPL)'
    },
    explanation: {
      en: 'Net Present Value represents the present value of future cash flows minus the initial investment. NPV accounts for the time value of money by discounting future cash flows. A positive NPV indicates a profitable investment opportunity.',
      pt: 'O VPL representa o valor presente dos fluxos de caixa futuros menos o investimento inicial, descontados por uma taxa. Um VPL positivo indica uma oportunidade de investimento rentável.'
    },
    calculation: {
      en: 'NPV = Σ (Cash Flow_t / (1 + r)^t) - Initial Investment',
      pt: 'VPL = Σ (Fluxo de Caixa_t / (1 + r)^t) - Investimento Inicial'
    }
  },
  WACC: {
    term: 'WACC',
    acronym: 'WACC',
    meaning: {
      en: 'Weighted Average Cost of Capital',
      pt: 'Custo Médio Ponderado de Capital'
    },
    explanation: {
      en: 'Weighted Average Cost of Capital represents the average rate of return required by all investors (debt and equity). WACC accounts for the proportion of debt and equity in the capital structure and their respective costs.',
      pt: 'Representa a taxa média de retorno exigida por todos os investidores (dívida e equity), ponderada pela proporção de cada um na estrutura de capital.'
    },
    calculation: {
      en: 'WACC = (Equity % × Cost of Equity) + (Debt % × Cost of Debt × (1 - Tax Rate))',
      pt: 'WACC = (Equity % × Custo Equity) + (Dívida % × Custo Dívida × (1 - Taxa Imposto))'
    }
  },
  UFCF: {
    term: 'UFCF',
    acronym: 'UFCF',
    meaning: {
      en: 'Unlevered Free Cash Flow',
      pt: 'Fluxo de Caixa Livre da Firma (Não-Alavancado)'
    },
    explanation: {
      en: 'Unlevered Free Cash Flow represents cash flow available to all investors (debt and equity) before debt service payments. Used to determine enterprise value.',
      pt: 'Fluxo de caixa disponível para todos os investidores (dívida e equity) antes do pagamento da dívida. Usado para determinar o valor da empresa (Enterprise Value).'
    },
    calculation: {
      en: 'UFCF = NOI - Maintenance Capex - Change in Working Capital',
      pt: 'UFCF = NOI - Capex Manutenção - Variação Capital de Giro'
    }
  },
  LFCF: {
    term: 'LFCF',
    acronym: 'LFCF',
    meaning: {
      en: 'Levered Free Cash Flow',
      pt: 'Fluxo de Caixa Livre do Acionista (Alavancado)'
    },
    explanation: {
      en: 'Levered Free Cash Flow represents cash flow available to equity investors after debt service payments (principal and interest). Used to determine equity value.',
      pt: 'Fluxo de caixa disponível para os acionistas após o pagamento do serviço da dívida (principal e juros). Usado para determinar o valor do equity (Equity Value).'
    },
    calculation: {
      en: 'LFCF = UFCF - Debt Service',
      pt: 'LFCF = UFCF - Serviço da Dívida'
    }
  },
  PAYBACK_PERIOD: {
    term: 'Payback Period',
    acronym: 'Payback',
    meaning: {
      en: 'Payback Period',
      pt: 'Período de Payback'
    },
    explanation: {
      en: 'Payback Period represents the time required to recover the initial investment from cash flows, measured in years.',
      pt: 'Tempo necessário para recuperar o investimento inicial através dos fluxos de caixa, medido em anos.'
    },
    calculation: {
      en: 'Payback Period = Years until cumulative cash flows ≥ Initial Investment',
      pt: 'Payback = Anos até Fluxo Acumulado ≥ Investimento Inicial'
    }
  },
  LOGNORMAL: {
    term: 'LogNormal Distribution',
    acronym: 'LogNormal',
    meaning: {
      en: 'LogNormal Distribution',
      pt: 'Distribuição LogNormal'
    },
    explanation: {
      en: 'A probability distribution where the logarithm of the variable is normally distributed. Best for prices/values that cannot be negative.',
      pt: 'Uma distribuição onde o logaritmo da variável é normalmente distribuído. Ideal para preços/valores que não podem ser negativos.'
    },
    calculation: {
      en: 'LogNormal(x) = exp(Normal(μ, σ))',
      pt: 'LogNormal(x) = exp(Normal(μ, σ))'
    }
  },
  PERT: {
    term: 'PERT',
    acronym: 'PERT',
    meaning: {
      en: 'Program Evaluation and Review Technique',
      pt: 'Técnica de Avaliação e Revisão de Programa'
    },
    explanation: {
      en: 'A three-point estimation technique used in risk analysis. Uses optimistic, most likely, and pessimistic estimates.',
      pt: 'Técnica de estimativa de três pontos (otimista, mais provável, pessimista) usada para modelar incertezas em custos e prazos.'
    },
    calculation: {
      en: 'PERT = (Optimistic + 4×Most Likely + Pessimistic) / 6',
      pt: 'PERT = (Otimista + 4×Provável + Pessimista) / 6'
    }
  },
  SENIOR_DSCR: {
    term: 'Senior DSCR',
    acronym: 'Senior DSCR',
    meaning: {
      en: 'Senior Debt Service Coverage Ratio',
      pt: 'DSCR Sênior'
    },
    explanation: {
      en: 'Debt Service Coverage Ratio calculated using only senior debt service obligations.',
      pt: 'Índice de Cobertura calculado considerando apenas as obrigações da dívida sênior.'
    },
    calculation: {
      en: 'Senior DSCR = NOI / Senior Debt Service',
      pt: 'DSCR Sênior = NOI / Serviço da Dívida Sênior'
    }
  },
  COMPOUND_PREF: {
    term: 'Compound Pref',
    acronym: 'Compound Pref',
    meaning: {
      en: 'Compound Preferred Return',
      pt: 'Retorno Preferencial Composto'
    },
    explanation: {
      en: 'A preferred return calculation where unpaid returns compound over time, similar to an interest-bearing account.',
      pt: 'Cálculo de retorno preferencial onde valores não pagos acumulam e compõem juros ao longo do tempo.'
    },
    calculation: {
      en: 'Compound Pref = Principal × (1 + Rate)^Periods - Principal',
      pt: 'Pref Composto = Principal × (1 + Taxa)^Períodos - Principal'
    }
  },
  S_CURVE: {
    term: 'S-Curve',
    acronym: 'S-Curve',
    meaning: {
      en: 'S-Curve Construction Spending',
      pt: 'Curva S de Desembolso'
    },
    explanation: {
      en: 'A sigmoid-shaped spending pattern where spending starts slow, accelerates in the middle, and tapers off.',
      pt: 'Padrão de gastos em forma de S onde o desembolso começa lento, acelera no meio da obra e diminui no final.'
    },
    calculation: {
      en: 'S-Curve(t) = Total Budget × Sigmoid(t / Duration)',
      pt: 'Curva S(t) = Orçamento Total × Sigmoide(t / Duração)'
    }
  },
  BARTER: {
    term: 'Barter (Permuta)',
    acronym: 'Permuta',
    meaning: {
      en: 'Barter (Land Swap)',
      pt: 'Permuta (Troca de Terreno)'
    },
    explanation: {
      en: 'Acquisition method where land is exchanged for other assets/units rather than purchased with cash.',
      pt: 'Método de aquisição onde o terreno é trocado por unidades futuras ou outros ativos, em vez de pagamento em dinheiro.'
    },
    calculation: {
      en: 'Barter Cash Flow = Value of Asset Received - Value of Asset Given',
      pt: 'Fluxo Permuta = Valor Recebido - Valor Entregue'
    }
  },
  RAMP_UP: {
    term: 'Ramp-up',
    acronym: 'Ramp-up',
    meaning: {
      en: 'Operational Ramp-up',
      pt: 'Ramp-up Operacional'
    },
    explanation: {
      en: 'The gradual increase in operational performance (occupancy, revenue) from launch to stabilization.',
      pt: 'O aumento gradual da performance operacional (ocupação, receita) desde a inauguração até a estabilização.'
    },
    calculation: {
      en: 'Ramp-up(t) = Target × (t / Ramp-up Period)',
      pt: 'Ramp-up(t) = Alvo × (t / Período Ramp-up)'
    }
  },
  EQUITY_PEAK: {
    term: 'Equity Peak',
    acronym: 'Equity Peak',
    meaning: {
      en: 'Peak Equity Requirement',
      pt: 'Necessidade Máxima de Caixa (Pico de Equity)'
    },
    explanation: {
      en: 'The maximum cumulative equity investment required, typically occurring during construction.',
      pt: 'A exposição máxima de caixa dos investidores, ocorrendo tipicamente durante a fase de construção.'
    },
    calculation: {
      en: 'Equity Peak = max(Cumulative Land + Construction Costs)',
      pt: 'Pico Equity = máx(Custos Acumulados de Terreno + Obra)'
    }
  },
  MOIC: {
    term: 'MOIC',
    acronym: 'MOIC',
    meaning: {
      en: 'Multiple on Invested Capital',
      pt: 'Múltiplo sobre Capital Investido'
    },
    explanation: {
      en: 'Total cash returned divided by total cash invested. Also known as Equity Multiple.',
      pt: 'Total de dinheiro retornado dividido pelo total investido. Também conhecido como Múltiplo de Equity.'
    },
    calculation: {
      en: 'MOIC = Total Distributions / Total Contributions',
      pt: 'MOIC = Distribuições Totais / Contribuições Totais'
    }
  },
  GOP: {
    term: 'GOP',
    acronym: 'GOP',
    meaning: {
      en: 'Gross Operating Profit',
      pt: 'Lucro Operacional Bruto'
    },
    explanation: {
      en: 'Profit after direct operating costs but before undistributed expenses (USALI).',
      pt: 'Lucro após custos operacionais diretos, mas antes das despesas não-distribuídas (padrão USALI).'
    },
    calculation: {
      en: 'GOP = Total Revenue - Departmental Expenses',
      pt: 'GOP = Receita Total - Despesas Departamentais'
    }
  },
  ADR: {
    term: 'ADR',
    acronym: 'ADR',
    meaning: {
      en: 'Average Daily Rate',
      pt: 'Diária Média'
    },
    explanation: {
      en: 'Average price paid per room per night.',
      pt: 'Preço médio pago por quarto por noite.'
    },
    calculation: {
      en: 'ADR = Room Revenue / Rooms Sold',
      pt: 'ADR = Receita de Quartos / Quartos Vendidos'
    }
  },
  OCCUPANCY: {
    term: 'Occupancy',
    acronym: 'Occ / Ocupação',
    meaning: {
      en: 'Occupancy Rate',
      pt: 'Taxa de Ocupação'
    },
    explanation: {
      en: 'Percentage of available rooms occupied.',
      pt: 'Percentual de quartos disponíveis que foram ocupados.'
    },
    calculation: {
      en: 'Occupancy = (Rooms Sold / Rooms Available) × 100%',
      pt: 'Ocupação = (Quartos Vendidos / Quartos Disp.) × 100%'
    }
  },
  REVPAR: {
    term: 'RevPAR',
    acronym: 'RevPAR',
    meaning: {
      en: 'Revenue per Available Room',
      pt: 'Receita por Quarto Disponível'
    },
    explanation: {
      en: 'Combines ADR and Occupancy into a single metric.',
      pt: 'Combina ADR e Ocupação em uma única métrica de eficiência.'
    },
    calculation: {
      en: 'RevPAR = ADR × Occupancy Rate',
      pt: 'RevPAR = ADR × Taxa de Ocupação'
    }
  },
  CAPEX: {
    term: 'CapEx',
    acronym: 'CapEx',
    meaning: {
      en: 'Capital Expenditures',
      pt: 'Despesas de Capital'
    },
    explanation: {
      en: 'Investments in long-term assets, renovations, and replacement reserves.',
      pt: 'Investimentos em ativos de longo prazo, renovações e reservas de substituição.'
    },
    calculation: {
      en: 'CapEx = Construction + Renovations + Reserves',
      pt: 'CapEx = Construção + Renovações + Reservas'
    }
  },
  DCF: {
    term: 'DCF',
    acronym: 'DCF',
    meaning: {
      en: 'Discounted Cash Flow',
      pt: 'Fluxo de Caixa Descontado'
    },
    explanation: {
      en: 'Valuation method using expected future cash flows and time value of money.',
      pt: 'Método de avaliação usando fluxos de caixa futuros esperados trazidos a valor presente.'
    },
    calculation: {
      en: 'DCF Value = Σ (Cash Flow / (1 + r)^t)',
      pt: 'Valor DCF = Σ (Fluxo de Caixa / (1 + r)^t)'
    }
  },
  VAR: {
    term: 'VaR',
    acronym: 'VaR',
    meaning: {
      en: 'Value at Risk',
      pt: 'Value at Risk (Valor em Risco)'
    },
    explanation: {
      en: 'Estimates maximum potential loss at a given confidence level (e.g., 95%).',
      pt: 'Estima a perda potencial máxima com um nível de confiança (ex: 95%).'
    },
    calculation: {
      en: 'VaR(95%) = Value at 5th percentile',
      pt: 'VaR(95%) = Valor no percentil 5'
    }
  },
  CVAR: {
    term: 'CVaR',
    acronym: 'CVaR',
    meaning: {
      en: 'Conditional Value at Risk',
      pt: 'Conditional Value at Risk (Expected Shortfall)'
    },
    explanation: {
      en: 'Average loss in worst-case scenarios beyond the VaR threshold.',
      pt: 'Média das perdas nos piores cenários que excedem o VaR.'
    },
    calculation: {
      en: 'CVaR = Average of losses beyond VaR',
      pt: 'CVaR = Média das perdas além do VaR'
    }
  },
  PERCENTILES: {
    term: 'P10/P50/P90',
    acronym: 'P10/P50/P90',
    meaning: {
      en: 'Percentiles (P10, P50, P90)',
      pt: 'Percentis (P10, P50, P90)'
    },
    explanation: {
      en: 'Statistical percentiles: P10 (conservative), P50 (median), P90 (optimistic).',
      pt: 'Percentis estatísticos: P10 (conservador), P50 (mediana), P90 (otimista).'
    },
    calculation: {
      en: 'Distribution thresholds',
      pt: 'Limiares de distribuição'
    }
  },
  CATCH_UP: {
    term: 'Catch-up',
    acronym: 'Catch-up',
    meaning: {
      en: 'Waterfall Catch-up',
      pt: 'Cláusula de Catch-up'
    },
    explanation: {
      en: 'Mechanism allowing GP to "catch up" to their profit share after LP gets preferred return.',
      pt: 'Mecanismo que permite ao GP "alcançar" sua fatia de lucro após o LP receber o retorno preferencial.'
    },
    calculation: {
      en: 'Allocations until GP Share matches target split',
      pt: 'Alocações até que a parte do GP atinja o split alvo'
    }
  },
  CLAWBACK: {
    term: 'Clawback',
    acronym: 'Clawback',
    meaning: {
      en: 'Clawback Provision',
      pt: 'Cláusula de Clawback'
    },
    explanation: {
      en: 'Mechanism allowing LPs to recover excess distributions from GPs if final returns underperform.',
      pt: 'Mecanismo que permite aos LPs recuperar distribuições em excesso dos GPs se o retorno final for baixo.'
    },
    calculation: {
      en: 'Max(0, GP Excess - GP Entitled)',
      pt: 'Máx(0, Excesso GP - Direito GP)'
    }
  },
  HURDLE: {
    term: 'Hurdle',
    acronym: 'Hurdle',
    meaning: {
      en: 'Hurdle Rate',
      pt: 'Taxa de Hurdle'
    },
    explanation: {
      en: 'Minimum return (IRR) required before moving to the next distribution tier.',
      pt: 'Retorno mínimo (TIR) necessário antes de passar para o próximo nível de distribuição (promote).'
    },
    calculation: {
      en: 'Target IRR for tier activation',
      pt: 'TIR alvo para ativação do tier'
    }
  },
  PROMOTE: {
    term: 'Promote',
    acronym: 'Promote',
    meaning: {
      en: 'Promote (Carried Interest)',
      pt: 'Promote (Carried Interest)'
    },
    explanation: {
      en: 'GP\'s share of profits above preferred return, aligning incentives.',
      pt: 'Parcela de lucros do GP acima do retorno preferencial, alinhando incentivos.'
    },
    calculation: {
      en: 'Profit Share above Hurdle',
      pt: 'Participação nos lucros acima do Hurdle'
    }
  },
  USALI: {
    term: 'USALI',
    acronym: 'USALI',
    meaning: {
      en: 'Uniform System of Accounts for the Lodging Industry',
      pt: 'Sistema Uniforme de Contas (USALI)'
    },
    explanation: {
      en: 'Standardized accounting framework for hospitality.',
      pt: 'Estrutura contábil padronizada para a indústria hoteleira.'
    },
    calculation: {
      en: 'Revenue → GOP → NOI',
      pt: 'Receita → GOP → NOI'
    }
  },
  TERMINAL_GROWTH: {
    term: 'Terminal Growth',
    acronym: 'g',
    meaning: {
      en: 'Terminal Growth Rate',
      pt: 'Taxa de Crescimento Terminal (Perpetuidade)'
    },
    explanation: {
      en: 'Perpetual growth rate used to calculate terminal value (typically 1-3%).',
      pt: 'Taxa de crescimento perpétuo usada para calcular o valor residual (tipicamente 1-3%).'
    },
    calculation: {
      en: 'TV = CFCn × (1+g) / (r-g)',
      pt: 'Valor Terminal = Fluxo Final × (1+g) / (r-g)'
    }
  },
  DISCOUNT_RATE: {
    term: 'Discount Rate',
    acronym: 'r',
    meaning: {
      en: 'Discount Rate',
      pt: 'Taxa de Desconto'
    },
    explanation: {
      en: 'Rate used to discount future cash flows, reflecting risk and opportunity cost.',
      pt: 'Taxa usada para descontar fluxos futuros, refletindo risco e custo de oportunidade.'
    },
    calculation: {
      en: 'WACC or Cost of Equity',
      pt: 'WACC ou Custo de Equity'
    }
  },
  DEPARTMENTAL_EXPENSES: {
    term: 'Departmental Expenses',
    acronym: 'Dept Exp',
    meaning: {
      en: 'Departmental Expenses',
      pt: 'Despesas Departamentais'
    },
    explanation: {
      en: 'Direct expenses attributable to revenue departments (COGS, direct labor).',
      pt: 'Despesas diretas atribuíveis aos departamentos de receita (CMV, mão de obra direta).'
    },
    calculation: {
      en: 'COGS + Direct Labor',
      pt: 'CMV + Mão de Obra Direta'
    }
  },
  UNDISTRIBUTED_EXPENSES: {
    term: 'Undistributed Expenses',
    acronym: 'Undistributed',
    meaning: {
      en: 'Undistributed Expenses',
      pt: 'Despesas Não-Distribuídas'
    },
    explanation: {
      en: 'Overhead expenses not tied to specific departments (Admin, Marketing, Utilities).',
      pt: 'Despesas gerais não ligadas a departamentos específicos (Admin, Marketing, Utilidades).'
    },
    calculation: {
      en: 'Admin + Marketing + Utilities + Insurance',
      pt: 'Admin + Marketing + Utilidades + Seguros'
    }
  },
  REPLACEMENT_RESERVE: {
    term: 'Replacement Reserve',
    acronym: 'FF&E Reserve',
    meaning: {
      en: 'Replacement Reserve',
      pt: 'Reserva de Substituição (FF&E)'
    },
    explanation: {
      en: 'Funds for replacement of FF&E, typically % of revenue.',
      pt: 'Fundos para substituição de FF&E (Mobiliário), tipicamente % da receita.'
    },
    calculation: {
      en: '% of Total Revenue',
      pt: '% da Receita Total'
    }
  },
  MANAGEMENT_FEES: {
    term: 'Management Fees',
    acronym: 'Mgmt Fees',
    meaning: {
      en: 'Management Fees',
      pt: 'Taxas de Gestão/Administração'
    },
    explanation: {
      en: 'Fees paid to operator, typically % of Revenue or GOP.',
      pt: 'Taxas pagas ao operador, tipicamente % da Receita ou GOP.'
    },
    calculation: {
      en: '% Revenue + Incentive Fee',
      pt: '% da Receita + Taxa de Incentivo'
    }
  },
  REFINANCING: {
    term: 'Refinancing',
    acronym: 'Refi',
    meaning: {
      en: 'Refinancing',
      pt: 'Refinanciamento'
    },
    explanation: {
      en: 'Replacing existing debt with new debt to improve terms or extract equity.',
      pt: 'Substituição da dívida existente por uma nova para melhorar condições ou extrair capital.'
    },
    calculation: {
      en: 'New Loan - Old Loan',
      pt: 'Novo Empréstimo - Empréstimo Antigo'
    }
  },
  TRANSACTION_COSTS: {
    term: 'Transaction Costs',
    acronym: 'Closing Costs',
    meaning: {
      en: 'Transaction Costs',
      pt: 'Custos de Transação'
    },
    explanation: {
      en: 'Fees incurred during deal closing (legal, advisory, origination).',
      pt: 'Taxas incorridas no fechamento do negócio (jurídico, assessoria, originação).'
    },
    calculation: {
      en: 'Sum of all closing fees',
      pt: 'Soma de todas as taxas de fechamento'
    }
  },
  EXIT_FEE: {
    term: 'Exit Fee',
    acronym: 'Exit Fee',
    meaning: {
      en: 'Exit Fee',
      pt: 'Taxa de Saída'
    },
    explanation: {
      en: 'Fee charged upon debt repayment.',
      pt: 'Taxa cobrada no momento da quitação da dívida.'
    },
    calculation: {
      en: '% of Principal',
      pt: '% do Principal'
    }
  },
  ORIGINATION_FEE: {
    term: 'Origination Fee',
    acronym: 'Orig Fee',
    meaning: {
      en: 'Origination Fee',
      pt: 'Taxa de Originação'
    },
    explanation: {
      en: 'Upfront fee charged by lender.',
      pt: 'Taxa inicial cobrada pelo credor.'
    },
    calculation: {
      en: '% of Loan Amount',
      pt: '% do Valor do Empréstimo'
    }
  },
  RETURN_OF_CAPITAL: {
    term: 'Return of Capital',
    acronym: 'ROC',
    meaning: {
      en: 'Return of Capital',
      pt: 'Retorno de Capital'
    },
    explanation: {
      en: 'Distribution of cash to return initial investment.',
      pt: 'Distribuição de caixa para devolver o investimento inicial.'
    },
    calculation: {
      en: 'Distributions up to Contribution amount',
      pt: 'Distribuições até o valor da Contribuição'
    }
  },
  PREFERRED_RETURN: {
    term: 'Preferred Return',
    acronym: 'Pref',
    meaning: {
      en: 'Preferred Return',
      pt: 'Retorno Preferencial'
    },
    explanation: {
      en: 'Priority return paid to investors before promote.',
      pt: 'Retorno prioritário pago aos investidores antes do promote.'
    },
    calculation: {
      en: 'Yield on Unreturned Capital',
      pt: 'Yield sobre Capital Não-Devolvido'
    }
  },
  SENIOR_DEBT: {
    term: 'Senior Debt',
    acronym: 'Senior',
    meaning: {
      en: 'Senior Debt',
      pt: 'Dívida Sênior'
    },
    explanation: {
      en: 'Primary loan with first priority on cash flows and collateral.',
      pt: 'Empréstimo principal com prioridade nos fluxos de caixa e garantias.'
    },
    calculation: {
      en: 'First Lien Debt',
      pt: 'Dívida de Primeira Garantia'
    }
  },
  SUBORDINATED_DEBT: {
    term: 'Subordinated Debt',
    acronym: 'Mezzanine',
    meaning: {
      en: 'Subordinated/Mezzanine Debt',
      pt: 'Dívida Subordinada/Mezzanine'
    },
    explanation: {
      en: 'Junior debt repaid after senior debt, typically higher interest.',
      pt: 'Dívida júnior paga após a sênior, tipicamente com juros maiores.'
    },
    calculation: {
      en: 'Second Lien Debt',
      pt: 'Dívida de Segunda Garantia'
    }
  },
  AMORTIZATION: {
    term: 'Amortization',
    acronym: 'Amort',
    meaning: {
      en: 'Amortization',
      pt: 'Amortização'
    },
    explanation: {
      en: 'Scheduled repayment of loan principal.',
      pt: 'Pagamento programado do principal do empréstimo.'
    },
    calculation: {
      en: 'Principal Reduction',
      pt: 'Redução do Principal'
    }
  },
  WORKING_CAPITAL: {
    term: 'Working Capital',
    acronym: 'WK / Capital Giro',
    meaning: {
      en: 'Working Capital',
      pt: 'Capital de Giro'
    },
    explanation: {
      en: 'Capital required for day-to-day operations.',
      pt: 'Capital necessário para as operações do dia-a-dia.'
    },
    calculation: {
      en: 'Current Assets - Current Liabilities',
      pt: 'Ativo Circulante - Passivo Circulante'
    }
  }
};
