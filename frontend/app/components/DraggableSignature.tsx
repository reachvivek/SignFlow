import { useState } from "react";
import Draggable from "react-draggable";
import { FaCheck, FaTimes } from "react-icons/fa";

interface Props {
  url: string;
  onEnd: (data: any) => void;
  onSet: () => void;
  onCancel: () => void;
}

export default function DraggableSignature({ url, onEnd, onSet, onCancel }: Props) {
  const styles = {
    container: {
      position: 'absolute' as const,
      zIndex: 100000,
      border: '2px solid #3b82f6',
      cursor: 'move',
    },
    controls: {
      position: 'absolute' as const,
      right: 0,
      display: 'inline-block',
      backgroundColor: '#3b82f6',
    },
    smallButton: {
      display: 'inline-block',
      cursor: 'pointer',
      padding: 4,
    },
    img: {
      pointerEvents: 'none' as const,
    }
  };

  return (
    <Draggable onStop={onEnd}>
      <div style={styles.container}>
        <div style={styles.controls}>
          <div style={styles.smallButton} onClick={onSet}>
            <FaCheck color="#22c55e" size={16} />
          </div>
          <div style={styles.smallButton} onClick={onCancel}>
            <FaTimes color="#ef4444" size={16} />
          </div>
        </div>
        <img src={url} width={200} style={styles.img} draggable={false} alt="Signature" />
      </div>
    </Draggable>
  );
}
