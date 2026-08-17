'use client';

import { useMemo, useState } from 'react';
import { Check, CircleAlert, Cpu, Play, RefreshCw, Terminal } from 'lucide-react';
import { defaultSpecsFor } from '@/lib/repository-registry';
import type { DesignConfig } from '@/lib/validation';
import styles from './cadence.module.css';

const defaultConfig: DesignConfig = {
  circuitId: 'ota', topologyId: '5t-ota', technologyId: 'tsmcN65', vdd: 1.2, temperature: 27, corner: 'TT', specs: defaultSpecsFor('ota'), sizingMethod: 'manual',
  devices: [
    { device:'M1', type:'NMOS', totalW:'2u', L:'240n', NF:1, M:1 }, { device:'M2', type:'NMOS', totalW:'2u', L:'240n', NF:1, M:1 },
    { device:'M3', type:'PMOS', totalW:'4u', L:'480n', NF:1, M:1 }, { device:'M4', type:'PMOS', totalW:'4u', L:'480n', NF:1, M:1 },
    { device:'M5', type:'NMOS', totalW:'6u', L:'480n', NF:1, M:1 },
  ],
};

export default function CadenceBridgePage() {
  const [text, setText] = useState(JSON.stringify(defaultConfig, null, 2));
  const [dryRun, setDryRun] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const config = useMemo(() => { try { return JSON.parse(text) as DesignConfig; } catch { return null; } }, [text]);

  async function run() {
    setBusy(true); setError(null); setResult(null);
    try {
      if (!config) throw new Error('Configuration JSON is invalid.');
      const response = await fetch('/api/cadence/execute', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ config, dryRun }) });
      const body = await response.json();
      if (!response.ok && !body?.status) throw new Error(body?.message ?? body?.issues?.[0]?.message ?? 'Cadence bridge request failed.');
      setResult(body);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  return <div>
    <header className={styles.pageHeader}>
      <div>
        <div className={styles.eyebrow}>EXECUTION / BRIDGE</div>
        <h1 className={styles.pageTitle}>Run a repository generator in Cadence</h1>
        <p className={styles.pageSub}>The bridge stages the validated parameterized artifact into the configured Linux environment. Spectre remains disabled.</p>
      </div>
      <span className={styles.boundary}><Terminal size={15}/>SSH/SCP → VIRTUOSO IC6.1.7</span>
    </header>
    <div className={styles.grid}>
      <section className={styles.card}><div className={styles.cardTitle}><Cpu size={16}/>Design configuration</div><textarea className={styles.textarea} value={text} onChange={e=>setText(e.target.value)} spellCheck={false}/><div className={styles.controls}><label><input type="checkbox" checked={dryRun} onChange={e=>setDryRun(e.target.checked)}/> Dry run — do not invoke Cadence</label><button className={styles.runButton} onClick={run} disabled={busy || !config}>{busy ? <><RefreshCw className={styles.spin}/>Running…</> : <><Play/> {dryRun ? 'Preview Execution' : 'Run in Cadence'}</>}</button></div></section>
      <section className={styles.card}><div className={styles.cardTitle}>{result?.status === 'succeeded' || result?.status === 'dry-run' ? <Check size={16}/> : <CircleAlert size={16}/>}Execution result</div>{!result && !error && <div className={styles.empty}>Run a dry preview first. Enable the bridge through environment variables before attempting real execution.</div>}{error && <pre className={styles.output}>{error}</pre>}{result && <div className={styles.result}><div className={`${styles.status} ${result.status === 'succeeded' || result.status === 'dry-run' ? styles.statusOk : result.status === 'failed' ? styles.statusBad : ''}`}><b>{result.status}</b><span>Cadence executed: {String(result.cadenceExecuted)}</span></div><div className={styles.rows}><Row k="Generator" v={result.sourceGenerator}/><Row k="Remote artifact" v={result.remoteFiles?.artifact}/><Row k="Remote wrapper" v={result.remoteFiles?.wrapper}/><Row k="Log" v={result.remoteFiles?.log}/><Row k="Exit code" v={String(result.exitCode)}/></div><div className={styles.evidence}><b>Evidence</b><pre className={styles.output}>{JSON.stringify(result.evidence, null, 2)}</pre></div>{(result.stdout || result.stderr) && <pre className={styles.output}>{`${result.stdout ?? ''}\n${result.stderr ?? ''}`}</pre>}</div>}</section>
    </div>
  </div>;
}
function Row({k,v}:{k:string;v:string}) { return <div><span>{k}</span><code>{v}</code></div>; }
