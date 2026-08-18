/**
 * Extended Simulation Types and Metadata
 *
 * Defines analysis types, supported metrics, output definitions,
 * specification entries, and recommendation structures for the
 * Analog IC Simulation Environment.
 */

export type SimulationTypeId =
  | 'DC_OP'
  | 'DC_SWEEP'
  | 'AC'
  | 'TRAN'
  | 'NOISE'
  | 'STABILITY'
  | 'PSRR'
  | 'CMRR'
  | 'MONTE_CARLO'
  | 'CORNER';

export type SpecOperator = '>=' | '<=' | '=' | '>' | '<';

export type SpecPriority = 'Must Have' | 'Important' | 'Optional';

export type SpecDefinition = {
  id: string;
  name: string;
  metric: string;
  target: number | null;
  operator: SpecOperator;
  unit: string;
  priority: SpecPriority;
  enabled: boolean;
};

export type SimulationOutputDef = {
  id: string;
  name: string;
  unit: string;
  description: string;
  analysis: 'dc' | 'ac' | 'tran' | 'noise';
  category: 'recommended' | 'optional' | 'custom';
};

export type SimulationTypeMetadata = {
  id: SimulationTypeId;
  title: string;
  category: 'Standard' | 'Advanced';
  description: string;
  iconName: string;
  whatItMeasures: string[];
  typicalUse: string;
  availableOutputs: SimulationOutputDef[];
  defaultOutputs: string[];
};

export const SIMULATION_TYPE_CATALOG: Record<SimulationTypeId, SimulationTypeMetadata> = {
  DC_OP: {
    id: 'DC_OP',
    title: 'DC Operating Point',
    category: 'Standard',
    description: 'Calculates static DC bias voltages, branch currents, transistor operating regions, and small-signal parameters (gm, gds, gm/ID).',
    iconName: 'Activity',
    whatItMeasures: ['Bias currents', 'Node voltages', 'Device operating regions', 'Power consumption'],
    typicalUse: 'Verify transistor saturation/triode regions and quiescent current distribution.',
    availableOutputs: [
      { id: 'power', name: 'Total Power', unit: 'mW', description: 'Total quiescent power dissipation from supplies', analysis: 'dc', category: 'recommended' },
      { id: 'iref', name: 'Reference Current', unit: 'uA', description: 'Input reference branch current', analysis: 'dc', category: 'recommended' },
      { id: 'iout', name: 'Output Current', unit: 'uA', description: 'Output branch bias current', analysis: 'dc', category: 'recommended' },
      { id: 'ratio', name: 'Current Ratio', unit: '', description: 'Ratio of Iout / Iref', analysis: 'dc', category: 'recommended' },
      { id: 'tailCurrent', name: 'Tail Current', unit: 'uA', description: 'Tail current source bias', analysis: 'dc', category: 'recommended' },
      { id: 'vref', name: 'Reference Voltage', unit: 'V', description: 'Bias node voltage at reference', analysis: 'dc', category: 'optional' },
      { id: 'vout', name: 'Output DC Voltage', unit: 'V', description: 'Quiescent output node DC voltage', analysis: 'dc', category: 'recommended' },
    ],
    defaultOutputs: ['power', 'iref', 'iout', 'vout'],
  },
  DC_SWEEP: {
    id: 'DC_SWEEP',
    title: 'DC Transfer Sweep',
    category: 'Standard',
    description: 'Sweeps an input voltage or current source to analyze DC transfer characteristics, linearity, threshold behavior, and output swing limits.',
    iconName: 'TrendingUp',
    whatItMeasures: ['DC Transfer Curve', 'Input Common-Mode Range', 'Output Voltage Swing', 'Line Regulation'],
    typicalUse: 'Determine linear input/output voltage range and transfer characteristics.',
    availableOutputs: [
      { id: 'vout_dc_sweep', name: 'Vout vs Vin', unit: 'V', description: 'DC output voltage trace vs input sweep', analysis: 'dc', category: 'recommended' },
      { id: 'output_swing', name: 'Output Swing', unit: 'V', description: 'Linear output voltage range', analysis: 'dc', category: 'recommended' },
      { id: 'icmr', name: 'Input CM Range', unit: 'V', description: 'Input common-mode linear operating range', analysis: 'dc', category: 'recommended' },
    ],
    defaultOutputs: ['vout_dc_sweep', 'output_swing'],
  },
  AC: {
    id: 'AC',
    title: 'AC Small-Signal Analysis',
    category: 'Standard',
    description: 'Computes linear small-signal frequency response, DC gain, Gain-Bandwidth Product (GBW), Phase Margin (PM), and 3dB Bandwidth.',
    iconName: 'Zap',
    whatItMeasures: ['DC Gain (dB)', 'GBW Product (MHz)', 'Phase Margin (deg)', '3dB Bandwidth (kHz)', 'Bode Plot'],
    typicalUse: 'Evaluate open-loop amplifier stability and frequency response specs.',
    availableOutputs: [
      { id: 'gain', name: 'DC Open-Loop Gain', unit: 'dB', description: 'Low-frequency small-signal gain', analysis: 'ac', category: 'recommended' },
      { id: 'gbw', name: 'Gain-Bandwidth Product', unit: 'MHz', description: 'Unity-gain crossover frequency', analysis: 'ac', category: 'recommended' },
      { id: 'phaseMargin', name: 'Phase Margin', unit: 'deg', description: 'Phase margin at unity-gain frequency', analysis: 'ac', category: 'recommended' },
      { id: 'bandwidth', name: '3dB Bandwidth', unit: 'kHz', description: '-3dB bandwidth frequency', analysis: 'ac', category: 'optional' },
      { id: 'power', name: 'DC Power Dissipation', unit: 'mW', description: 'Power consumed during bias state', analysis: 'dc', category: 'recommended' },
    ],
    defaultOutputs: ['gain', 'gbw', 'phaseMargin', 'power'],
  },
  TRAN: {
    id: 'TRAN',
    title: 'Transient Analysis',
    category: 'Standard',
    description: 'Simulates time-domain dynamic response to step, pulse, or sinusoidal stimulus. Measures Slew Rate (SR), Settling Time, and Overshoot.',
    iconName: 'Clock',
    whatItMeasures: ['Slew Rate (V/us)', 'Settling Time (ns)', 'Rise/Fall Time (ns)', 'Overshoot (%)', 'Time Waveforms'],
    typicalUse: 'Verify large-signal step response, speed limits, and transient stability.',
    availableOutputs: [
      { id: 'slewRate', name: 'Slew Rate', unit: 'V/us', description: 'Maximum output voltage slope |dV/dt|', analysis: 'tran', category: 'recommended' },
      { id: 'settlingTime', name: 'Settling Time (2%)', unit: 'ns', description: 'Time required for output to settle within 2% band', analysis: 'tran', category: 'recommended' },
      { id: 'overshoot', name: 'Peak Overshoot', unit: '%', description: 'Percentage overshoot above final steady value', analysis: 'tran', category: 'optional' },
      { id: 'vout_tran', name: 'Transient Output Waveform', unit: 'V', description: 'Vout(t) time domain trace', analysis: 'tran', category: 'recommended' },
    ],
    defaultOutputs: ['slewRate', 'settlingTime', 'vout_tran'],
  },
  NOISE: {
    id: 'NOISE',
    title: 'Noise Analysis',
    category: 'Standard',
    description: 'Evaluates thermal and flicker (1/f) noise contributions. Computes input-referred noise spectral density and total integrated noise.',
    iconName: 'Radio',
    whatItMeasures: ['Input Noise Density (nV/sqrt(Hz))', 'Output Noise Density', 'Integrated Noise (uVrms)', 'Flicker Corner'],
    typicalUse: 'Analyze low-noise amplifier limits and signal-to-noise ratio performance.',
    availableOutputs: [
      { id: 'vn_in', name: 'Input-Referred Noise', unit: 'nV/sqrt(Hz)', description: 'Equivalent input spectral noise density at 1kHz', analysis: 'noise', category: 'recommended' },
      { id: 'vn_out', name: 'Output Noise Density', unit: 'nV/sqrt(Hz)', description: 'Output spectral noise density at 1kHz', analysis: 'noise', category: 'optional' },
      { id: 'vn_int', name: 'Integrated Noise', unit: 'uVrms', description: 'Total integrated noise over specified frequency band', analysis: 'noise', category: 'recommended' },
    ],
    defaultOutputs: ['vn_in', 'vn_int'],
  },
  STABILITY: {
    id: 'STABILITY',
    title: 'Loop Stability (Stbby)',
    category: 'Advanced',
    description: 'Tian method loop-stability analysis for feedback networks without opening the feedback loop.',
    iconName: 'ShieldCheck',
    whatItMeasures: ['Loop Gain', 'Loop Phase Margin', 'Gain Margin'],
    typicalUse: 'Verify feedback loop stability in closed-loop configurations.',
    availableOutputs: [
      { id: 'loop_gain', name: 'Loop DC Gain', unit: 'dB', description: 'Low-frequency loop gain', analysis: 'ac', category: 'recommended' },
      { id: 'loop_pm', name: 'Loop Phase Margin', unit: 'deg', description: 'Phase margin of feedback loop', analysis: 'ac', category: 'recommended' },
    ],
    defaultOutputs: ['loop_gain', 'loop_pm'],
  },
  PSRR: {
    id: 'PSRR',
    title: 'Power Supply Rejection (PSRR)',
    category: 'Advanced',
    description: 'Measures small-signal AC rejection of supply voltage fluctuations onto the output node vs frequency.',
    iconName: 'Shield',
    whatItMeasures: ['PSRR at DC (dB)', 'PSRR at 100kHz (dB)', 'Rejection Spectrum'],
    typicalUse: 'Verify supply noise immunity for precision analog and reference circuits.',
    availableOutputs: [
      { id: 'psrr_dc', name: 'DC PSRR', unit: 'dB', description: 'Low-frequency power supply rejection ratio', analysis: 'ac', category: 'recommended' },
      { id: 'psrr_100k', name: 'PSRR @ 100kHz', unit: 'dB', description: 'Rejection ratio at 100 kHz ripple frequency', analysis: 'ac', category: 'recommended' },
    ],
    defaultOutputs: ['psrr_dc', 'psrr_100k'],
  },
  CMRR: {
    id: 'CMRR',
    title: 'Common-Mode Rejection (CMRR)',
    category: 'Advanced',
    description: 'Measures differential vs common-mode gain ratio across frequency to evaluate common-mode noise suppression.',
    iconName: 'GitCommit',
    whatItMeasures: ['CMRR at DC (dB)', 'CMRR Bandwidth', 'Common-Mode Gain'],
    typicalUse: 'Verify differential amplifier ability to suppress common-mode input noise.',
    availableOutputs: [
      { id: 'cmrr_dc', name: 'DC CMRR', unit: 'dB', description: 'Low-frequency common-mode rejection ratio', analysis: 'ac', category: 'recommended' },
    ],
    defaultOutputs: ['cmrr_dc'],
  },
  MONTE_CARLO: {
    id: 'MONTE_CARLO',
    title: 'Monte Carlo Mismatch',
    category: 'Advanced',
    description: 'Statistical simulation of process variations and transistor mismatch (pelgrom model) over N runs.',
    iconName: 'BarChart2',
    whatItMeasures: ['Offset Voltage Mean/Sigma', 'Gain Variation', 'Yield Percentage'],
    typicalUse: 'Evaluate statistical yield and random device mismatch effects.',
    availableOutputs: [
      { id: 'voffset_sigma', name: 'Input Offset StdDev', unit: 'mV', description: 'Standard deviation of input offset voltage', analysis: 'dc', category: 'recommended' },
    ],
    defaultOutputs: ['voffset_sigma'],
  },
  CORNER: {
    id: 'CORNER',
    title: 'Process / Corner Sweep',
    category: 'Advanced',
    description: 'Simulates design performance across process corners (TT, SS, FF, SF, FS) and temperature extremes (-40°C to 125°C).',
    iconName: 'Layers',
    whatItMeasures: ['PVT Corner Spread', 'Worst-case Gain/GBW', 'Power Variation'],
    typicalUse: 'Ensure robust spec compliance across full PVT space.',
    availableOutputs: [
      { id: 'corner_summary', name: 'Corner Spread Summary', unit: '', description: 'Min/max spec values across process corners', analysis: 'ac', category: 'recommended' },
    ],
    defaultOutputs: ['corner_summary'],
  },
};
