export interface KeyDef {
  label: string
  value: string
  code?: string
  width?: number
  isModifier?: boolean
}

export const FUNCTION_ROW: KeyDef[] = [
  { label: 'esc', value: '', code: 'Escape', width: 1 },
  ...Array.from({ length: 12 }, (_, i) => ({
    label: `F${i + 1}`, value: '', code: `F${i + 1}`, width: 1,
  })),
]

export const NUMBER_ROW: KeyDef[] = [
  '`','1','2','3','4','5','6','7','8','9','0','-','=',
].map(v => ({ label: v, value: v }))

export const QWERTY_ROWS: KeyDef[][] = [
  ['q','w','e','r','t','y','u','i','o','p','[',']','\\'].map(v => ({ label: v, value: v })),
  ['a','s','d','f','g','h','j','k','l',';','\''].map(v => ({ label: v, value: v })),
  ['z','x','c','v','b','n','m',',','.','/'].map(v => ({ label: v, value: v })),
]

export const BOTTOM_ROW: KeyDef[] = [
  { label: 'space', value: ' ', width: 5 },
  { label: '\u23CE', value: '\n', code: 'Enter', width: 1.4 },
  { label: '\u232B', value: '', code: 'Backspace', width: 1.4 },
]

export const ARROW_CLUSTER: KeyDef[] = [
  { label: '\u2190', value: '', code: 'Left' },
  { label: '\u2191', value: '', code: 'Up' },
  { label: '\u2193', value: '', code: 'Down' },
  { label: '\u2192', value: '', code: 'Right' },
]
