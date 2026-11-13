import { useState } from 'react'
import type { Dados } from '../App'
import { salvarNegocio, db } from '../lib/db'
import { brl } from '../lib/calc'
import { supabase, modoDemo } from '../lib/supabase'
import { Percentuais } from '../components/Percentuais'

export default function Ajustes(d: Dados) {
  const [n, setN] = useState(d.negocio)
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setSalvando(true)
    try {
      d.setNegocio(await salvarNegocio(n))
      d.avisar('Ajustes salvos')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <div className="titulo-secao"><h2>Ajustes</h2></div>
      <div className="cartao pilha">
        <h2>🏪 Seu negócio</h2>
        <input className="entrada" value={n.nome} onChange={(e) => setN({ ...n, nome: e.target.value })} />
      </div>
      <div className="cartao pilha">
        <h2>🧾 Custos escondidos</h2>
        <Percentuais n={n} onChange={setN} />
      </div>
      <button className="botao verde" disabled={salvando} onClick={salvar}>Salvar ajustes</button>

      <div className="cartao">
        <h2>🥚 Meus ingredientes salvos</h2>
        {d.insumos.length === 0 ? (
          <p className="sub">Tire foto de uma nota em “Ler nota” para salvar seus ingredientes e preços.</p>
        ) : (
          d.insumos.map((i) => (
            <div className="linha-lista" key={i.id}>
              <div className="info">
                <b>{i.nome}</b>
                <small>{i.quantidade} {i.unidade}</small>
              </div>
              <span className="valor">{brl(i.preco)}</span>
              <button
                className="icone-btn"
                aria-label="Apagar"
                onClick={async () => {
                  await db.insumos.remover(i.id)
                  await d.recarregar()
                }}
              >🗑️</button>
            </div>
          ))
        )}
      </div>

      {modoDemo ? (
        <div className="aviso">Modo demonstração: os dados ficam salvos só neste celular. Configure o Supabase para usar sua conta.</div>
      ) : (
        <button className="botao claro" onClick={() => supabase!.auth.signOut()}>Sair da conta</button>
      )}
    </>
  )
}
