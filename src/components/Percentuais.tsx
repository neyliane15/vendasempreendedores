import { CUSTOS_EXTRAS, PADROES_MERCADO, somaPct } from '../lib/calc'
import type { Negocio } from '../lib/types'

export function Percentuais({ n, onChange }: { n: Negocio; onChange: (n: Negocio) => void }) {
  return (
    <div className="pilha">
      {CUSTOS_EXTRAS.map((c) => (
        <div key={c.chave}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>{c.icone}</span>
            <b style={{ flex: 1, fontSize: 13.5 }}>{c.rotulo}</b>
            <div className="prefixo" style={{ width: 92 }}>
              <input
                className="entrada"
                style={{ padding: '9px 26px 9px 10px', textAlign: 'right' }}
                type="number"
                inputMode="decimal"
                min="0"
                max="200"
                value={n[c.chave]}
                onChange={(e) => onChange({ ...n, [c.chave]: Number(e.target.value) || 0 })}
              />
              <span style={{ left: 'auto', right: 10 }}>%</span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={c.chave === 'mao_obra_pct' ? 60 : 25}
            value={n[c.chave]}
            onChange={(e) => onChange({ ...n, [c.chave]: Number(e.target.value) })}
            style={{ width: '100%', accentColor: 'var(--tomate)' }}
          />
          <small style={{ color: 'var(--suave)', fontSize: 12 }}>
            {c.dica} Sugestão: <b>{PADROES_MERCADO[c.chave]}%</b>
          </small>
        </div>
      ))}
      <div className="aviso">
        Somando tudo, o app acrescenta <b>{somaPct(n)}%</b> sobre o valor dos ingredientes de cada receita.
      </div>
    </div>
  )
}
