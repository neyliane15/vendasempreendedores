import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, erroConfig } from './lib/supabase'
import { TelaAviso, Carregando } from './components/Aviso'
import { db, obterNegocio } from './lib/db'
import type { Compra, Insumo, Negocio, Produto, Venda } from './lib/types'
import Login from './pages/Login'
import BoasVindas from './pages/BoasVindas'
import Painel from './pages/Painel'
import Produtos from './pages/Produtos'
import Compras from './pages/Compras'
import Vendas from './pages/Vendas'
import Ajustes from './pages/Ajustes'
import { Topo, Nav, Toast, type Aba } from './components/Layout'

export interface Dados {
  negocio: Negocio
  produtos: Produto[]
  insumos: Insumo[]
  vendas: Venda[]
  compras: Compra[]
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
  const [compras, setCompras] = useState<Compra[]>([])
  const [aba, setAba] = useState<Aba>('painel')
  const [toast, setToast] = useState('')
  const [erroCarga, setErroCarga] = useState('')

  useEffect(() => {
    if (!supabase) return
    const limite = setTimeout(() => setErroCarga('O Supabase não respondeu. Confira se o projeto está ativo (não pausado) no painel do Supabase.'), 15000)
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSessao(data.session)
        setPronto(true)
      })
      .catch((e) => setErroCarga('Falha ao conectar no Supabase: ' + (e as Error).message))
      .finally(() => clearTimeout(limite))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const logado = !supabase || !!sessao

  const recarregar = useCallback(async () => {
    const [p, i, v, c] = await Promise.all([
      db.produtos.listar(),
      db.insumos.listar(),
      db.vendas.listar(),
      db.compras.listar().catch(() => [] as Compra[]),
    ])
    setProdutos(p)
    setInsumos(i)
    setVendas(v)
    setCompras(c)
  }, [])

  useEffect(() => {
    if (!pronto || !logado) return
    obterNegocio()
      .then((n) => setNegocio(n))
      .catch((e) => setErroCarga('Não consegui ler seus dados: ' + (e as Error).message + '. Confira se o SQL das tabelas foi rodado no Supabase.'))
    recarregar().catch(() => undefined)
  }, [pronto, logado, recarregar])

  const avisar = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2600)
  }, [])

  if (erroConfig) return <TelaAviso titulo="Configuração incompleta" texto={<>{erroConfig}<br /><br />Corrija em Vercel → Settings → Environment Variables e depois faça Redeploy.</>} />
  if (erroCarga) return <TelaAviso titulo="Sem conexão" texto={erroCarga} />
  if (!pronto) return <Carregando />
  if (!logado) return <Login />
  if (negocio === undefined) return <Carregando />
  if (negocio === null) return <BoasVindas aoSalvar={setNegocio} />

  const dados: Dados = { negocio, produtos, insumos, vendas, compras, recarregar, avisar, irPara: setAba, setNegocio }

  return (
    <>
      <Topo nome={negocio.nome} />
      <main>
        {aba === 'painel' && <Painel {...dados} />}
        {aba === 'produtos' && <Produtos {...dados} />}
        {aba === 'escanear' && <Compras {...dados} />}
        {aba === 'vendas' && <Vendas {...dados} />}
        {aba === 'ajustes' && <Ajustes {...dados} />}
      </main>
      <Nav aba={aba} setAba={setAba} />
      {toast && <Toast msg={toast} />}
    </>
  )
}
