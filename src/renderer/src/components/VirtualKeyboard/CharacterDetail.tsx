import React from 'react';

export const CharacterDetail: React.FC<{ item: any }> = ({ item }) => {
  if (!item) {
    return (
      <div className="vk-detail-footer">
        Hover over any character to see code & details
      </div>
    );
  }

  return (
    <div className="vk-detail-footer">
      <span className="vk-detail-char">{item.char}</span>
      <span className="vk-detail-name">{item.name}</span>
      <span className="vk-detail-code">{item.code}</span>
      <span className="vk-detail-hint">(Click to insert • Right-click to copy)</span>
    </div>
  );
};
