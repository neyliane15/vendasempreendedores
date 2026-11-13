import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { extrairNota } from '../src/lib/parser.ts'

test('NFC-e com item numa linha e quantidade/preço na linha de baixo', () => {
  const r = extrairNota(`SUPERMERCADO BOM PRECO LTDA
CNPJ: 12.345.678/0001-90
DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRONICA
# CODIGO DESCRICAO QTD UN VL UNIT VL TOTAL
001 7891234567890 FARINHA DE TRIGO 1KG
2 UN X 6,49 12,98
002 7899876543210 LEITE CONDENSADO 395G
1 UN X 7,50 7,50
003 2000000000001 QUEIJO MUSSARELA
0,450 KG X 39,90 17,96
QTD. TOTAL DE ITENS 3
VALOR TOTAL R$ 38,44
Cartao de Debito 38,44
Emissao: 12/11/2026 10:32:05`)
  assert.equal(r.data, '2026-11-12')
  assert.equal(r.local, 'Supermercado Bom Preco Ltda')
  assert.deepEqual(r.itens, [
    { nome: 'Farinha De Trigo', quantidade: 2, unidade: 'kg', preco: 12.98 },
    { nome: 'Leite Condensado', quantidade: 395, unidade: 'g', preco: 7.5 },
    { nome: 'Queijo Mussarela', quantidade: 0.45, unidade: 'kg', preco: 17.96 },
  ])
})

test('NFC-e tudo na mesma linha', () => {
  const r = extrairNota(`001 7891000100103 ACUCAR CRISTAL 1KG 1 UN X 4,99 4,99
002 7891000055120 OLEO SOJA 900ML 3 UN x 8,90 26,70
TOTAL 31,69`)
  assert.deepEqual(r.itens, [
    { nome: 'Acucar Cristal', quantidade: 1, unidade: 'kg', preco: 4.99 },
    { nome: 'Oleo Soja', quantidade: 2700, unidade: 'ml', preco: 26.7 },
  ])
})

test('recibo simples / papel escrito à mão', () => {
  const r = extrairNota(`Feira do Zé 05/11/26
Ovos 30 un ... 18,90
2kg acucar - 9,90
Chocolate em po R$ 12,00
Total 40,80`)
  assert.equal(r.data, '2026-11-05')
  assert.deepEqual(r.itens.map((i) => [i.nome, i.quantidade, i.unidade, i.preco]), [
    ['Ovos', 30, 'un', 18.9],
    ['Acucar', 2, 'kg', 9.9],
    ['Chocolate Em Po', 1, 'un', 12],
  ])
})

test('erros comuns do OCR: O no lugar de 0 e espaço na vírgula', () => {
  const r = extrairNota(`MARGARINA 500G 8,9O
FERMENTO 100G 3, 49`)
  assert.deepEqual(r.itens.map((i) => i.preco), [8.9, 3.49])
})

test('código de barras lido com letras e zero no meio de palavra', () => {
  const r = extrairNota(`005 7896ba558ana19 CHOCOLATE EM PO 200G
1 UN X 12,00 12,00
004 7891000055120 OLEO DE S0JA 900ML
1 UN X 8,90 8,90`)
  assert.deepEqual(r.itens.map((i) => i.nome), ['Chocolate Em Po', 'Oleo De Soja'])
})

test('total da nota lido como produto é descartado', () => {
  const r = extrairNota(`CAFE EXPRESSO 1,00
PAO FRANCES 11,99
SUCO 4,99
Ct: Loucos 1 Uh 19,98
3526 1112 3453 2500 0103 6500 0040 0123 4567 8901 2345
DOCES 2,00`)
  assert.deepEqual(r.itens.map((i) => i.preco), [1, 11.99, 4.99, 2])
})
