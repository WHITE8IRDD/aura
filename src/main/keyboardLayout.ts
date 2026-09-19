export interface KeyDef {
  code: string;
  label: string;
  value?: string;
  width?: number;
  type?: 'function' | 'number' | 'letter' | 'action' | 'arrow';
}

export const FUNCTION_ROW: KeyDef[] = [
  { code: 'Escape', label: 'Esc', type: 'action', width: 1.1 },
  { code: 'F1', label: 'F1', type: 'function' },
  { code: 'F2', label: 'F2', type: 'function' },
  { code: 'F3', label: 'F3', type: 'function' },
  { code: 'F4', label: 'F4', type: 'function' },
  { code: 'F5', label: 'F5', type: 'function' },
  { code: 'F6', label: 'F6', type: 'function' },
  { code: 'F7', label: 'F7', type: 'function' },
  { code: 'F8', label: 'F8', type: 'function' },
  { code: 'F9', label: 'F9', type: 'function' },
  { code: 'F10', label: 'F10', type: 'function' },
  { code: 'F11', label: 'F11', type: 'function' },
  { code: 'F12', label: 'F12', type: 'function' },
];

export const NUMBER_ROW: KeyDef[] = [
  { code: 'Backquote', label: '`', value: '`', type: 'number' },
  { code: 'Digit1', label: '1', value: '1', type: 'number' },
  { code: 'Digit2', label: '2', value: '2', type: 'number' },
  { code: 'Digit3', label: '3', value: '3', type: 'number' },
  { code: 'Digit4', label: '4', value: '4', type: 'number' },
  { code: 'Digit5', label: '5', value: '5', type: 'number' },
  { code: 'Digit6', label: '6', value: '6', type: 'number' },
  { code: 'Digit7', label: '7', value: '7', type: 'number' },
  { code: 'Digit8', label: '8', value: '8', type: 'number' },
  { code: 'Digit9', label: '9', value: '9', type: 'number' },
  { code: 'Digit0', label: '0', value: '0', type: 'number' },
  { code: 'Minus', label: '-', value: '-', type: 'number' },
  { code: 'Equal', label: '=', value: '=', type: 'number' },
  { code: 'Backspace', label: '⌫', type: 'action', width: 1.4 },
];

export const QWERTY_ROWS: KeyDef[][] = [
  [
    { code: 'Tab', label: 'Tab', type: 'action', width: 1.4 },
    { code: 'KeyQ', label: 'q', value: 'q', type: 'letter' },
    { code: 'KeyW', label: 'w', value: 'w', type: 'letter' },
    { code: 'KeyE', label: 'e', value: 'e', type: 'letter' },
    { code: 'KeyR', label: 'r', value: 'r', type: 'letter' },
    { code: 'KeyT', label: 't', value: 't', type: 'letter' },
    { code: 'KeyY', label: 'y', value: 'y', type: 'letter' },
    { code: 'KeyU', label: 'u', value: 'u', type: 'letter' },
    { code: 'KeyI', label: 'i', value: 'i', type: 'letter' },
    { code: 'KeyO', label: 'o', value: 'o', type: 'letter' },
    { code: 'KeyP', label: 'p', value: 'p', type: 'letter' },
    { code: 'BracketLeft', label: '[', value: '[', type: 'number' },
    { code: 'BracketRight', label: ']', value: ']', type: 'number' },
    { code: 'Backslash', label: '\\', value: '\\', type: 'number', width: 1.1 },
  ],
  [
    { code: 'CapsLock', label: 'Caps', type: 'action', width: 1.7 },
    { code: 'KeyA', label: 'a', value: 'a', type: 'letter' },
    { code: 'KeyS', label: 's', value: 's', type: 'letter' },
    { code: 'KeyD', label: 'd', value: 'd', type: 'letter' },
    { code: 'KeyF', label: 'f', value: 'f', type: 'letter' },
    { code: 'KeyG', label: 'g', value: 'g', type: 'letter' },
    { code: 'KeyH', label: 'h', value: 'h', type: 'letter' },
    { code: 'KeyJ', label: 'j', value: 'j', type: 'letter' },
    { code: 'KeyK', label: 'k', value: 'k', type: 'letter' },
    { code: 'KeyL', label: 'l', value: 'l', type: 'letter' },
    { code: 'Semicolon', label: ';', value: ';', type: 'number' },
    { code: 'Quote', label: "'", value: "'", type: 'number' },
    { code: 'Enter', label: '⏎', type: 'action', width: 1.8 },
  ],
  [
    { code: 'ShiftLeft', label: '⇧ Shift', type: 'action', width: 2.2 },
    { code: 'KeyZ', label: 'z', value: 'z', type: 'letter' },
    { code: 'KeyX', label: 'x', value: 'x', type: 'letter' },
    { code: 'KeyC', label: 'c', value: 'c', type: 'letter' },
    { code: 'KeyV', label: 'v', value: 'v', type: 'letter' },
    { code: 'KeyB', label: 'b', value: 'b', type: 'letter' },
    { code: 'KeyN', label: 'n', value: 'n', type: 'letter' },
    { code: 'KeyM', label: 'm', value: 'm', type: 'letter' },
    { code: 'Comma', label: ',', value: ',', type: 'number' },
    { code: 'Period', label: '.', value: '.', type: 'number' },
    { code: 'Slash', label: '/', value: '/', type: 'number' },
    { code: 'ShiftRight', label: '⇧ Shift', type: 'action', width: 2.2 },
  ]
];

export const BOTTOM_ROW: KeyDef[] = [
  { code: 'Space', label: 'Space', value: ' ', type: 'action', width: 5.5 },
];

export const ARROW_CLUSTER: KeyDef[] = [
  { code: 'ArrowLeft', label: '←', type: 'arrow' },
  { code: 'ArrowUp', label: '↑', type: 'arrow' },
  { code: 'ArrowDown', label: '↓', type: 'arrow' },
  { code: 'ArrowRight', label: '→', type: 'arrow' },
];
