'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SimulationSessionStore } from '@/lib/simulation/simulation-session';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  CircleAlert,
  Cpu,
  FileCode2,
  FlaskConical,
  Gauge,
  GitBranch,
  Sparkles,
  Terminal,
  Wrench,
  Zap,
  Activity,
  Layers,
  Info,
  Download,
  Copy,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  circuits,
  defaultSpecsFor,
  getTopology,
  technologies,
  type SpecGroup,
  type Topology,
} from '@/lib/repository-registry';
import { validateDesign, type DesignConfig } from '@/lib/validation';
import { TopologyDiagram } from '@/components/topology-diagram';
import { StatusPill } from '@/components/status-pill';
import styles from './studio.module.css';

const steps = [
  'Circuit Family',
  'Topology',
  'PDK & Environment',
  'Performance Targets',
  'Device Sizing',
  'Validation & Review',
];

type DeviceDraft = DesignConfig['devices'][number];

const initialCircuit = circuits.find((c) => c.status === 'available');
const initialTopology = initialCircuit?.topologies[0];
const initialTechnology = technologies[0]?.id ?? 'tsmcN65';

export default function StudioPage() {
  return (
    <Suspense fallback={null}>
      <StudioWizard />
    </Suspense>
  );
}

function StudioWizard() {
  const params = useSearchParams();
  const preselectedCircuit = params.get('circuit');
  const preselectedTopology = params.get('topology');

  const startCircuit =
    (preselectedCircuit
      ? circuits.find((c) => c.id === preselectedCircuit && c.status === 'available')
      : undefined) ?? initialCircuit;
  const startTopology =
    (preselectedTopology
      ? startCircuit?.topologies.find((t) => t.id === preselectedTopology)
      : undefined) ?? startCircuit?.topologies[0];

  const [step, setStep] = useState(0);
  const [circuitId, setCircuitId] = useState(startCircuit?.id ?? '');
  const [topologyId, setTopologyId] = useState(startTopology?.id ?? '');
  const [techId, setTechId] = useState(initialTechnology);
  const [vdd, setVdd] = useState(1.2);
  const [temperature, setTemperature] = useState(27);
  const [corner, setCorner] = useState('TT');
  const [sizingMethod, setSizingMethod] = useState<DesignConfig['sizingMethod']>('gmID');
  const [specs, setSpecs] = useState<DesignConfig['specs']>(() =>
    defaultSpecsFor(startCircuit?.id ?? '')
  );
  const [devices, setDevices] = useState<DeviceDraft[]>(() =>
    defaultDevices(startCircuit?.id ?? '', startTopology?.id ?? '')
  );
  const [generated, setGenerated] = useState(false);

  const topology = getTopology(circuitId, topologyId);
  const config: DesignConfig = useMemo(
    () => ({
      circuitId,
      topologyId,
      technologyId: techId,
      vdd,
      temperature,
      corner,
      specs,
      sizingMethod,
      devices,
    }),
    [circuitId, topologyId, techId, vdd, temperature, corner, specs, sizingMethod, devices]
  );

  const issues = validateDesign(config, topology?.generator);
  const errors = issues.filter((i) => i.level === 'error');

  function chooseCircuit(id: string) {
    setCircuitId(id);
    setSpecs(defaultSpecsFor(id));
    const c = circuits.find((x) => x.id === id);
    if (c?.topologies[0]) {
      chooseTopology(c.topologies[0].id, id);
    }
  }

  function chooseTopology(id: string, circuit: string = circuitId) {
    setTopologyId(id);
    setDevices(defaultDevices(circuit, id));
  }

  function next() {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      setGenerated(true);
    }
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  const setSpec = (
    key: string,
    patch: Partial<{ enabled: boolean; target: number | null; unit: string; operator: string }>
  ) =>
    setSpecs((prev) => ({
      ...prev,
      [key]: { ...prev[key as keyof typeof prev], ...patch },
    }));

  const setDevice = (index: number, patch: Partial<DeviceDraft>) =>
    setDevices((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));

  if (generated && topology) {
    return <ResultScreen topology={topology} config={config} onBack={() => setGenerated(false)} />;
  }

  const activeTechObj = technologies.find((t) => t.id === techId) ?? technologies[0];

  return (
    <div className={styles.container}>
      {/* Wizard Header */}
      <header className={styles.header}>
        <div className={styles.eyebrow}>ANALOG DESIGN STUDIO / WORKSPACE</div>
        <h1 className={styles.pageTitle}>Analog Circuit Configurator</h1>
        <p className={styles.pageSubtitle}>
          Synthesize verified Cadence Virtuoso SKILL code from specification constraints and
          repository MOS sizing contracts.
        </p>
      </header>

      {/* Interactive Step Stepper */}
      <div className={styles.stepper} role="navigation" aria-label="Wizard Steps">
        {steps.map((label, i) => {
          const isDone = i < step;
          const isActive = i === step;
          return (
            <button
              key={label}
              type="button"
              onClick={() => isDone && setStep(i)}
              disabled={!isDone && !isActive}
              className={`${styles.stepItem} ${isActive ? styles.stepActive : ''} ${isDone ? styles.stepDone : ''}`}
            >
              <div className={styles.stepBadge}>
                {isDone ? <Check size={12} className={styles.checkIcon} /> : <span>{i + 1}</span>}
              </div>
              <span className={styles.stepLabel}>{label}</span>
              {i < steps.length - 1 && <div className={styles.stepConnector} />}
            </button>
          );
        })}
      </div>

      {/* Main Workspace: Config Form + Live Design Inspector */}
      <div className={styles.workspace}>
        {/* Left Side: Step Form */}
        <div className={styles.formPanel}>
          {step === 0 && <CircuitStep selected={circuitId} onSelect={chooseCircuit} />}
          {step === 1 && (
            <TopologyStep
              circuitId={circuitId}
              selected={topologyId}
              onSelect={chooseTopology}
            />
          )}
          {step === 2 && (
            <TechnologyStep
              techId={techId}
              setTechId={setTechId}
              vdd={vdd}
              setVdd={setVdd}
              temperature={temperature}
              setTemperature={setTemperature}
              corner={corner}
              setCorner={setCorner}
            />
          )}
          {step === 3 && (
            <SpecsStep circuitId={circuitId} specs={specs} setSpec={setSpec} />
          )}
          {step === 4 && (
            <SizingStep
              method={sizingMethod}
              setMethod={setSizingMethod}
              devices={devices}
              setDevice={setDevice}
            />
          )}
          {step === 5 && (
            <ReviewStep config={config} topology={topology} issues={issues} />
          )}

          {/* Stepper Navigation Buttons */}
          <div className={styles.stepperActions}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={back}
              disabled={step === 0}
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>

            <button
              type="button"
              className={styles.nextBtn}
              onClick={next}
              disabled={step === 5 && errors.length > 0}
            >
              <span>{step === steps.length - 1 ? 'Synthesize & Generate Artifact' : 'Continue'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Right Side: Live Inspector Telemetry */}
        <aside className={styles.inspectorPanel}>
          <div className={styles.inspectorHeader}>
            <Gauge size={15} />
            <span>LIVE DESIGN CONTEXT</span>
          </div>

          <div className={styles.contextCard}>
            <div className={styles.contextRow}>
              <span className={styles.contextLabel}>CIRCUIT FAMILY</span>
              <span className={styles.contextVal}>
                {circuits.find((c) => c.id === circuitId)?.name ?? '—'}
              </span>
            </div>
            <div className={styles.contextRow}>
              <span className={styles.contextLabel}>TOPOLOGY</span>
              <span className={styles.contextVal}>{topology?.name ?? '—'}</span>
            </div>
            <div className={styles.contextRow}>
              <span className={styles.contextLabel}>INPUT STAGE</span>
              <span className={styles.contextVal}>{topology?.inputType ?? '—'}</span>
            </div>
            <div className={styles.contextRow}>
              <span className={styles.contextLabel}>PROCESS PDK</span>
              <span className={styles.contextVal}>{activeTechObj.name}</span>
            </div>
            <div className={styles.contextRow}>
              <span className={styles.contextLabel}>OPERATING POINT</span>
              <span className={styles.contextVal}>
                {corner} · {temperature}°C · {vdd}V
              </span>
            </div>
          </div>

          {topology && (
            <div className={styles.inspectorDiagram}>
              <div className={styles.inspectorDiagramHeader}>
                <span>TOPOLOGY SCHEMATIC</span>
              </div>
              <TopologyDiagram diagram={topology.diagram} />
            </div>
          )}

          <div className={styles.integrationChecklist}>
            <div className={styles.checklistRow}>
              <CheckCircle2 size={13} className={styles.checkIcon} />
              <span>Canonical SKILL generator mapped</span>
            </div>
            <div className={styles.checklistRow}>
              <CheckCircle2 size={13} className={styles.checkIcon} />
              <span>Cadence Virtuoso IC6.1.7 ready</span>
            </div>
            <div className={styles.checklistRow}>
              <CheckCircle2 size={13} className={styles.checkIcon} />
              <span>Spectre simulation deck mapped</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function defaultDevices(circuitId: string, topologyId: string): DeviceDraft[] {
  return (getTopology(circuitId, topologyId)?.contract.devices ?? []).map((d) => ({
    device: d.device,
    type: d.type,
    ...d.defaultSizing,
  }));
}

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className={styles.stepHeader}>
      <h2 className={styles.stepTitle}>{title}</h2>
      <p className={styles.stepSubtitle}>{subtitle}</p>
    </div>
  );
}

/* 1. Circuit Selection Step */
function CircuitStep({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <StepHeader
        title="Select Circuit Family"
        subtitle="Choose the target analog functional block to configure and parameterize."
      />
      <div className={styles.selectionGrid}>
        {circuits.map((c) => {
          const isSelected = selected === c.id;
          const isAvailable = c.status === 'available';
          return (
            <button
              key={c.id}
              type="button"
              disabled={!isAvailable}
              onClick={() => onSelect(c.id)}
              className={`${styles.selectionCard} ${isSelected ? styles.cardSelected : ''} ${
                !isAvailable ? styles.cardDisabled : ''
              }`}
            >
              <div className={styles.selectionIcon}>
                <Cpu size={18} />
              </div>
              <div className={styles.selectionBody}>
                <div className={styles.selectionHeadRow}>
                  <strong>{c.name}</strong>
                  {c.status === 'coming-soon' ? (
                    <StatusPill variant="coming-soon">ROADMAP</StatusPill>
                  ) : (
                    <StatusPill variant="verified">{c.topologies.length} TOPOLOGIES</StatusPill>
                  )}
                </div>
                <p>{c.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* 2. Topology Selection Step */
function TopologyStep({
  circuitId,
  selected,
  onSelect,
}: {
  circuitId: string;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const topologies = circuits.find((c) => c.id === circuitId)?.topologies ?? [];
  return (
    <div>
      <StepHeader
        title="Select Analog Topology"
        subtitle="Only repository-backed canonical topologies are selectable for generator execution."
      />
      <div className={styles.topologySelectionGrid}>
        {topologies.map((t) => {
          const isSelected = selected === t.id;
          const isVerified = t.generator.status === 'verified';
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={`${styles.topolCard} ${isSelected ? styles.cardSelected : ''}`}
            >
              <div className={styles.topolHead}>
                <div>
                  <span className={styles.deviceCountMeta}>
                    {t.deviceCount ?? t.contract.devices.length} MOS DEVICES
                  </span>
                  <h3>{t.name}</h3>
                </div>
                <StatusPill variant={isVerified ? 'verified' : 'candidate'}>
                  {t.generator.status}
                </StatusPill>
              </div>

              <p className={styles.topolDesc}>{t.description}</p>

              <div className={styles.topolTags}>
                <span className={styles.topolTag}>{t.inputType}</span>
                <span className={styles.topolTag}>SKILL Ready</span>
                <span className={styles.topolTag}>Spectre Ready</span>
              </div>

              <div className={styles.generatorPathRow}>
                <FileCode2 size={12} />
                <code>{t.generator.path}</code>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* 3. Technology & Environment Step */
function TechnologyStep({
  techId,
  setTechId,
  vdd,
  setVdd,
  temperature,
  setTemperature,
  corner,
  setCorner,
}: any) {
  return (
    <div>
      <StepHeader
        title="Process Technology & Environment"
        subtitle="Specify the exact PDK targets and PVT operating conditions."
      />
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.fieldLabel}>Process Design Kit (PDK)</label>
          <select
            value={techId}
            onChange={(e) => setTechId(e.target.value)}
            className={styles.fieldSelect}
          >
            {technologies.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.status} (Virtuoso IC6.1.7)
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.fieldLabel}>Power Supply (VDD)</label>
          <div className={styles.inputWithUnit}>
            <input
              type="number"
              step="0.05"
              value={vdd}
              onChange={(e) => setVdd(Number(e.target.value))}
              className={styles.fieldInput}
            />
            <span className={styles.unitBadge}>V</span>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.fieldLabel}>Temperature</label>
          <div className={styles.inputWithUnit}>
            <input
              type="number"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className={styles.fieldInput}
            />
            <span className={styles.unitBadge}>°C</span>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.fieldLabel}>Process Corner</label>
          <select
            value={corner}
            onChange={(e) => setCorner(e.target.value)}
            className={styles.fieldSelect}
          >
            <option value="TT">TT (Typical-Typical)</option>
            <option value="SS">SS (Slow-Slow)</option>
            <option value="FF">FF (Fast-Fast)</option>
            <option value="SF">SF (Slow-Fast)</option>
            <option value="FS">FS (Fast-Slow)</option>
          </select>
        </div>
      </div>

      <div className={styles.calloutCard}>
        <CheckCircle2 size={16} className={styles.calloutIcon} />
        <div>
          <strong>Target PDK Mapping</strong>
          <p>
            Cadence Virtuoso IC6.1.7 · tsmcN65 · Canonical primitive cells: <code>nch</code> &amp;{' '}
            <code>pch</code>
          </p>
        </div>
      </div>
    </div>
  );
}

/* 4. Specifications Step */
function SpecsStep({
  circuitId,
  specs,
  setSpec,
}: {
  circuitId: string;
  specs: DesignConfig['specs'];
  setSpec: (
    key: string,
    patch: Partial<{ enabled: boolean; target: number | null; unit: string; operator: string }>
  ) => void;
}) {
  const groups: SpecGroup[] = circuits.find((c) => c.id === circuitId)?.specGroups ?? [];
  return (
    <div>
      <StepHeader
        title="Performance Target Specifications"
        subtitle="Define electrical design constraints and optimization targets before device sizing."
      />
      <div className={styles.specGroupsWrap}>
        {groups.map((group) => (
          <div key={group.name} className={styles.specGroupBlock}>
            <div className={styles.specGroupHead}>{group.name}</div>
            <div className={styles.specTableContainer}>
              <div className={styles.specTableRowHead}>
                <span>Enable</span>
                <span>Specification</span>
                <span>Op</span>
                <span>Target Value</span>
                <span>Unit</span>
              </div>
              {group.specs.map((s) => {
                const spec = specs[s.key];
                if (!spec) return null;
                return (
                  <div
                    key={s.key}
                    className={`${styles.specTableRow} ${!spec.enabled ? styles.specRowDisabled : ''}`}
                  >
                    <div className={styles.specCheckCol}>
                      <input
                        type="checkbox"
                        checked={spec.enabled}
                        onChange={(e) => setSpec(s.key, { enabled: e.target.checked })}
                      />
                    </div>
                    <span className={styles.specNameCol}>{s.label}</span>
                    <select
                      value={spec.operator}
                      onChange={(e) => setSpec(s.key, { operator: e.target.value })}
                      className={styles.specOpSelect}
                    >
                      <option value=">=">≥</option>
                      <option value="<=">≤</option>
                      <option value="=">=</option>
                    </select>
                    <input
                      type="number"
                      value={spec.target ?? ''}
                      placeholder="—"
                      onChange={(e) =>
                        setSpec(s.key, {
                          target: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      className={styles.specTargetInput}
                    />
                    <span className={styles.specUnitCol}>{spec.unit}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 5. Device Sizing Step */
function SizingStep({
  method,
  setMethod,
  devices,
  setDevice,
}: {
  method: DesignConfig['sizingMethod'];
  setMethod: (m: DesignConfig['sizingMethod']) => void;
  devices: DeviceDraft[];
  setDevice: (i: number, p: Partial<DeviceDraft>) => void;
}) {
  const methods = [
    {
      id: 'gmID',
      name: 'gm/ID Methodology',
      icon: <Zap size={16} />,
      desc: 'Transconductance efficiency & inversion level operating region targets.',
    },
    {
      id: 'wL',
      name: 'W/L Aspect Ratio',
      icon: <Gauge size={16} />,
      desc: 'Direct geometric aspect ratio scaling mapped to canonical fingers.',
    },
    {
      id: 'manual',
      name: 'Explicit Contract',
      icon: <Terminal size={16} />,
      desc: 'Direct TotalW, L, NF, and M parameter assignment for each device.',
    },
    {
      id: 'ai',
      name: 'AI Optimization',
      icon: <Sparkles size={16} />,
      desc: 'Automated sizing agent optimization path.',
    },
  ];

  return (
    <div>
      <StepHeader
        title="MOS Device Sizing & Sizing Contract"
        subtitle="Assign TotalW, L, NF, and M for each MOS device anchor in the topology."
      />

      {/* Sizing Method Selector */}
      <div className={styles.methodSelector}>
        {methods.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMethod(m.id as DesignConfig['sizingMethod'])}
            className={`${styles.methodBtn} ${method === m.id ? styles.methodBtnActive : ''}`}
          >
            <div className={styles.methodIconWrap}>{m.icon}</div>
            <div className={styles.methodText}>
              <strong>{m.name}</strong>
              <small>{m.desc}</small>
            </div>
          </button>
        ))}
      </div>

      {/* Mathematical Contract Banner */}
      <div className={styles.contractBanner}>
        <div className={styles.contractFormula}>
          <span className={styles.contractParam}>TotalW</span>
          <span className={styles.contractOp}>/</span>
          <span className={styles.contractParam}>NF</span>
          <span className={styles.contractArrow}>→</span>
          <span className={styles.contractResult}>W/finger (wf)</span>
          <span className={styles.contractSep}>|</span>
          <span className={styles.contractParam}>NF</span>
          <span className={styles.contractOp}>×</span>
          <span className={styles.contractParam}>M</span>
          <span className={styles.contractArrow}>→</span>
          <span className={styles.contractResult}>Total Multiplier (totalM)</span>
        </div>
      </div>

      {/* Device Sizing Table */}
      <div className={styles.deviceTableWrap}>
        <div className={styles.deviceTableHead}>
          <span>Device</span>
          <span>Type</span>
          <span>Total Width (TotalW)</span>
          <span>Length (L)</span>
          <span>Fingers (NF)</span>
          <span>Multiplier (M)</span>
        </div>

        {devices.map((d, i) => (
          <div key={d.device} className={styles.deviceTableRow}>
            <div className={styles.deviceCellName}>
              <code>{d.device}</code>
            </div>
            <div>
              <span className={`${styles.typeTag} ${d.type === 'NMOS' ? styles.typeN : styles.typeP}`}>
                {d.type}
              </span>
            </div>
            <div>
              <input
                aria-label={`${d.device} TotalW`}
                value={d.totalW}
                onChange={(e) => setDevice(i, { totalW: e.target.value })}
                className={styles.deviceInput}
                placeholder="2u"
              />
            </div>
            <div>
              <input
                aria-label={`${d.device} L`}
                value={d.L}
                onChange={(e) => setDevice(i, { L: e.target.value })}
                className={styles.deviceInput}
                placeholder="240n"
              />
            </div>
            <div>
              <input
                aria-label={`${d.device} NF`}
                type="number"
                min="1"
                value={d.NF}
                onChange={(e) => setDevice(i, { NF: Number(e.target.value) })}
                className={styles.deviceInputSmall}
              />
            </div>
            <div>
              <input
                aria-label={`${d.device} M`}
                type="number"
                min="1"
                value={d.M}
                onChange={(e) => setDevice(i, { M: Number(e.target.value) })}
                className={styles.deviceInputSmall}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 6. Review & Validation Step */
function ReviewStep({
  config,
  topology,
  issues,
}: {
  config: DesignConfig;
  topology: Topology | undefined;
  issues: any[];
}) {
  const hasErrors = issues.some((i) => i.level === 'error');
  const activeCircuit = circuits.find((c) => c.id === config.circuitId);
  const activeTech = technologies.find((t) => t.id === config.technologyId);

  return (
    <div>
      <StepHeader
        title="Design Verification & Artifact Review"
        subtitle="Confirm design constraints, sizing contracts, and generator bindings before execution."
      />

      <div className={styles.reviewGrid}>
        {/* Design Summary Card */}
        <div className={styles.reviewCard}>
          <div className={styles.reviewCardTitle}>DESIGN CONFIGURATION</div>
          <div className={styles.reviewRow}>
            <span>Circuit Family</span>
            <b>{activeCircuit?.name ?? '—'}</b>
          </div>
          <div className={styles.reviewRow}>
            <span>Topology</span>
            <b>{topology?.name ?? '—'}</b>
          </div>
          <div className={styles.reviewRow}>
            <span>Process PDK</span>
            <b>{activeTech?.name ?? '—'}</b>
          </div>
          <div className={styles.reviewRow}>
            <span>Operating Point</span>
            <b>
              {config.corner} · {config.temperature}°C · {config.vdd}V
            </b>
          </div>
          <div className={styles.reviewRow}>
            <span>Methodology</span>
            <b>{config.sizingMethod}</b>
          </div>
          <div className={styles.reviewRow}>
            <span>MOS Instances</span>
            <b>{config.devices.length} Devices Parameterized</b>
          </div>
        </div>

        {/* Enabled Specifications Card */}
        <div className={styles.reviewCard}>
          <div className={styles.reviewCardTitle}>ACTIVE PERFORMANCE TARGETS</div>
          {Object.entries(config.specs)
            .filter(([, s]) => s.enabled)
            .slice(0, 6)
            .map(([k, s]) => (
              <div key={k} className={styles.reviewRow}>
                <span>{k}</span>
                <b>
                  {s.operator} {s.target} {s.unit}
                </b>
              </div>
            ))}
        </div>
      </div>

      {/* Validation Status Block */}
      <div className={`${styles.validationBanner} ${hasErrors ? styles.valError : styles.valSuccess}`}>
        <div className={styles.validationHeader}>
          {hasErrors ? <CircleAlert size={16} /> : <ShieldCheck size={16} />}
          <strong>{hasErrors ? 'Validation Issues Detected' : 'Configuration Valid & Synthesizable'}</strong>
        </div>
        {issues.length === 0 ? (
          <p>
            Topology, technology PDK, sizing parameters, and generator contracts are consistent
            and ready for compilation.
          </p>
        ) : (
          <div className={styles.issuesList}>
            {issues.map((issue: any) => (
              <div key={`${issue.field}-${issue.message}`} className={styles.issueItem}>
                <span className={issue.level === 'error' ? styles.levelErr : styles.levelWarn}>
                  {issue.level.toUpperCase()}
                </span>
                <span>{issue.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* 7. Results & Execution Screen */
function ResultScreen({
  topology,
  config,
  onBack,
}: {
  topology: Topology;
  config: DesignConfig;
  onBack: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [cadenceBusy, setCadenceBusy] = useState(false);
  const [simBusy, setSimBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleContinueToSimulation() {
    const session = SimulationSessionStore.createSession(
      config.circuitId,
      config.topologyId,
      config.technologyId,
      topology.name,
      topology.generator.path,
      config
    );
    router.push(`/simulation/${session.id}`);
  }
  const [cadenceError, setCadenceError] = useState<string | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [generatedName, setGeneratedName] = useState<string | null>(null);
  const [cadenceResult, setCadenceResult] = useState<any>(null);
  const [simResult, setSimResult] = useState<any>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/design/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.issues?.[0]?.message ?? 'Parameterized generator synthesis failed.');
      }
      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="([^"]+)"/);
      const name = match?.[1] ?? `${config.topologyId}_parameterized.il`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setGeneratedName(name);
      setCadenceError(null);
      setCadenceResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Parameterized generator failed.');
    } finally {
      setBusy(false);
    }
  }

  async function runCadence() {
    setCadenceBusy(true);
    setCadenceError(null);
    setCadenceResult(null);
    try {
      const response = await fetch('/api/cadence/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, dryRun: false }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) {
        throw new Error(
          body?.message ?? body?.stderr ?? `Cadence execution failed (${response.status}).`
        );
      }
      setCadenceResult(body);
    } catch (e) {
      setCadenceError(e instanceof Error ? e.message : 'Cadence execution failed.');
    } finally {
      setCadenceBusy(false);
    }
  }

  async function runSpectre() {
    setSimBusy(true);
    setSimError(null);
    setSimResult(null);
    try {
      const response = await fetch('/api/simulation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, dryRun: false }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok && !body?.status) {
        throw new Error(body?.message ?? `Simulation failed (${response.status}).`);
      }
      setSimResult(body);
    } catch (e) {
      setSimError(e instanceof Error ? e.message : 'Simulation failed.');
    } finally {
      setSimBusy(false);
    }
  }

  const runbookUrl = topology.generator.runbook
    ? `https://github.com/Markoshenouda/cadence-virtuoso-skill/blob/feature/topology-registry-integration/${topology.generator.runbook}`
    : null;
  const canonicalUrl = topology.generator.path
    ? `https://github.com/Markoshenouda/cadence-virtuoso-skill/blob/feature/topology-registry-integration/${topology.generator.path}`
    : null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>STUDIO / ARTIFACT SYNTHESIS</div>
        <h1 className={styles.pageTitle}>Parameterized Design Artifact Ready</h1>
        <p className={styles.pageSubtitle}>
          Download synthesized Cadence SKILL code, trigger remote Virtuoso schematic generation,
          or execute Spectre simulation verification.
        </p>
      </header>

      {/* Result Card */}
      <div className={styles.resultMainCard}>
        <div className={styles.resultBanner}>
          <div className={styles.resultBannerLeft}>
            <div className={styles.readyEmblem}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h2>DESIGN ARTIFACT READY FOR EXECUTION</h2>
              <p>
                Configuration validated against repository contracts: {topology.name} (
                {topology.contract.devices.length} MOS instances)
              </p>
            </div>
          </div>
          <StatusPill variant={topology.generator.status === 'verified' ? 'verified' : 'candidate'}>
            {topology.generator.status}
          </StatusPill>
        </div>

        {/* Source Generator Mapping */}
        <div className={styles.generatorBindingCard}>
          <div className={styles.genBindingHead}>
            <span>CANONICAL SKILL GENERATOR SOURCE</span>
            <code>{topology.generator.invocation}</code>
          </div>
          <div className={styles.genPathText}>{topology.generator.path}</div>
        </div>

        {/* Primary Actions Grid */}
        <div className={styles.actionsBar}>
          <button
            type="button"
            className={styles.actionBtnPrimary}
            onClick={handleContinueToSimulation}
            style={{ background: 'linear-gradient(180deg, var(--accent) 0%, var(--accent-dim) 100%)' }}
          >
            <Sparkles size={15} />
            <span>Continue to Simulation Workspace →</span>
          </button>

          <button
            type="button"
            className={styles.actionBtnSecondary}
            onClick={generate}
            disabled={busy}
          >
            <Download size={15} />
            <span>{busy ? 'Synthesizing...' : 'Generate & Download SKILL'}</span>
          </button>

          <button
            type="button"
            className={styles.actionBtnSecondary}
            onClick={runCadence}
            disabled={busy || cadenceBusy || !generatedName}
          >
            <Terminal size={15} />
            <span>{cadenceBusy ? 'Running Virtuoso...' : 'Run in Cadence Virtuoso'}</span>
          </button>

          <button
            type="button"
            className={styles.actionBtnSecondary}
            onClick={runSpectre}
            disabled={simBusy}
          >
            <FlaskConical size={15} />
            <span>{simBusy ? 'Simulating Spectre...' : 'Run Spectre Simulation'}</span>
          </button>

          <button
            type="button"
            className={styles.actionBtnGhost}
            onClick={() => navigator.clipboard?.writeText(JSON.stringify(config, null, 2))}
          >
            <Copy size={14} />
            <span>Copy JSON Config</span>
          </button>

          {runbookUrl && (
            <a
              href={runbookUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.actionBtnGhost}
            >
              <ExternalLink size={14} />
              <span>Runbook</span>
            </a>
          )}

          {canonicalUrl && (
            <a
              href={canonicalUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.actionBtnGhost}
            >
              <GitBranch size={14} />
              <span>Canonical SKILL</span>
            </a>
          )}
        </div>

        {/* Execution Guidance Notice */}
        {!generatedName && (
          <div className={styles.stepNotice}>
            <Info size={16} />
            <div>
              <strong>Generation Step</strong>
              <p>
                Click &ldquo;Generate &amp; Download SKILL&rdquo; to compile the parameterized artifact
                and unlock live Virtuoso bridge execution.
              </p>
            </div>
          </div>
        )}

        {generatedName && (
          <div className={styles.stepNoticeSuccess}>
            <CheckCircle2 size={16} />
            <div>
              <strong>Parameterized Artifact Created</strong>
              <p>
                File: <code>{generatedName}</code>
              </p>
            </div>
          </div>
        )}

        {/* Errors Display */}
        {error && (
          <div className={styles.errorBox}>
            <CircleAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {cadenceError && (
          <div className={styles.errorBox}>
            <CircleAlert size={16} />
            <span>{cadenceError}</span>
          </div>
        )}

        {simError && (
          <div className={styles.errorBox}>
            <CircleAlert size={16} />
            <span>{simError}</span>
          </div>
        )}

        {/* Cadence Bridge Live Result */}
        {cadenceResult && (
          <div className={styles.executionBox}>
            <div className={styles.execHeader}>
              <Terminal size={15} />
              <strong>Virtuoso Execution Status: {cadenceResult.status}</strong>
            </div>
            <p className={styles.execMessage}>
              {cadenceResult.message ?? cadenceResult.notes?.join(' ') ?? 'Execution completed.'}
            </p>
            <div className={styles.execDetails}>
              <div>
                <span>Generator Completed:</span>
                <b>{String(cadenceResult.evidence?.generatorCompleted)}</b>
              </div>
              <div>
                <span>Check &amp; Save Evidence:</span>
                <b>{String(cadenceResult.evidence?.checkAndSaveEvidence)}</b>
              </div>
              {cadenceResult.remoteFiles?.artifact && (
                <div>
                  <span>Remote Artifact:</span>
                  <code>{cadenceResult.remoteFiles.artifact}</code>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Spectre Simulation Result */}
        {simResult && (
          <div className={styles.simResultBox}>
            <div className={styles.simResultHeader}>
              <FlaskConical size={16} />
              <strong>
                Spectre Verification Result: {simResult.status} (Profile: {simResult.profile})
              </strong>
            </div>

            {simResult.specResults && simResult.specResults.length > 0 && (
              <div className={styles.specResultsTable}>
                <div className={styles.specResultsHead}>
                  <span>Metric</span>
                  <span>Target</span>
                  <span>Measured</span>
                  <span>Margin</span>
                  <span>Status</span>
                </div>
                {simResult.specResults.map((s: any) => (
                  <div key={s.metric} className={styles.specResultsRow}>
                    <code>{s.metric}</code>
                    <span>
                      {s.operator} {s.target} {s.unit}
                    </span>
                    <b>
                      {s.value?.toFixed(3)} {s.unit}
                    </b>
                    <span className={s.margin >= 0 ? styles.marginPositive : styles.marginNegative}>
                      {s.margin >= 0 ? `+${s.margin.toFixed(3)}` : s.margin.toFixed(3)}
                    </span>
                    <StatusPill variant={s.pass ? 'pass' : 'fail'}>
                      {s.pass ? 'PASS' : 'FAIL'}
                    </StatusPill>
                  </div>
                ))}
              </div>
            )}

            {simResult.measurements && (
              <div className={styles.measurementsBlock}>
                <div className={styles.measurementsTitle}>EXTRACTED SPECTRE MEASUREMENTS</div>
                <div className={styles.measurementsGrid}>
                  {Object.entries(simResult.measurements).map(([k, v]) => (
                    <div key={k} className={styles.measurementItem}>
                      <small>{k}</small>
                      <b>{String(v)}</b>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Back Link */}
        <div className={styles.resultFooter}>
          <button type="button" className={styles.backBtn} onClick={onBack}>
            <ChevronLeft size={15} />
            <span>Modify Design Configuration</span>
          </button>
        </div>
      </div>
    </div>
  );
}
