import React, { useState, useEffect } from 'react';

const SHIFTED_NUMBERS: Record<string, string> = {
  '`': '~', '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
  '6': '^', '7': '&', '8': '*', '9': '(', '0': ')', '-': '_', '=': '+',
  '[': '{', ']': '}', '\\': '|', ';': ':', "'": '"', ',': '<', '.': '>', '/': '?'
};

export const KeysPanel: React.FC<{ onTyped: (label: string) => void }> = ({ onTyped }) => {
  const [layout, setLayout] = useState<any>(null);
  const [isShift, setIsShift] = useState(false);
  const [isCaps, setIsCaps] = useState(false);

  useEffect(() => {
    window.aura.keyboard.getLayout().then(setLayout);
  }, []);

  if (!layout) return <div className="ak-loading">Loading keys...</div>;

  const handleKeyClick = (key: any) => {
    if (key.code === 'ShiftLeft' || key.code === 'ShiftRight') {
      setIsShift((prev) => !prev);
      return;
    }
    if (key.code === 'CapsLock') {
      setIsCaps((prev) => !prev);
      return;
    }

    if (key.value) {
      let charToType = key.value;
      const shouldUppercase = isShift !== isCaps;

      if (shouldUppercase && charToType.match(/[a-z]/)) {
        charToType = charToType.toUpperCase();
      } else if (isShift && SHIFTED_NUMBERS[charToType]) {
        charToType = SHIFTED_NUMBERS[charToType];
      }

      window.aura.keyboard.type(charToType);
      onTyped(charToType);

      // Reset Shift after single keypress
      if (isShift) setIsShift(false);
    } else {
      // Action or Function key
      window.aura.keyboard.sendKey(key.code);
      onTyped(key.label);
    }
  };

  const renderKey = (key: any) => {
    let displayLabel = key.label;
    const shouldUppercase = isShift !== isCaps;

    if (key.value) {
      if (shouldUppercase && key.value.match(/[a-z]/)) {
        displayLabel = key.value.toUpperCase();
      } else if (isShift && SHIFTED_NUMBERS[key.value]) {
        displayLabel = SHIFTED_NUMBERS[key.value];
      }
    }

    const isActive =
      (key.code.startsWith('Shift') && isShift) ||
      (key.code === 'CapsLock' && isCaps);

    return (
      <button
        key={key.code}
        className={`ak-key ${key.type || ''} ${isActive ? 'active' : ''}`}
        style={{ flex: key.width || 1 }}
        onClick={() => handleKeyClick(key)}
      >
        {displayLabel}
      </button>
    );
  };

  return (
    <div className="ak-keys-container">
      {/* Function Row */}
      <div className="ak-row function-row">
        {layout.FUNCTION_ROW.map(renderKey)}
      </div>

      {/* Number Row */}
      <div className="ak-row">{layout.NUMBER_ROW.map(renderKey)}</div>

      {/* QWERTY Rows */}
      {layout.QWERTY_ROWS.map((row: any[], i: number) => (
        <div key={i} className="ak-row">
          {row.map(renderKey)}
        </div>
      ))}

      {/* Bottom Row */}
      <div className="ak-row bottom-row">
        {layout.BOTTOM_ROW.map(renderKey)}
        <div className="ak-arrow-group">
          {layout.ARROW_CLUSTER.map(renderKey)}
        </div>
      </div>
    </div>
  );
};
