'use client';

import React, { useState } from 'react';
import { Activity, Eye, EyeOff, Info } from 'lucide-react';
import styles from './simulation.module.css';

export type TracePoint = { x: number; y: number; y2?: number };

export type PlotPanelProps = {
  title: string;
  subtitle?: string;
  xLabel: string;
  yLabel: string;
  y2Label?: string;
  xUnit?: string;
  yUnit?: string;
  y2Unit?: string;
  isLogX?: boolean;
  data: TracePoint[];
  dcGain?: number;
  gbwHz?: number;
  phaseMarginDeg?: number;
};

export function PlotPanel({
  title,
  subtitle,
  xLabel,
  yLabel,
  y2Label,
  xUnit = 'Hz',
  yUnit = 'dB',
  y2Unit = 'deg',
  isLogX = true,
  data,
  dcGain,
  gbwHz,
  phaseMarginDeg,
}: PlotPanelProps) {
  const [showMagnitude, setShowMagnitude] = useState(true);
  const [showPhase, setShowPhase] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className={styles.plotContainer}>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <Activity size={24} style={{ marginBottom: '8px', opacity: 0.6 }} />
          <div>No simulation trace data available for plotting.</div>
        </div>
      </div>
    );
  }

  // SVG viewBox bounds
  const width = 800;
  const height = 280;
  const padL = 60;
  const padR = y2Label ? 60 : 20;
  const padT = 30;
  const padB = 40;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  // Domain calculations
  const xVals = data.map((d) => d.x);
  const minX = isLogX ? Math.log10(Math.max(1e-3, Math.min(...xVals))) : Math.min(...xVals);
  const maxX = isLogX ? Math.log10(Math.max(1, Math.max(...xVals))) : Math.max(...xVals);

  const yVals = data.map((d) => d.y);
  const minY = Math.floor(Math.min(...yVals) / 10) * 10 - 10;
  const maxY = Math.ceil(Math.max(...yVals) / 10) * 10 + 10;

  const y2Vals = data.map((d) => d.y2 ?? 0);
  const minY2 = -180;
  const maxY2 = 180;

  // Map data to SVG coordinates
  const getXPixel = (xVal: number) => {
    const val = isLogX ? Math.log10(Math.max(1e-3, xVal)) : xVal;
    return padL + ((val - minX) / (maxX - minX || 1)) * plotW;
  };

  const getYPixel = (yVal: number) => {
    return padT + plotH - ((yVal - minY) / (maxY - minY || 1)) * plotH;
  };

  const getY2Pixel = (y2Val: number) => {
    return padT + plotH - ((y2Val - minY2) / (maxY2 - minY2 || 1)) * plotH;
  };

  // Generate SVG paths
  const magPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getXPixel(d.x).toFixed(1)} ${getYPixel(d.y).toFixed(1)}`)
    .join(' ');

  const hasY2 = data.some((d) => d.y2 !== undefined);
  const phasePath = hasY2
    ? data
        .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getXPixel(d.x).toFixed(1)} ${getY2Pixel(d.y2!).toFixed(1)}`)
        .join(' ')
    : '';

  // X Ticks
  const xTicks = [0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
    const valLog = minX + ratio * (maxX - minX);
    const valHz = isLogX ? Math.pow(10, valLog) : valLog;
    let label = '';
    if (valHz >= 1e9) label = `${(valHz / 1e9).toFixed(1)} G${xUnit}`;
    else if (valHz >= 1e6) label = `${(valHz / 1e6).toFixed(1)} M${xUnit}`;
    else if (valHz >= 1e3) label = `${(valHz / 1e3).toFixed(1)} k${xUnit}`;
    else label = `${valHz.toFixed(0)} ${xUnit}`;
    return { x: padL + ratio * plotW, label };
  });

  // Y Ticks
  const yTicks = [0, 0.33, 0.66, 1.0].map((ratio) => {
    const val = minY + ratio * (maxY - minY);
    return { y: padT + plotH - ratio * plotH, label: `${val.toFixed(0)} ${yUnit}` };
  });

  // Y2 Ticks
  const y2Ticks = [0, 0.5, 1.0].map((ratio) => {
    const val = minY2 + ratio * (maxY2 - minY2);
    return { y: padT + plotH - ratio * plotH, label: `${val.toFixed(0)} ${y2Unit}` };
  });

  const hoverData = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className={styles.plotContainer}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h4>
          {subtitle && <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{subtitle}</p>}
        </div>

        {/* Legend Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setShowMagnitude(!showMagnitude)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: showMagnitude ? 'var(--accent)' : 'var(--text-disabled)',
              cursor: 'pointer',
            }}
          >
            {showMagnitude ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>Magnitude ({yUnit})</span>
          </button>

          {hasY2 && (
            <button
              type="button"
              onClick={() => setShowPhase(!showPhase)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: showPhase ? '#f472b6' : 'var(--text-disabled)',
                cursor: 'pointer',
              }}
            >
              {showPhase ? <Eye size={12} /> : <EyeOff size={12} />}
              <span>Phase ({y2Unit})</span>
            </button>
          )}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles.plotSvg}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mouseX = ((e.clientX - rect.left) / rect.width) * width;
          if (mouseX >= padL && mouseX <= width - padR) {
            const ratio = (mouseX - padL) / plotW;
            const idx = Math.min(data.length - 1, Math.max(0, Math.floor(ratio * data.length)));
            setHoverIndex(idx);
          }
        }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Gridlines */}
        {xTicks.map((t, idx) => (
          <g key={idx}>
            <line x1={t.x} y1={padT} x2={t.x} y2={padT + plotH} className={styles.plotGridLine} />
            <text x={t.x} y={height - 12} fill="var(--text-tertiary)" fontSize="9.5" textAnchor="middle" fontFamily="var(--font-mono)">
              {t.label}
            </text>
          </g>
        ))}

        {yTicks.map((t, idx) => (
          <g key={idx}>
            <line x1={padL} y1={t.y} x2={width - padR} y2={t.y} className={styles.plotGridLine} />
            <text x={padL - 8} y={t.y + 3} fill="var(--text-tertiary)" fontSize="9.5" textAnchor="end" fontFamily="var(--font-mono)">
              {t.label}
            </text>
          </g>
        ))}

        {hasY2 &&
          y2Ticks.map((t, idx) => (
            <text key={idx} x={width - padR + 8} y={t.y + 3} fill="#f472b6" fontSize="9.5" textAnchor="start" fontFamily="var(--font-mono)">
              {t.label}
            </text>
          ))}

        {/* Traces */}
        {showMagnitude && <path d={magPath} className={styles.plotTracePath} />}
        {hasY2 && showPhase && <path d={phasePath} className={styles.plotPhasePath} />}

        {/* Cursors & Hover indicator */}
        {hoverData && (
          <g>
            <line x1={getXPixel(hoverData.x)} y1={padT} x2={getXPixel(hoverData.x)} y2={padT + plotH} stroke="var(--accent)" strokeWidth="1" strokeDasharray="2" />
            <circle cx={getXPixel(hoverData.x)} cy={getYPixel(hoverData.y)} r="4" fill="var(--accent)" />
            {hoverData.y2 !== undefined && (
              <circle cx={getXPixel(hoverData.x)} cy={getY2Pixel(hoverData.y2)} r="4" fill="#f472b6" />
            )}
          </g>
        )}
      </svg>

      {/* Hover Info Banner */}
      {hoverData && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          <span>X: <b>{hoverData.x.toExponential(2)} {xUnit}</b></span>
          <span>Y1: <b>{hoverData.y.toFixed(2)} {yUnit}</b></span>
          {hoverData.y2 !== undefined && <span>Y2: <b>{hoverData.y2.toFixed(2)} {y2Unit}</b></span>}
        </div>
      )}

      {/* Spec Markers Highlights */}
      {(dcGain !== undefined || gbwHz !== undefined || phaseMarginDeg !== undefined) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', padding: '8px 12px', backgroundColor: 'var(--bg-sunken)', borderRadius: 'var(--radius-xs)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
          {dcGain !== undefined && <span>DC Gain: <b style={{ color: 'var(--accent)' }}>{dcGain.toFixed(1)} dB</b></span>}
          {gbwHz !== undefined && <span>GBW: <b style={{ color: 'var(--accent)' }}>{(gbwHz / 1e6).toFixed(1)} MHz</b></span>}
          {phaseMarginDeg !== undefined && <span>Phase Margin: <b style={{ color: 'var(--success-text)' }}>{phaseMarginDeg.toFixed(1)}°</b></span>}
        </div>
      )}
    </div>
  );
}
