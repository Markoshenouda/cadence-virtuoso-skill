'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, ChevronLeft, CircleAlert, Cpu, FileCode2, FlaskConical, Gauge, GitBranch, LayoutDashboard, Play, Settings2, Sparkles, Terminal, Wrench, Zap } from 'lucide-react';
import { circuits, getTopology, technologies } from '@/lib/repository-registry';
import { defaultSpecs, validateDesign, type DesignConfig } from '@/lib/validation';
import { TopologyDiagram } from '@/components/topology-diagram';
import styles from './studio.module.css';

const steps = ['Circuit', 'Topology', 'Technology', 'Specifications', 'Sizing', 'Review'];
const recent = [
  { name: '5T OTA', tech: 'TSMC N65', detail: 'NMOS input · TotalW', gain: '60 dB', status: 'Ready' },
  { name: 'Telescopic OTA', tech: 'TSMC N65', detail: 'NMOS input · V7', gain: '55 dB target', status: 'Verified schematic' },
  { name: 'Folded Cascode OTA', tech: 'TSMC N65', detail: 'NMOS input · TotalW V1', gain: '60 dB target', status: 'Candidate' },
];

export default function StudioPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [circuitId, setCircuitId] = useState('ota');
  const [topologyId, setTopologyId] = useState('5t-ota');
  const [techId, setTechId] = useState('tsmcN65');
  const [vdd, setVdd] = useState(1.2);
  const [temperature, setTemperature] = useState(27);
  const [corner, setCorner] = useState('TT');
  const [sizingMethod, setSizingMethod] = useState<DesignConfig['sizingMethod']>('gmID');
  const [specs, setSpecs] = useState(defaultSpecs);
  const [generated, setGenerated] = useState(false);

  const topology = getTopology(circuitId, topologyId);
  const config: DesignConfig = useMemo(() => ({
    circuitId, topologyId, technologyId: techId, vdd, temperature, corner, specs, sizingMethod,
    devices: [
      { device: 'M1', type: 'NMOS', totalW: '2u', L: '240n', NF: 1, M: 1 },
      { device: 'M2', type: 'NMOS', totalW: '2u', L: '240n', NF: 1, M: 1 },
    ],
  }), [circuitId, topologyId, techId, vdd, temperature, corner, specs, sizingMethod]);
  const issues = validateDesign(config, topology?.generator);
  const errors = issues.filter((i) => i.level === 'error');

  function next() { if (step < steps.length - 1) setStep((s) => s + 1); else setGenerated(true); }
  function back() { if (step > 0) setStep((s) => s - 1); }

  const setSpec = (key: string, patch: Partial<{ enabled: boolean; target: number | null; unit: string; operator: string }>) => {
    setSpecs((prev) => ({ ...prev, [key]: { ...prev[key as keyof typeof prev], ...patch } }));
  };

  if (generated) return <ResultScreen topology={topology} config={config} onBack={() => setGenerated(false)} />;

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}><div className={styles.logo}>A</div><div><strong>Analog Design</strong><span>Studio</span></div></div>
        <nav className={styles.nav}>
          <NavItem icon={<LayoutDashboard size={17}/>} label="Dashboard" onClick={() => router.push('/')} />
          <NavItem active icon={<Sparkles size={17}/>} label="New Design" />
          <NavItem icon={<FileCode2 size={17}/>} label="My Designs" />
          <NavItem icon={<GitBranch size={17}/>} label="Generators" />
          <NavItem icon={<Wrench size={17}/>} label="Runbooks" />
        </nav>
        <div className={styles.sidebarBottom}><NavItem icon={<Settings2 size={17}/>} label="Settings" /><div className={styles.repoTag}>REPOSITORY<br/><b>cadence-virtuoso-skill</b><small>source of truth</small></div></div>
      </aside>

      <section className={styles.content}>
        <header className={styles.header}><div><div className={styles.eyebrow}>DESIGN WORKSPACE / NEW DESIGN</div><h1>Configure an Analog Circuit</h1><p>Specification-first flow mapped to the repository's canonical generators.</p></div><div className={styles.headerStatus}><span className={styles.dot}/>Repository connected<span className={styles.branch}>main</span></div></header>

        <div className={styles.progress}>{steps.map((label, i) => <div key={label} className={`${styles.step} ${i === step ? styles.stepActive : ''} ${i < step ? styles.stepDone : ''}`}><div className={styles.stepCircle}>{i < step ? <Check size={14}/> : i + 1}</div><span>{label}</span>{i < steps.length - 1 && <div className={styles.stepLine}/>}</div>)}</div>

        <div className={styles.workspace}>
          <div className={styles.panel}>
            {step === 0 && <CircuitStep selected={circuitId} onSelect={(id) => { setCircuitId(id); const c = circuits.find(x => x.id === id); if (c?.topologies[0]) setTopologyId(c.topologies[0].id); }} />}
            {step === 1 && <TopologyStep selected={topologyId} onSelect={setTopologyId} />}
            {step === 2 && <TechnologyStep techId={techId} setTechId={setTechId} vdd={vdd} setVdd={setVdd} temperature={temperature} setTemperature={setTemperature} corner={corner} setCorner={setCorner} />}
            {step === 3 && <SpecsStep specs={specs} setSpec={setSpec} />}
            {step === 4 && <SizingStep method={sizingMethod} setMethod={setSizingMethod} />}
            {step === 5 && <ReviewStep config={config} topology={topology} issues={issues} />}
            <div className={styles.actions}><button className={styles.secondary} onClick={back} disabled={step === 0}><ChevronLeft size={16}/>Back</button><button className={styles.primary} onClick={next} disabled={step === 5 && errors.length > 0}>{step === steps.length - 1 ? 'Generate Design' : 'Continue'}<ArrowRight size={16}/></button></div>
          </div>
          <aside className={styles.inspector}><div className={styles.inspectorHeader}><span>DESIGN CONTEXT</span><Gauge size={16}/></div><div className={styles.contextBlock}><small>CIRCUIT</small><b>{circuits.find(c => c.id === circuitId)?.name}</b></div><div className={styles.contextBlock}><small>TOPOLOGY</small><b>{topology?.name ?? '—'}</b><span>{topology?.inputType}</span></div><div className={styles.contextBlock}><small>TECHNOLOGY</small><b>{technologies.find(t => t.id === techId)?.name}</b><span>{corner} · {temperature} °C · VDD {vdd} V</span></div>{topology && <TopologyDiagram topologyId={topology.id}/>}<div className={styles.integration}><div><Check size={14}/><span>Generator mapped</span></div><div><Check size={14}/><span>Repository skill</span></div><div><Check size={14}/><span>Runbook available</span></div></div></aside>
        </div>
      </section>
    </main>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) { return <button onClick={onClick} className={`${styles.navItem} ${active ? styles.navActive : ''}`}>{icon}<span>{label}</span></button>; }

function CircuitStep({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  return <StepFrame title="Select circuit" sub="Choose the engineering problem you want to configure."><div className={styles.cardGrid}>{circuits.map(c => <button key={c.id} disabled={c.status !== 'available'} onClick={() => onSelect(c.id)} className={`${styles.selectCard} ${selected === c.id ? styles.selectedCard : ''} ${c.status !== 'available' ? styles.disabledCard : ''}`}><div className={styles.cardIcon}><Cpu size={20}/></div><div><b>{c.name}</b><p>{c.description}</p></div>{c.status === 'coming-soon' ? <span className={styles.soon}>Coming soon</span> : selected === c.id ? <span className={styles.available}>Available</span> : null}</button>)}</div></StepFrame>;
}

function TopologyStep({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const topologies = circuits[0].topologies;
  return <StepFrame title="Select topology" sub="Only repository-backed OTA topologies are shown."><div className={styles.topologyGrid}>{topologies.map(t => <button key={t.id} onClick={() => onSelect(t.id)} className={`${styles.topologyCard} ${selected === t.id ? styles.selectedCard : ''}`}><div className={styles.topologyTop}><div><span className={styles.mono}>{t.deviceCount} DEVICES</span><h3>{t.name}</h3></div><span className={`${styles.statusPill} ${t.generator.status === 'verified' ? styles.statusVerified : styles.statusCandidate}`}>{t.generator.status}</span></div><p>{t.description}</p><div className={styles.chips}><span>{t.inputType}</span><span>Generator ✓</span><span>Runbook ✓</span></div><div className={styles.generatorLine}><FileCode2 size={14}/>{t.generator.label}</div></button>)}</div></StepFrame>;
}

function TechnologyStep({ techId, setTechId, vdd, setVdd, temperature, setTemperature, corner, setCorner }: any) {
  return <StepFrame title="Technology & environment" sub="Keep the PDK choice explicit; unsupported device assumptions are never inferred."><div className={styles.formGrid}><label>Technology / PDK<select value={techId} onChange={e => setTechId(e.target.value)}>{technologies.map(t => <option key={t.id} value={t.id}>{t.name} — {t.status}</option>)}</select></label><label>VDD<input type="number" step="0.05" value={vdd} onChange={e => setVdd(Number(e.target.value))}/><em>V</em></label><label>Temperature<input type="number" value={temperature} onChange={e => setTemperature(Number(e.target.value))}/><em>°C</em></label><label>Process corner<select value={corner} onChange={e => setCorner(e.target.value)}><option>TT</option><option>SS</option><option>FF</option></select></label></div><div className={styles.infoBox}><Check size={16}/><div><b>Repository platform</b><span>Cadence Virtuoso IC6.1.7 · tsmcN65 · nch / pch</span></div></div></StepFrame>;
}

function SpecsStep({ specs, setSpec }: any) {
  const groups = [['Core performance', ['gain','gbw','phaseMargin','slewRate','load','power']], ['Advanced', ['noise','psrr','cmrr','outputSwing','icmr','settling','offset']]];
  const labels: Record<string,string> = { gain:'DC Gain', gbw:'GBW', phaseMargin:'Phase Margin', slewRate:'Slew Rate', load:'Load Capacitance', power:'Power', noise:'Input-Referred Noise', psrr:'PSRR', cmrr:'CMRR', outputSwing:'Output Swing', icmr:'Input Common-Mode Range', settling:'Settling Time', offset:'Offset' };
  return <StepFrame title="Performance specifications" sub="Define targets and constraints before sizing. Values are targets, not simulation results."><div>{groups.map(([group, keys]) => <div key={group as string} className={styles.specGroup}><div className={styles.groupTitle}>{group}</div><div className={styles.specGrid}>{(keys as string[]).map(k => { const s = specs[k]; return <div key={k} className={`${styles.specRow} ${!s.enabled ? styles.specOff : ''}`}><input type="checkbox" checked={s.enabled} onChange={e => setSpec(k,{enabled:e.target.checked})}/><span>{labels[k]}</span><select value={s.operator} onChange={e=>setSpec(k,{operator:e.target.value})}><option>≥</option><option>≤</option><option>=</option></select><input type="number" value={s.target ?? ''} placeholder="—" onChange={e=>setSpec(k,{target:e.target.value === '' ? null : Number(e.target.value)})}/><b>{s.unit}</b></div>})}</div></div>)}</div></StepFrame>;
}

function SizingStep({ method, setMethod }: { method: DesignConfig['sizingMethod']; setMethod: (m: DesignConfig['sizingMethod']) => void }) {
  const methods = [{ id:'gmID', name:'gm/ID', icon:<Zap size={19}/>, text:'Device sizing from transconductance efficiency and operating-region targets.' }, { id:'wL', name:'W/L', icon:<Gauge size={19}/>, text:'Classic geometry-driven sizing using width-to-length ratios.' }, { id:'manual', name:'Manual', icon:<Terminal size={19}/>, text:'Explicit TotalW, L, NF and M for each device.' }, { id:'ai', name:'AI Assisted', icon:<Sparkles size={19}/>, text:'Future design-agent path; no external AI is called in this MVP.' }];
  return <StepFrame title="Sizing methodology" sub="The repository's design-level MOS contract is TotalW / L / NF / M."><div className={styles.methodGrid}>{methods.map(m => <button key={m.id} onClick={() => setMethod(m.id as DesignConfig['sizingMethod'])} className={`${styles.methodCard} ${method === m.id ? styles.selectedCard : ''}`}><div className={styles.cardIcon}>{m.icon}</div><b>{m.name}</b><p>{m.text}</p></button>)}</div><div className={styles.contract}><div className={styles.contractHeader}><span>REPOSITORY SIZING CONTRACT</span><span className={styles.statusVerified}>Current</span></div><div className={styles.codeLine}><span>TotalW</span><span>L</span><span>NF</span><span>M</span><ArrowRight size={14}/><span>W/finger = TotalW / NF</span></div><p>Current tsmcN65 generators explicitly assign <b>w, l, wf, fingers, simM, totalM, nf, m</b> and enforce <b>totalM = NF × M</b>.</p></div></StepFrame>;
}

function ReviewStep({ config, topology, issues }: { config: DesignConfig; topology: any; issues: any[] }) {
  return <StepFrame title="Design review" sub="Review the complete configuration before resolving the repository generator."><div className={styles.reviewGrid}><ReviewBlock title="Design"><Row k="Circuit" v="OTA"/><Row k="Topology" v={topology?.name}/><Row k="Technology" v="TSMC N65"/><Row k="Environment" v={`${config.vdd} V · ${config.temperature} °C · ${config.corner}`}/><Row k="Sizing" v={config.sizingMethod === 'gmID' ? 'gm/ID' : config.sizingMethod}/></ReviewBlock><ReviewBlock title="Target performance">{Object.entries(config.specs).filter(([,s])=>s.enabled).slice(0,6).map(([k,s])=><Row key={k} k={k} v={`${s.operator} ${s.target} ${s.unit}`}/>)}</ReviewBlock></div><div className={styles.validationBox}><div className={styles.validationTitle}>{issues.filter(i=>i.level==='error').length === 0 ? <Check size={16}/> : <CircleAlert size={16}/>}<b>{issues.filter(i=>i.level==='error').length === 0 ? 'Configuration valid' : 'Configuration needs attention'}</b></div>{issues.length === 0 ? <span>Topology, technology, specifications and generator mapping are consistent.</span> : issues.map((i:any)=><span key={i.field} className={i.level==='error'?styles.errorText:styles.warningText}>{i.level.toUpperCase()} · {i.message}</span>)}</div></StepFrame>;
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) { return <div className={styles.reviewBlock}><div className={styles.groupTitle}>{title}</div>{children}</div>; }
function Row({ k, v }: { k:string; v:string }) { return <div className={styles.reviewRow}><span>{k}</span><b>{v}</b></div>; }
function StepFrame({ title, sub, children }: { title:string; sub:string; children:React.ReactNode }) { return <div><div className={styles.stepTitle}><h2>{title}</h2><p>{sub}</p></div>{children}</div>; }

function ResultScreen({ topology, config, onBack }: { topology:any; config:DesignConfig; onBack:()=>void }) {
  return <main className={styles.shell}><aside className={styles.sidebar}><div className={styles.brand}><div className={styles.logo}>A</div><div><strong>Analog Design</strong><span>Studio</span></div></div><div className={styles.nav}><NavItem active icon={<Sparkles size={17}/>} label="Generation"/></div></aside><section className={styles.content}><header className={styles.header}><div><div className={styles.eyebrow}>GENERATION / RESULT</div><h1>Design configuration ready</h1><p>The MVP resolves the repository artifact without claiming Cadence execution.</p></div></header><div className={styles.resultCard}><div className={styles.readyIcon}><Check size={25}/></div><h2>DESIGN READY</h2><p>Configuration validated and mapped to the repository.</p><div className={styles.resultChecks}><span><Check/>Circuit selected</span><span><Check/>Topology validated</span><span><Check/>Specifications validated</span><span><Check/>Generator resolved</span></div><div className={styles.generatorResult}><small>SELECTED GENERATOR</small><b>{topology?.generator.label}</b><code>{topology?.generator.path}</code><div className={styles.meta}><span className={topology?.generator.status==='verified'?styles.statusVerified:styles.statusCandidate}>{topology?.generator.status}</span><span>{topology?.generator.invocation}</span></div></div><div className={styles.resultButtons}><button className={styles.primary}><FileCode2 size={16}/>Export Configuration</button><button className={styles.secondary}><Play size={16}/>Generate SKILL</button><button className={styles.secondary}><Wrench size={16}/>View Runbook</button><button className={styles.secondary}><GitBranch size={16}/>View Generator</button></div><div className={styles.notice}><FlaskConical size={16}/><div><b>Execution boundary</b><span>Generated/resolved by the web MVP ≠ executed in Cadence. Spectre simulation and performance verification are not integrated.</span></div></div><button className={styles.backLink} onClick={onBack}><ChevronLeft size={15}/>Back to review</button></div></section></main>;
}
