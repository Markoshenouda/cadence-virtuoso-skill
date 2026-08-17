'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Check, ChevronLeft, CircleAlert, Cpu, FileCode2, FlaskConical, Gauge, GitBranch, Sparkles, Terminal, Wrench, Zap } from 'lucide-react';
import { circuits, defaultSpecsFor, getTopology, technologies, type SpecGroup, type Topology } from '@/lib/repository-registry';
import { validateDesign, type DesignConfig } from '@/lib/validation';
import { TopologyDiagram } from '@/components/topology-diagram';
import styles from './studio.module.css';

const steps = ['Circuit', 'Topology', 'Technology', 'Specifications', 'Sizing', 'Review'];
type DeviceDraft = DesignConfig['devices'][number];

const initialCircuit = circuits.find(c => c.status === 'available');
const initialTopology = initialCircuit?.topologies[0];
const initialTechnology = technologies[0]?.id ?? '';

export default function StudioPage() {
  return <Suspense fallback={null}><StudioWizard/></Suspense>;
}

function StudioWizard() {
  const params = useSearchParams();
  const preselectedCircuit = params.get('circuit');
  const preselectedTopology = params.get('topology');
  const startCircuit = (preselectedCircuit ? circuits.find(c => c.id === preselectedCircuit && c.status === 'available') : undefined) ?? initialCircuit;
  const startTopology = (preselectedTopology ? startCircuit?.topologies.find(t => t.id === preselectedTopology) : undefined) ?? startCircuit?.topologies[0];
  const [step, setStep] = useState(0);
  const [circuitId, setCircuitId] = useState(startCircuit?.id ?? '');
  const [topologyId, setTopologyId] = useState(startTopology?.id ?? '');
  const [techId, setTechId] = useState(initialTechnology);
  const [vdd, setVdd] = useState(1.2);
  const [temperature, setTemperature] = useState(27);
  const [corner, setCorner] = useState('TT');
  const [sizingMethod, setSizingMethod] = useState<DesignConfig['sizingMethod']>('gmID');
  const [specs, setSpecs] = useState<DesignConfig['specs']>(() => defaultSpecsFor(startCircuit?.id ?? ''));
  const [devices, setDevices] = useState<DeviceDraft[]>(() => defaultDevices(startCircuit?.id ?? '', startTopology?.id ?? ''));
  const [generated, setGenerated] = useState(false);
  const topology = getTopology(circuitId, topologyId);
  const config: DesignConfig = useMemo(() => ({ circuitId, topologyId, technologyId: techId, vdd, temperature, corner, specs, sizingMethod, devices }), [circuitId, topologyId, techId, vdd, temperature, corner, specs, sizingMethod, devices]);
  const issues = validateDesign(config, topology?.generator);
  const errors = issues.filter(i => i.level === 'error');
  function chooseCircuit(id: string) { setCircuitId(id); setSpecs(defaultSpecsFor(id)); const c = circuits.find(x => x.id === id); if (c?.topologies[0]) chooseTopology(c.topologies[0].id, id); }
  function chooseTopology(id: string, circuit: string = circuitId) { setTopologyId(id); setDevices(defaultDevices(circuit, id)); }
  function next() { if (step < steps.length - 1) setStep(s => s + 1); else setGenerated(true); }
  function back() { if (step > 0) setStep(s => s - 1); }
  const setSpec = (key: string, patch: Partial<{ enabled: boolean; target: number | null; unit: string; operator: string }>) => setSpecs(prev => ({ ...prev, [key]: { ...prev[key as keyof typeof prev], ...patch } }));
  const setDevice = (index: number, patch: Partial<DeviceDraft>) => setDevices(prev => prev.map((d, i) => i === index ? { ...d, ...patch } : d));
  if (generated && topology) return <ResultScreen topology={topology} config={config} onBack={() => setGenerated(false)} />;
  return <div className={styles.content}>
      <header className={styles.header}><div><div className={styles.eyebrow}>DESIGN WORKSPACE / NEW DESIGN</div><h1>Configure an Analog Circuit</h1><p>Specification-first flow mapped to repository-backed generators.</p></div></header>
      <div className={styles.progress}>{steps.map((label, i) => <div key={label} className={`${styles.step} ${i === step ? styles.stepActive : ''} ${i < step ? styles.stepDone : ''}`}><div className={styles.stepCircle}>{i < step ? <Check size={14}/> : i + 1}</div><span>{label}</span>{i < steps.length - 1 && <div className={styles.stepLine}/>}</div>)}</div>
      <div className={styles.workspace}><div className={styles.panel}>
        {step === 0 && <CircuitStep selected={circuitId} onSelect={chooseCircuit}/>}
        {step === 1 && <TopologyStep circuitId={circuitId} selected={topologyId} onSelect={chooseTopology}/>}
        {step === 2 && <TechnologyStep techId={techId} setTechId={setTechId} vdd={vdd} setVdd={setVdd} temperature={temperature} setTemperature={setTemperature} corner={corner} setCorner={setCorner}/>}
        {step === 3 && <SpecsStep circuitId={circuitId} specs={specs} setSpec={setSpec}/>}
        {step === 4 && <SizingStep method={sizingMethod} setMethod={setSizingMethod} devices={devices} setDevice={setDevice}/>} 
        {step === 5 && <ReviewStep config={config} topology={topology} issues={issues}/>} 
        <div className={styles.actions}><button className={styles.secondary} onClick={back} disabled={step === 0}><ChevronLeft size={16}/>Back</button><button className={styles.primary} onClick={next} disabled={step === 5 && errors.length > 0}>{step === steps.length - 1 ? 'Resolve Generator' : 'Continue'}<ArrowRight size={16}/></button></div>
      </div><aside className={styles.inspector}><div className={styles.inspectorHeader}><span>DESIGN CONTEXT</span><Gauge size={16}/></div><Context label="CIRCUIT" value={circuits.find(c => c.id === circuitId)?.name ?? '—'}/><Context label="TOPOLOGY" value={topology?.name ?? '—'} detail={topology?.inputType}/><Context label="TECHNOLOGY" value={technologies.find(t => t.id === techId)?.name ?? '—'} detail={`${corner} · ${temperature} °C · VDD ${vdd} V`}/>{topology && <TopologyDiagram diagram={topology.diagram}/>}<div className={styles.integration}><div><Check size={14}/><span>Generator mapped</span></div><div><Check size={14}/><span>Repository skill</span></div><div><Check size={14}/><span>Runbook available</span></div></div></aside></div>
    </div>;
}

function defaultDevices(circuitId: string, topologyId: string): DeviceDraft[] {
  return (getTopology(circuitId, topologyId)?.contract.devices ?? []).map(d => ({ device: d.device, type: d.type, ...d.defaultSizing }));
}
function Context({ label, value, detail }: { label:string; value:string; detail?:string }) { return <div className={styles.contextBlock}><small>{label}</small><b>{value}</b>{detail && <span>{detail}</span>}</div>; }
function StepFrame({ title, sub, children }: { title:string; sub:string; children:React.ReactNode }) { return <div><div className={styles.stepTitle}><h2>{title}</h2><p>{sub}</p></div>{children}</div>; }
function CircuitStep({ selected, onSelect }: { selected:string; onSelect:(id:string)=>void }) { return <StepFrame title="Select circuit" sub="Choose the engineering problem you want to configure."><div className={styles.cardGrid}>{circuits.map(c => <button key={c.id} disabled={c.status !== 'available'} onClick={() => onSelect(c.id)} className={`${styles.selectCard} ${selected === c.id ? styles.selectedCard : ''} ${c.status !== 'available' ? styles.disabledCard : ''}`}><div className={styles.cardIcon}><Cpu size={20}/></div><div><b>{c.name}</b><p>{c.description}</p></div>{c.status === 'coming-soon' ? <span className={styles.soon}>Coming soon</span> : selected === c.id ? <span className={styles.available}>Available</span> : null}</button>)}</div></StepFrame>; }
function TopologyStep({ circuitId, selected, onSelect }: { circuitId:string; selected:string; onSelect:(id:string)=>void }) { const topologies = circuits.find(c => c.id === circuitId)?.topologies ?? []; return <StepFrame title="Select topology" sub="Only repository-backed topologies are shown."><div className={styles.topologyGrid}>{topologies.map(t => <button key={t.id} onClick={() => onSelect(t.id)} className={`${styles.topologyCard} ${selected === t.id ? styles.selectedCard : ''}`}><div className={styles.topologyTop}><div><span className={styles.mono}>{t.deviceCount} DEVICES</span><h3>{t.name}</h3></div><span className={`${styles.statusPill} ${t.generator.status === 'verified' ? styles.statusVerified : styles.statusCandidate}`}>{t.generator.status}</span></div><p>{t.description}</p><div className={styles.chips}><span>{t.inputType}</span><span>Generator ✓</span><span>Runbook ✓</span></div><div className={styles.generatorLine}><FileCode2 size={14}/>{t.generator.label}</div></button>)}</div></StepFrame>; }
function TechnologyStep({ techId,setTechId,vdd,setVdd,temperature,setTemperature,corner,setCorner }: any) { return <StepFrame title="Technology & environment" sub="Keep the PDK choice explicit; unsupported device assumptions are never inferred."><div className={styles.formGrid}><label>Technology / PDK<select value={techId} onChange={e=>setTechId(e.target.value)}>{technologies.map(t=><option key={t.id} value={t.id}>{t.name} — {t.status}</option>)}</select></label><label>VDD<input type="number" step="0.05" value={vdd} onChange={e=>setVdd(Number(e.target.value))}/><em>V</em></label><label>Temperature<input type="number" value={temperature} onChange={e=>setTemperature(Number(e.target.value))}/><em>°C</em></label><label>Process corner<select value={corner} onChange={e=>setCorner(e.target.value)}><option>TT</option><option>SS</option><option>FF</option></select></label></div><div className={styles.infoBox}><Check size={16}/><div><b>Repository platform</b><span>Cadence Virtuoso IC6.1.7 · tsmcN65 · nch / pch</span></div></div></StepFrame>; }
function SpecsStep({ circuitId, specs, setSpec }: { circuitId:string; specs:DesignConfig['specs']; setSpec:(key:string, patch:Partial<{ enabled:boolean; target:number|null; unit:string; operator:string }>)=>void }) { const groups:SpecGroup[] = circuits.find(c => c.id === circuitId)?.specGroups ?? []; return <StepFrame title="Performance specifications" sub="Define targets and constraints before sizing. Values are targets, not simulation results.">{groups.map(group=><div key={group.name} className={styles.specGroup}><div className={styles.groupTitle}>{group.name}</div><div className={styles.specGrid}>{group.specs.map(s=>{const spec=specs[s.key];if(!spec)return null;return <div key={s.key} className={`${styles.specRow} ${!spec.enabled ? styles.specOff : ''}`}><input type="checkbox" checked={spec.enabled} onChange={e=>setSpec(s.key,{enabled:e.target.checked})}/><span>{s.label}</span><select value={spec.operator} onChange={e=>setSpec(s.key,{operator:e.target.value})}><option value=">=">≥</option><option value="<=">≤</option><option value="=">=</option></select><input type="number" value={spec.target ?? ''} placeholder="—" onChange={e=>setSpec(s.key,{target:e.target.value === '' ? null : Number(e.target.value)})}/><b>{spec.unit}</b></div>})}</div></div>)}</StepFrame>; }
function SizingStep({ method,setMethod,devices,setDevice }: { method:DesignConfig['sizingMethod']; setMethod:(m:DesignConfig['sizingMethod'])=>void; devices:DeviceDraft[]; setDevice:(i:number,p:Partial<DeviceDraft>)=>void }) { const methods=[{id:'gmID',name:'gm/ID',icon:<Zap size={19}/>,text:'Device sizing from transconductance efficiency and operating-region targets.'},{id:'wL',name:'W/L',icon:<Gauge size={19}/>,text:'Geometry-oriented methodology; repository generators still consume TotalW/L/NF/M.'},{id:'manual',name:'Manual',icon:<Terminal size={19}/>,text:'Explicit TotalW, L, NF and M for each device.'},{id:'ai',name:'AI Assisted',icon:<Sparkles size={19}/>,text:'Future design-agent path; no external AI is called in this MVP.'}]; return <StepFrame title="Sizing methodology" sub="The repository design-level MOS contract is TotalW / L / NF / M."><div className={styles.methodGrid}>{methods.map(m=><button key={m.id} onClick={()=>setMethod(m.id as DesignConfig['sizingMethod'])} className={`${styles.methodCard} ${method===m.id ? styles.selectedCard : ''}`}><div className={styles.cardIcon}>{m.icon}</div><b>{m.name}</b><p>{m.text}</p></button>)}</div><div className={styles.contract}><div className={styles.contractHeader}><span>REPOSITORY SIZING CONTRACT</span><span className={styles.statusVerified}>Current</span></div><div className={styles.codeLine}><span>TotalW</span><span>L</span><span>NF</span><span>M</span><ArrowRight size={14}/><span>W/finger = TotalW / NF</span></div><p>Every current generator explicitly assigns <b>w, l, wf, fingers, simM, totalM, nf, m</b> and enforces <b>totalM = NF × M</b>.</p></div><div className={styles.specGroup}><div className={styles.groupTitle}>Device sizing model</div><div className={styles.reviewBlock}>{devices.map((d,i)=><div key={d.device} className={styles.reviewRow}><span><b>{d.device}</b> · {d.type}</span><div style={{display:'flex',gap:8,alignItems:'center'}}><input aria-label={`${d.device} TotalW`} value={d.totalW} onChange={e=>setDevice(i,{totalW:e.target.value})}/><input aria-label={`${d.device} L`} value={d.L} onChange={e=>setDevice(i,{L:e.target.value})}/><input aria-label={`${d.device} NF`} type="number" min="1" value={d.NF} onChange={e=>setDevice(i,{NF:Number(e.target.value)})}/><input aria-label={`${d.device} M`} type="number" min="1" value={d.M} onChange={e=>setDevice(i,{M:Number(e.target.value)})}/></div></div>)}</div></div><div className={styles.notice}><FlaskConical size={16}/><div><b>Generation boundary</b><span>Phase 3 parameterizes only the exact canonical MOS placement anchors. Topology, routing, VDC and CDF logic remain sourced from the repository generator.</span></div></div></StepFrame>; }
function ReviewStep({ config,topology,issues }: { config:DesignConfig; topology:Topology|undefined; issues:any[] }) { return <StepFrame title="Design review" sub="Review the complete configuration before generating the parameterized repository artifact."><div className={styles.reviewGrid}><ReviewBlock title="Design"><Row k="Circuit" v={circuits.find(c=>c.id===config.circuitId)?.name ?? '—'}/><Row k="Topology" v={topology?.name ?? '—'}/><Row k="Technology" v={technologies.find(t=>t.id===config.technologyId)?.name ?? '—'}/><Row k="Environment" v={`${config.vdd} V · ${config.temperature} °C · ${config.corner}`}/><Row k="Sizing" v={config.sizingMethod === 'gmID' ? 'gm/ID' : config.sizingMethod}/><Row k="Devices" v={`${config.devices.length} MOS instances`}/></ReviewBlock><ReviewBlock title="Target performance">{Object.entries(config.specs).filter(([,s])=>s.enabled).slice(0,7).map(([k,s])=><Row key={k} k={k} v={`${s.operator} ${s.target} ${s.unit}`}/>)}</ReviewBlock></div><div className={styles.validationBox}><div className={styles.validationTitle}>{issues.some(i=>i.level==='error')?<CircleAlert size={16}/>:<Check size={16}/>}<b>{issues.some(i=>i.level==='error')?'Configuration needs attention':'Configuration valid'}</b></div>{issues.length===0?<span>Topology, technology, specifications and generator mapping are consistent.</span>:issues.map((i:any)=><span key={`${i.field}-${i.message}`} className={i.level==='error'?styles.errorText:styles.warningText}>{i.level.toUpperCase()} · {i.message}</span>)}</div></StepFrame>; }
function ReviewBlock({title,children}:{title:string;children:React.ReactNode}){return <div className={styles.reviewBlock}><div className={styles.groupTitle}>{title}</div>{children}</div>}
function Row({k,v}:{k:string;v:string}){return <div className={styles.reviewRow}><span>{k}</span><b>{v}</b></div>}

function ResultScreen({ topology,config,onBack }: { topology:Topology; config:DesignConfig; onBack:()=>void }) {
  const [busy,setBusy]=useState(false);
  const [cadenceBusy,setCadenceBusy]=useState(false);
  const [simBusy,setSimBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [cadenceError,setCadenceError]=useState<string|null>(null);
  const [simError,setSimError]=useState<string|null>(null);
  const [generatedName,setGeneratedName]=useState<string|null>(null);
  const [cadenceResult,setCadenceResult]=useState<any>(null);
  const [simResult,setSimResult]=useState<any>(null);

  async function generate() {
    setBusy(true); setError(null);
    try {
      const response=await fetch('/api/design/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(config)});
      if(!response.ok){const body=await response.json().catch(()=>null); throw new Error(body?.issues?.[0]?.message ?? 'Parameterized generator failed.');}
      const blob=await response.blob();
      const disposition=response.headers.get('Content-Disposition') ?? '';
      const match=disposition.match(/filename="([^"]+)"/);
      const name=match?.[1] ?? `${config.topologyId}_parameterized.il`;
      const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      setGeneratedName(name); setCadenceError(null); setCadenceResult(null);
    } catch(e){setError(e instanceof Error?e.message:'Parameterized generator failed.');}
    finally{setBusy(false);}
  }

  async function runCadence() {
    setCadenceBusy(true); setCadenceError(null); setCadenceResult(null);
    try {
      const response=await fetch('/api/cadence/execute',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({config,dryRun:false})});
      const body=await response.json().catch(()=>null);
      if(!response.ok || !body?.ok) throw new Error(body?.message ?? body?.stderr ?? `Cadence execution failed (${response.status}).`);
      setCadenceResult(body);
    } catch(e){setCadenceError(e instanceof Error?e.message:'Cadence execution failed.');}
    finally{setCadenceBusy(false);}
  }

  async function runSpectre() {
    setSimBusy(true); setSimError(null); setSimResult(null);
    try {
      const response=await fetch('/api/simulation/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({config,dryRun:false})});
      const body=await response.json().catch(()=>null);
      if(!response.ok && !body?.status) throw new Error(body?.message ?? `Simulation failed (${response.status}).`);
      setSimResult(body);
    } catch(e){setSimError(e instanceof Error?e.message:'Simulation failed.');}
    finally{setSimBusy(false);}
  }

  return <div className={styles.content}><header className={styles.header}><div><div className={styles.eyebrow}>GENERATION / CADENCE EXECUTION</div><h1>Parameterized design artifact ready</h1><p>Generate the repository-backed artifact, then optionally run the same validated configuration in your local Cadence environment.</p></div></header><div className={styles.resultCard}><div className={styles.readyIcon}><Check size={25}/></div><h2>DESIGN READY</h2><p>Configuration validated and parameterized repository generator resolved.</p><div className={styles.resultChecks}><span><Check/>Circuit selected</span><span><Check/>Topology validated</span><span><Check/>Sizing contract validated</span><span><Check/>Canonical source preserved</span></div><div className={styles.generatorResult}><small>CANONICAL SOURCE</small><b>{topology.generator.label}</b><code>{topology.generator.path}</code><div className={styles.meta}><span className={topology.generator.status==='verified'?styles.statusVerified:styles.statusCandidate}>{topology.generator.status}</span><span>{topology.generator.invocation}</span></div></div><div className={styles.resultButtons}><button className={styles.primary} onClick={generate} disabled={busy}><FileCode2 size={16}/>{busy?'Generating…':'Generate & Download Parameterized SKILL'}</button><button className={styles.primary} onClick={runCadence} disabled={busy||cadenceBusy||!generatedName}><Terminal size={16}/>{cadenceBusy?'Starting Cadence…':'Run in Cadence (Local)'}</button><button className={styles.primary} onClick={runSpectre} disabled={simBusy}><FlaskConical size={16}/>{simBusy?'Simulating…':'Run Spectre Simulation'}</button><button className={styles.secondary} onClick={()=>navigator.clipboard?.writeText(JSON.stringify(config,null,2))}><FileCode2 size={16}/>Copy Configuration</button><button className={styles.secondary} onClick={()=>window.open(`https://github.com/Markoshenouda/cadence-virtuoso-skill/blob/feature/topology-registry-integration/${topology.generator.runbook}`,'_blank')}><Wrench size={16}/>View Runbook</button><button className={styles.secondary} onClick={()=>window.open(`https://github.com/Markoshenouda/cadence-virtuoso-skill/blob/feature/topology-registry-integration/${topology.generator.path}`,'_blank')}><GitBranch size={16}/>View Canonical Generator</button></div>{!generatedName&&<div className={styles.notice}><FileCode2 size={16}/><div><b>Generate first</b><span>Run in Cadence becomes available after the parameterized SKILL artifact is generated successfully.</span></div></div>}{generatedName&&<div className={styles.infoBox}><Check size={16}/><div><b>Generated parameterized artifact</b><span>{generatedName}</span></div></div>}{error&&<div className={styles.validationBox}><CircleAlert size={16}/><span className={styles.errorText}>{error}</span></div>}{cadenceError&&<div className={styles.validationBox}><CircleAlert size={16}/><span className={styles.errorText}>{cadenceError}</span></div>}{cadenceResult&&<div className={styles.infoBox}><Check size={16}/><div><b>Cadence execution: {cadenceResult.status}</b><span>{cadenceResult.message ?? cadenceResult.notes?.join(' ') ?? 'Execution completed.'}</span><span>Generator completed: {String(cadenceResult.evidence?.generatorCompleted)} · Check & Save evidence: {String(cadenceResult.evidence?.checkAndSaveEvidence)}</span><code>{cadenceResult.remoteFiles?.artifact}</code></div></div>}{simError&&<div className={styles.validationBox}><CircleAlert size={16}/><span className={styles.errorText}>{simError}</span></div>}{simResult&&<div className={styles.infoBox}><Check size={16}/><div><b>Simulation: {simResult.status}</b><span>Profile {simResult.profile} · Analyses: {(simResult.stages?.analysesCompleted ?? []).join(', ') || 'none'} · Measurements: {String(simResult.stages?.measurementsExtracted)}</span>{simResult.measurements&&<div className={styles.reviewBlock}><div className={styles.groupTitle}>Measured values</div>{Object.entries(simResult.measurements).map(([k,v])=><Row key={k} k={k} v={String(v)}/>)}</div>}{(simResult.specResults?.length>0)&&<div className={styles.reviewBlock}><div className={styles.groupTitle}>Specification evaluation</div>{simResult.specResults.map((s:any)=><Row key={s.metric} k={s.metric} v={`${s.value.toFixed(3)} ${s.unit} ${s.operator} ${s.target} -> ${s.pass?'PASS':'FAIL'} (margin ${s.margin>=0?'+':''}${s.margin.toFixed(3)})`}/>)}</div>}{!(simResult.specResults?.length>0)&&<span>No enabled specification matched a measurement.</span>}</div></div>}<div className={styles.notice}><FlaskConical size={16}/><div><b>Execution boundary</b><span>Cadence execution and Spectre simulation run through the configured SSH bridge. Electrical verification requires simulation completion AND measured specifications; schematic generation alone is never called electrically verified.</span></div></div><button className={styles.backLink} onClick={onBack}><ChevronLeft size={15}/>Back to review</button></div></div>;
}
