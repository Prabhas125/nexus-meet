/**
 * Collaborative Whiteboard Component
 * HTML5 Canvas with real-time sync via Socket.io
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';

const COLORS = ['#000000', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'];
const TOOLS = ['pen', 'eraser', 'line', 'rect', 'circle'];

const Whiteboard = ({ socket, roomCode }) => {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const snapshotRef = useRef(null); // For shape previews

  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(4);

  // ─── Canvas context helper ────────────────────────────────────────────────────
  const getCtx = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    return ctx;
  };

  // Resize canvas to fill container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvas.getContext('2d').putImageData(imageData, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ─── Socket listeners for remote drawing ──────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleDraw = ({ drawData }) => {
      const ctx = getCtx();
      if (!ctx) return;
      drawOnCanvas(ctx, drawData, false);
    };

    const handleClear = () => {
      const ctx = getCtx();
      const canvas = canvasRef.current;
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    socket.on('whiteboard-draw', handleDraw);
    socket.on('whiteboard-clear', handleClear);

    return () => {
      socket.off('whiteboard-draw', handleDraw);
      socket.off('whiteboard-clear', handleClear);
    };
  }, [socket]);

  // ─── Core drawing function ────────────────────────────────────────────────────
  const drawOnCanvas = (ctx, data, emit = true) => {
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (data.tool === 'pen' || data.tool === 'eraser') {
      if (data.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = data.lineWidth * 4;
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.beginPath();
      ctx.moveTo(data.from.x, data.from.y);
      ctx.lineTo(data.to.x, data.to.y);
      ctx.stroke();
    } else if (data.tool === 'line') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      ctx.moveTo(data.from.x, data.from.y);
      ctx.lineTo(data.to.x, data.to.y);
      ctx.stroke();
    } else if (data.tool === 'rect') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      ctx.strokeRect(data.from.x, data.from.y, data.to.x - data.from.x, data.to.y - data.from.y);
    } else if (data.tool === 'circle') {
      ctx.globalCompositeOperation = 'source-over';
      const rx = (data.to.x - data.from.x) / 2;
      const ry = (data.to.y - data.from.y) / 2;
      ctx.beginPath();
      ctx.ellipse(data.from.x + rx, data.from.y + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (emit) {
      socket?.emit('whiteboard-draw', { roomCode, drawData: data });
    }
  };

  // ─── Pointer event handlers ───────────────────────────────────────────────────
  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0] || e;
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    const pos = getPos(e);
    isDrawing.current = true;
    lastPos.current = pos;
    startPos.current = pos;

    // Save snapshot for shape preview
    if (['line', 'rect', 'circle'].includes(tool)) {
      const canvas = canvasRef.current;
      snapshotRef.current = getCtx().getImageData(0, 0, canvas.width, canvas.height);
    }
  };

  const onPointerMove = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = getCtx();

    if (['line', 'rect', 'circle'].includes(tool)) {
      // Restore snapshot and draw preview
      if (snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
      }
      drawOnCanvas(ctx, { tool, color, lineWidth, from: startPos.current, to: pos }, false);
    } else {
      drawOnCanvas(ctx, { tool, color, lineWidth, from: lastPos.current, to: pos });
      lastPos.current = pos;
    }
  };

  const onPointerUp = (e) => {
    if (!isDrawing.current) return;
    const pos = getPos(e);
    isDrawing.current = false;

    if (['line', 'rect', 'circle'].includes(tool)) {
      const ctx = getCtx();
      if (snapshotRef.current) ctx.putImageData(snapshotRef.current, 0, 0);
      drawOnCanvas(ctx, { tool, color, lineWidth, from: startPos.current, to: pos });
      snapshotRef.current = null;
    }
  };

  const clearCanvas = () => {
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      socket?.emit('whiteboard-clear', { roomCode });
    }
  };

  const toolLabel = { pen: '✏️ Pen', eraser: '🧹 Eraser', line: '📏 Line', rect: '⬜ Rect', circle: '⭕ Circle' };

  return (
    <div className="whiteboard-container">
      {/* Toolbar */}
      <div className="whiteboard-toolbar">
        {TOOLS.map(t => (
          <button key={t} className={`tool-btn ${tool === t ? 'active' : ''}`} onClick={() => setTool(t)}>
            {toolLabel[t]}
          </button>
        ))}
        <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
        {COLORS.map(c => (
          <button
            key={c}
            className={`color-btn ${color === c ? 'active' : ''}`}
            style={{ background: c, border: `2px solid ${color === c ? '#fff' : 'transparent'}` }}
            onClick={() => setColor(c)}
          />
        ))}
        <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Size</span>
        <input
          className="size-slider"
          type="range"
          min={1}
          max={20}
          value={lineWidth}
          onChange={e => setLineWidth(+e.target.value)}
        />
        <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 16 }}>{lineWidth}</span>
        <div style={{ marginLeft: 'auto' }}>
          <button className="tool-btn" onClick={clearCanvas}>🗑️ Clear</button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="whiteboard-canvas"
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      />
    </div>
  );
};

export default Whiteboard;
