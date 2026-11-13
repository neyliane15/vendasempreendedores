import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { db, obterNegocio } from './lib/db'
import type { Insumo, Negocio, Produto, Venda } from './lib/types'
import Login from './pages/Login'
import BoasVindas from './pages/BoasVindas'
import Painel from './pages/Painel'
import Produtos from './pages/Produtos'
import Escanear from './pages/Escanear'
import Vendas from './pages/Vendas'
import Ajustes from './pages/Ajustes'
import { Topo, Nav, Toast, type Aba } from './components/Layout'

export interface Dados {
  negocio: Negocio
  produtos: Produto[]
  insumos: Insumo[]
  vendas: Venda[]
  recarregar: () => Promise<void>
  avisar: (msg: string) => void
  irPara: (a: Aba) => void
  setNegocio: (n: Negocio) => void
}

export default function App() {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [pronto, setPronto] = useState(!supabase)
  const [negocio, setNegocio] = useState<Negocio | null | undefined>(undefined)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [vendas, setVendas] = useState<Venda[]>([])
  const [aba, setAba] = useState<Aba>('painel')
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setPronto(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const logado = !supabase || !!sessao

  const recarregar = useCallback(async () => {
    const [p, i, v] = await Promise.all([db.produtos.listar(), db.insumos.listar(), db.vendas.listar()])
    setProdutos(p)
    setInsumos(i)
    setVendas(v)
  }, [])

  useEffect(() => {
    if (!pronto || !logado) return
    obterNegocio()
      .then((n) => setNegocio(n))
      .catch(() => setNegocio(null))
    recarregar().catch(() => undefined)
  }, [pronto, logado, recarregar])

  const avisar = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2600)
  }, [])

  if (!pronto) return null
  if (!logado) return <Login />
  if (negocio === undefined) return null
  if (negocio === null) return <BoasVindas aoSalvar={setNegocio} />

  const dados: Dados = { negocio, produtos, insumos, vendas, recarregar, avisar, irPara: setAba, setNegocio }

  return (
    <>
      <Topo nome={negocio.nome} />
      <main>
        {aba === 'painel' && <Painel {...dados} />}
        {aba === 'produtos' && <Produtos {...dados} />}
        {aba === 'escanear' && <Escanear {...dados} />}
        {aba === 'vendas' && <Vendas {...dados} />}
        {aba === 'ajustes' && <Ajustes {...dados} />}
      </main>
      <Nav aba={aba} setAba={setAba} />
      {toast && <Toast msg={toast} />}
    </>
  )
}
