import type { ReactNode } from 'react';

/*
 * Engineering schematics for the registered topologies.
 *
 * Symbol geometry (device center x,y):
 *   channel bar : vertical line x, y-9 .. y+9
 *   top pin     : (x, y-17)   bottom pin: (x, y+17)
 *   gate plate  : vertical line at x-7 (or x+7 when gateSide='r')
 *   gate pin    : (x-16, y)  (or (x+16, y) when gateSide='r')
 *   arrow on the source stub: NMOS points toward the channel,
 *   PMOS points away from the channel.
 * flip=true draws the source on the top pin (used for PMOS hung from VDD).
 */

type MosType = 'n' | 'p';

interface MosProps {
  x: number;
  y: number;
  label: string;
  type?: MosType;
  flip?: boolean;
  gateSide?: 'l' | 'r';
  lx?: number;
  ly?: number;
}

function Mos({ x, y, label, type = 'n', flip = false, gateSide = 'l', lx, ly }: MosProps) {
  const ch = type === 'p' ? 'pmos' : 'nmos';
  const gs = gateSide === 'r' ? 1 : -1;
  const plateX = x + gs * 7;
  const pinX = x + gs * 16;
  const sDir = flip ? -1 : 1; // source stub direction: -1 top, +1 bottom
  // NMOS arrow tip closer to the channel, PMOS arrow tip farther away.
  const tipOff = type === 'p' ? 15.5 : 11.5;
  const baseOff = type === 'p' ? 11.5 : 15.5;
  const tipY = y + sDir * tipOff;
  const baseY = y + sDir * baseOff;
  const textX = lx ?? (gateSide === 'r' ? x - 10 : x + 10);
  const textY = ly ?? y + 3;
  return (
    <g>
      <line x1={x} y1={y - 9} x2={x} y2={y + 9} className={ch} />
      <line x1={x} y1={y - 9} x2={x} y2={y - 17} className="terminal" />
      <line x1={x} y1={y + 9} x2={x} y2={y + 17} className="terminal" />
      <line x1={plateX} y1={y - 6} x2={plateX} y2={y + 6} className="gate" />
      <line x1={plateX} y1={y} x2={pinX} y2={y} className="gate" />
      <polygon
        points={`${x},${tipY} ${x - 2.6},${baseY} ${x + 2.6},${baseY}`}
        className="node"
      />
      <text x={textX} y={textY} textAnchor={gateSide === 'r' ? 'end' : 'start'} className="mosLabel">
        {label}
      </text>
    </g>
  );
}

function Wire({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} className="wire" />;
}

function Path({ pts }: { pts: ReadonlyArray<readonly [number, number]> }) {
  return (
    <polyline
      points={pts.map(([px, py]) => `${px},${py}`).join(' ')}
      className="wire"
    />
  );
}

function Node({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={2.2} className="node" />;
}

interface TermProps {
  x: number;
  y: number;
  label: string;
  anchor?: 'start' | 'middle' | 'end';
  lx: number;
  ly: number;
}

function Term({ x, y, label, anchor = 'start', lx, ly }: TermProps) {
  return (
    <g>
      <rect x={x - 2.5} y={y - 2.5} width={5} height={5} className="terminal" />
      <text x={lx} y={ly} textAnchor={anchor} className="netLabel">
        {label}
      </text>
    </g>
  );
}

interface RailProps {
  y: number;
  x1: number;
  x2: number;
  label: string;
  lx: number;
  ly: number;
}

function Rail({ y, x1, x2, label, lx, ly }: RailProps) {
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} className="supply" />
      <text x={lx} y={ly} className="supplyLabel">
        {label}
      </text>
    </g>
  );
}

function Net({ x, y, label, anchor = 'start' }: { x: number; y: number; label: string; anchor?: 'start' | 'middle' | 'end' }) {
  return (
    <text x={x} y={y} textAnchor={anchor} className="netLabel">
      {label}
    </text>
  );
}

/* 1. 5-transistor OTA: M3 diode PMOS mirror, M4, M1/M2 input pair, M5 tail. */
function FiveTota(): ReactNode {
  return (
    <>
      <Rail y={16} x1={40} x2={182} label="VDD" lx={186} ly={19} />
      <Wire x1={78} y1={16} x2={78} y2={23} />
      <Wire x1={140} y1={16} x2={140} y2={23} />
      <Node x={78} y={16} />
      <Node x={140} y={16} />
      <Mos x={78} y={40} label="M3" type="p" flip />
      <Mos x={140} y={40} label="M4" type="p" flip />
      {/* MIRROR node: M3 drain = M3 gate = M4 gate (diode wrap + gate bus) */}
      <Path pts={[[78, 57], [62, 57], [62, 40]]} />
      <Path pts={[[62, 57], [124, 57], [124, 40]]} />
      <Node x={78} y={57} />
      <Node x={62} y={57} />
      <Net x={82} y={66} label="MIRROR" />
      <Wire x1={78} y1={57} x2={78} y2={103} />
      <Wire x1={140} y1={57} x2={140} y2={103} />
      <Node x={140} y={80} />
      <Wire x1={140} y1={80} x2={168} y2={80} />
      <Term x={168} y={80} label="VOUT" lx={172} ly={83} />
      <Mos x={78} y={120} label="M1" />
      <Mos x={140} y={120} label="M2" gateSide="r" />
      <Wire x1={62} y1={120} x2={42} y2={120} />
      <Term x={42} y={120} label="VINP" anchor="end" lx={38} ly={123} />
      <Wire x1={156} y1={120} x2={176} y2={120} />
      <Term x={176} y={120} label="VINN" lx={180} ly={123} />
      {/* TAIL: M1.S + M2.S join down into M5 drain */}
      <Wire x1={78} y1={137} x2={140} y2={137} />
      <Node x={111} y={137} />
      <Wire x1={111} y1={137} x2={111} y2={183} />
      <Mos x={111} y={200} label="M5" />
      <Wire x1={95} y1={200} x2={72} y2={200} />
      <Term x={72} y={200} label="VBN_TAIL" anchor="end" lx={68} ly={203} />
      <Wire x1={111} y1={217} x2={111} y2={246} />
      <Rail y={246} x1={40} x2={182} label="VSS" lx={186} ly={249} />
      <Node x={111} y={246} />
    </>
  );
}

/* 2. Telescopic OTA: PMOS loads, PMOS cascodes, NMOS cascodes, input pair, tail. */
function TelescopicOta(): ReactNode {
  return (
    <>
      <Rail y={16} x1={44} x2={178} label="VDD" lx={182} ly={19} />
      <Wire x1={62} y1={16} x2={62} y2={21} />
      <Wire x1={160} y1={16} x2={160} y2={21} />
      <Node x={62} y={16} />
      <Node x={160} y={16} />
      <Mos x={62} y={38} label="M7" type="p" flip />
      <Mos x={160} y={38} label="M8" type="p" flip />
      {/* VBP_LOAD gate bus */}
      <Path pts={[[46, 38], [46, 27], [144, 27], [144, 38]]} />
      <Wire x1={46} y1={27} x2={36} y2={27} />
      <Term x={36} y={27} label="VBP_LOAD" anchor="end" lx={32} ly={24} />
      <Wire x1={62} y1={55} x2={62} y2={63} />
      <Wire x1={160} y1={55} x2={160} y2={63} />
      <Mos x={62} y={80} label="M5" type="p" flip />
      <Mos x={160} y={80} label="M6" type="p" flip />
      {/* VBP_CAS gate bus */}
      <Path pts={[[46, 80], [46, 68], [144, 68], [144, 80]]} />
      <Wire x1={46} y1={68} x2={36} y2={68} />
      <Term x={36} y={68} label="VBP_CAS" anchor="end" lx={32} ly={65} />
      {/* differential outputs tap the M5/M6 drain junctions */}
      <Node x={62} y={97} />
      <Wire x1={62} y1={97} x2={40} y2={97} />
      <Term x={40} y={97} label="VOUTP" anchor="end" lx={36} ly={94} />
      <Node x={160} y={97} />
      <Wire x1={160} y1={97} x2={182} y2={97} />
      <Term x={182} y={97} label="VOUTN" lx={186} ly={100} />
      <Wire x1={62} y1={97} x2={62} y2={105} />
      <Wire x1={160} y1={97} x2={160} y2={105} />
      <Mos x={62} y={122} label="M3" />
      <Mos x={160} y={122} label="M4" />
      {/* VBN_CAS gate bus (label on the right) */}
      <Path pts={[[46, 122], [46, 110], [144, 110], [144, 122]]} />
      <Wire x1={144} y1={110} x2={156} y2={110} />
      <Term x={156} y={110} label="VBN_CAS" lx={160} ly={114} />
      <Wire x1={62} y1={139} x2={62} y2={147} />
      <Wire x1={160} y1={139} x2={160} y2={147} />
      <Mos x={62} y={164} label="M1" />
      <Mos x={160} y={164} label="M2" gateSide="r" />
      <Wire x1={46} y1={164} x2={30} y2={164} />
      <Term x={30} y={164} label="VINP" anchor="end" lx={26} ly={167} />
      <Wire x1={176} y1={164} x2={192} y2={164} />
      <Term x={192} y={164} label="VINN" lx={196} ly={167} />
      {/* TAIL into M9 */}
      <Wire x1={62} y1={181} x2={160} y2={181} />
      <Node x={111} y={181} />
      <Wire x1={111} y1={181} x2={111} y2={190} />
      <Mos x={111} y={207} label="M9" />
      <Wire x1={95} y1={207} x2={70} y2={207} />
      <Term x={70} y={207} label="VBN_TAIL" anchor="end" lx={66} ly={210} />
      <Wire x1={111} y1={224} x2={111} y2={246} />
      <Rail y={246} x1={44} x2={178} label="VSS" lx={182} ly={249} />
      <Node x={111} y={246} />
    </>
  );
}

/* 3. Folded-cascode OTA (11 devices): PMOS sources on VDD, folded nodes drop
 * to the input pair drains, PMOS cascodes hang on the folded nodes, NMOS
 * cascode + sink stack to VSS, tail sink M11 at the bottom center. */
function FoldedCascodeOta(): ReactNode {
  return (
    <>
      <Rail y={16} x1={28} x2={194} label="VDD" lx={198} ly={19} />
      <Wire x1={64} y1={16} x2={64} y2={18} />
      <Wire x1={158} y1={16} x2={158} y2={18} />
      <Node x={64} y={16} />
      <Node x={158} y={16} />
      <Mos x={64} y={35} label="M3" type="p" flip />
      <Mos x={158} y={35} label="M4" type="p" flip />
      <Wire x1={48} y1={35} x2={38} y2={35} />
      <Term x={38} y={35} label="VBP2" anchor="end" lx={34} ly={38} />
      <Wire x1={142} y1={35} x2={132} y2={35} />
      <Term x={132} y={35} label="VBP2" anchor="end" lx={128} ly={38} />
      {/* NLEFT / NRIGHT nodes also feed the input pair drains below */}
      <Node x={64} y={50} />
      <Path pts={[[64, 50], [80, 50], [80, 196], [90, 196]]} />
      <Node x={158} y={50} />
      <Path pts={[[158, 50], [146, 50], [146, 196], [136, 196]]} />
      <Mos x={64} y={67} label="M5" type="p" flip />
      <Mos x={158} y={67} label="M6" type="p" flip />
      <Wire x1={48} y1={67} x2={38} y2={67} />
      <Term x={38} y={67} label="VBP1" anchor="end" lx={34} ly={70} />
      <Wire x1={142} y1={67} x2={132} y2={67} />
      <Term x={132} y={67} label="VBP1" anchor="end" lx={128} ly={70} />
      {/* VOUT at the M6 drain (also M8 drain junction) */}
      <Node x={158} y={84} />
      <Wire x1={158} y1={84} x2={194} y2={84} />
      <Term x={194} y={84} label="VOUT" lx={198} ly={87} />
      <Mos x={64} y={101} label="M7" />
      <Mos x={158} y={101} label="M8" />
      <Wire x1={48} y1={101} x2={38} y2={101} />
      <Term x={38} y={101} label="VBN1" anchor="end" lx={34} ly={104} />
      <Wire x1={142} y1={101} x2={132} y2={101} />
      <Term x={132} y={101} label="VBN1" anchor="end" lx={128} ly={104} />
      <Mos x={64} y={135} label="M9" />
      <Mos x={158} y={135} label="M10" />
      <Wire x1={48} y1={135} x2={38} y2={135} />
      <Term x={38} y={135} label="VBN2" anchor="end" lx={34} ly={138} />
      <Wire x1={142} y1={135} x2={132} y2={135} />
      <Term x={132} y={135} label="VBN2" anchor="end" lx={128} ly={138} />
      {/* sinks to the VSS rail (left one jogs clear of the input pair) */}
      <Path pts={[[64, 152], [64, 158], [40, 158], [40, 264]]} />
      <Wire x1={158} y1={152} x2={158} y2={264} />
      {/* input pair at the bottom center */}
      <Mos x={90} y={213} label="M1" lx={96} ly={207} />
      <Mos x={136} y={213} label="M2" />
      <Wire x1={74} y1={213} x2={58} y2={213} />
      <Term x={58} y={213} label="VINP" lx={44} ly={209} />
      <Wire x1={120} y1={213} x2={106} y2={213} />
      <Term x={106} y={213} label="VINN" lx={102} ly={225} />
      <Wire x1={90} y1={230} x2={136} y2={230} />
      <Node x={111} y={230} />
      <Mos x={111} y={247} label="M11" />
      <Wire x1={95} y1={247} x2={72} y2={247} />
      <Term x={72} y={247} label="VBN_TAIL" lx={44} ly={243} />
      <Rail y={264} x1={28} x2={194} label="VSS" lx={198} ly={267} />
      <Node x={40} y={264} />
      <Node x={158} y={264} />
      <Node x={111} y={264} />
    </>
  );
}

/* 4. Simple NMOS current mirror: M1 diode-connected on IREF, M2 output.
 * No VDD rail - IREF/IOUT are open terminals, VSS rail at the bottom. */
function SimpleCurrentMirror(): ReactNode {
  return (
    <>
      <Mos x={84} y={150} label="M1" />
      <Mos x={138} y={150} label="M2" />
      {/* IREF node = M1 drain = M1 gate (left wrap) = M2 gate (right bus) */}
      <Node x={84} y={133} />
      <Path pts={[[84, 133], [60, 133], [60, 150], [68, 150]]} />
      <Path pts={[[84, 133], [122, 133], [122, 150]]} />
      <Wire x1={84} y1={133} x2={84} y2={98} />
      <Term x={84} y={98} label="IREF" anchor="end" lx={78} ly={101} />
      <Wire x1={138} y1={133} x2={138} y2={98} />
      <Term x={138} y={98} label="IOUT" lx={142} ly={101} />
      <Wire x1={84} y1={167} x2={84} y2={226} />
      <Wire x1={138} y1={167} x2={138} y2={226} />
      <Rail y={226} x1={40} x2={182} label="VSS" lx={186} ly={229} />
      <Node x={84} y={226} />
      <Node x={138} y={226} />
    </>
  );
}

/* 5. Cascode current mirror: M3/M4 cascodes on top (VBC gate bus), M1
 * diode-connected at the bottom, no VDD rail. */
function CascodeCurrentMirror(): ReactNode {
  return (
    <>
      <Mos x={78} y={90} label="M3" gateSide="r" />
      <Mos x={146} y={90} label="M4" />
      {/* VBC gate bus between the cascode gates */}
      <Wire x1={94} y1={90} x2={130} y2={90} />
      <Node x={112} y={90} />
      <Wire x1={112} y1={90} x2={112} y2={82} />
      <Term x={112} y={82} label="VBC" anchor="middle" lx={112} ly={77} />
      <Wire x1={78} y1={73} x2={78} y2={44} />
      <Term x={78} y={44} label="IREF" anchor="end" lx={72} ly={47} />
      <Wire x1={146} y1={73} x2={146} y2={44} />
      <Term x={146} y={44} label="IOUT" lx={150} ly={47} />
      {/* NB: M3.S down to the M1 drain/gate diode node */}
      <Wire x1={78} y1={107} x2={78} y2={153} />
      <Node x={78} y={153} />
      <Path pts={[[78, 153], [94, 153], [94, 170]]} />
      <Node x={94} y={170} />
      <Mos x={78} y={170} label="M1" gateSide="r" />
      <Mos x={146} y={170} label="M2" />
      {/* NB gate bus from the M1 diode wrap to M2 gate */}
      <Wire x1={94} y1={170} x2={130} y2={170} />
      {/* NB2: M4.S down to M2 drain */}
      <Wire x1={146} y1={107} x2={146} y2={153} />
      <Wire x1={78} y1={187} x2={78} y2={240} />
      <Wire x1={146} y1={187} x2={146} y2={240} />
      <Rail y={240} x1={40} x2={184} label="VSS" lx={188} ly={243} />
      <Node x={78} y={240} />
      <Node x={146} y={240} />
    </>
  );
}

/* 6. PMOS current mirror hung from VDD: diode wrap at the BOTTOM,
 * IREF/IOUT terminals on the drain side (bottom), no VSS. */
function PmosCurrentMirror(): ReactNode {
  return (
    <>
      <Rail y={30} x1={40} x2={182} label="VDD" lx={186} ly={33} />
      <Wire x1={84} y1={30} x2={84} y2={93} />
      <Wire x1={138} y1={30} x2={138} y2={93} />
      <Node x={84} y={30} />
      <Node x={138} y={30} />
      <Mos x={84} y={110} label="M1" type="p" flip />
      <Mos x={138} y={110} label="M2" type="p" flip />
      {/* IREF node = M1 drain = M1 gate (left wrap) = M2 gate (right bus) */}
      <Node x={84} y={127} />
      <Path pts={[[84, 127], [60, 127], [60, 110], [68, 110]]} />
      <Path pts={[[84, 127], [122, 127], [122, 110]]} />
      <Wire x1={84} y1={127} x2={84} y2={200} />
      <Term x={84} y={200} label="IREF" anchor="end" lx={78} ly={203} />
      <Wire x1={138} y1={127} x2={138} y2={200} />
      <Term x={138} y={200} label="IOUT" lx={142} ly={203} />
    </>
  );
}

/* 7. NMOS differential pair: open drains (no VDD), tail sink M3 to VSS. */
function DifferentialPairNmos(): ReactNode {
  return (
    <>
      <Mos x={80} y={120} label="M1" />
      <Mos x={142} y={120} label="M2" gateSide="r" />
      <Wire x1={64} y1={120} x2={44} y2={120} />
      <Term x={44} y={120} label="VIP" anchor="end" lx={40} ly={123} />
      <Wire x1={158} y1={120} x2={178} y2={120} />
      <Term x={178} y={120} label="VIN" lx={182} ly={123} />
      <Wire x1={80} y1={103} x2={80} y2={72} />
      <Term x={80} y={72} label="VOUTP" anchor="end" lx={74} ly={75} />
      <Wire x1={142} y1={103} x2={142} y2={72} />
      <Term x={142} y={72} label="VOUTN" lx={146} ly={75} />
      <Wire x1={80} y1={137} x2={142} y2={137} />
      <Node x={111} y={137} />
      <Wire x1={111} y1={137} x2={111} y2={160} />
      <Mos x={111} y={177} label="M3" />
      <Wire x1={95} y1={177} x2={72} y2={177} />
      <Term x={72} y={177} label="VBN_TAIL" anchor="end" lx={68} ly={180} />
      <Wire x1={111} y1={194} x2={111} y2={244} />
      <Rail y={244} x1={40} x2={182} label="VSS" lx={186} ly={247} />
      <Node x={111} y={244} />
    </>
  );
}

/* 8. Common-source: PMOS load M2 on VDD, NMOS M1 input device. */
function CommonSource(): ReactNode {
  return (
    <>
      <Rail y={30} x1={46} x2={176} label="VDD" lx={180} ly={33} />
      <Wire x1={111} y1={30} x2={111} y2={47} />
      <Node x={111} y={30} />
      <Mos x={111} y={64} label="M2" type="p" flip />
      <Wire x1={95} y1={64} x2={74} y2={64} />
      <Term x={74} y={64} label="VBP" anchor="end" lx={70} ly={67} />
      <Wire x1={111} y1={81} x2={111} y2={133} />
      <Node x={111} y={107} />
      <Wire x1={111} y1={107} x2={150} y2={107} />
      <Term x={150} y={107} label="VOUT" lx={154} ly={110} />
      <Mos x={111} y={150} label="M1" />
      <Wire x1={95} y1={150} x2={74} y2={150} />
      <Term x={74} y={150} label="VIN" anchor="end" lx={70} ly={153} />
      <Wire x1={111} y1={167} x2={111} y2={244} />
      <Rail y={244} x1={46} x2={176} label="VSS" lx={180} ly={247} />
      <Node x={111} y={244} />
    </>
  );
}

/* 9. Source follower: output is taken at the M1 SOURCE node. */
function SourceFollower(): ReactNode {
  return (
    <>
      <Rail y={30} x1={46} x2={176} label="VDD" lx={180} ly={33} />
      <Wire x1={111} y1={30} x2={111} y2={63} />
      <Node x={111} y={30} />
      <Mos x={111} y={80} label="M1" />
      <Wire x1={95} y1={80} x2={74} y2={80} />
      <Term x={74} y={80} label="VIN" anchor="end" lx={70} ly={83} />
      <Wire x1={111} y1={97} x2={111} y2={163} />
      <Node x={111} y={130} />
      <Wire x1={111} y1={130} x2={150} y2={130} />
      <Term x={150} y={130} label="VOUT" lx={154} ly={133} />
      <Mos x={111} y={180} label="M2" />
      <Wire x1={95} y1={180} x2={74} y2={180} />
      <Term x={74} y={180} label="VBN" anchor="end" lx={70} ly={183} />
      <Wire x1={111} y1={197} x2={111} y2={244} />
      <Rail y={244} x1={46} x2={176} label="VSS" lx={180} ly={247} />
      <Node x={111} y={244} />
    </>
  );
}

/* 10. Cascode amplifier: PMOS load M3, NMOS cascode M2, input M1. */
function CascodeAmplifier(): ReactNode {
  return (
    <>
      <Rail y={30} x1={46} x2={176} label="VDD" lx={180} ly={33} />
      <Wire x1={111} y1={30} x2={111} y2={53} />
      <Node x={111} y={30} />
      <Mos x={111} y={70} label="M3" type="p" flip />
      <Wire x1={95} y1={70} x2={74} y2={70} />
      <Term x={74} y={70} label="VBP" anchor="end" lx={70} ly={73} />
      <Node x={111} y={87} />
      <Wire x1={111} y1={87} x2={150} y2={87} />
      <Term x={150} y={87} label="VOUT" lx={154} ly={90} />
      <Wire x1={111} y1={87} x2={111} y2={123} />
      <Mos x={111} y={140} label="M2" />
      <Wire x1={95} y1={140} x2={74} y2={140} />
      <Term x={74} y={140} label="VBN_CAS" anchor="end" lx={70} ly={143} />
      <Wire x1={111} y1={157} x2={111} y2={193} />
      <Net x={117} y={172} label="NCAS" />
      <Mos x={111} y={210} label="M1" />
      <Wire x1={95} y1={210} x2={74} y2={210} />
      <Term x={74} y={210} label="VIN" anchor="end" lx={70} ly={213} />
      <Wire x1={111} y1={227} x2={111} y2={252} />
      <Rail y={252} x1={46} x2={176} label="VSS" lx={180} ly={255} />
      <Node x={111} y={252} />
    </>
  );
}

/* 11. Two-stage Miller OTA: 5T first stage (M3 diode, M4 load, M1/M2 pair,
 * M5 tail) plus a second stage NMOS M6 with PMOS load M7 (gate on MIRROR).
 * The V1 generator instantiates 7 MOSFETs only - no compensation capacitor. */
function TwoStageMillerOta(): ReactNode {
  return (
    <>
      <Rail y={16} x1={60} x2={300} label="VDD" lx={304} ly={19} />
      <Wire x1={84} y1={16} x2={84} y2={27} />
      <Wire x1={148} y1={16} x2={148} y2={27} />
      <Wire x1={260} y1={16} x2={260} y2={53} />
      <Node x={84} y={16} />
      <Node x={148} y={16} />
      <Node x={260} y={16} />
      <Mos x={84} y={44} label="M3" type="p" flip />
      <Mos x={148} y={44} label="M4" type="p" flip />
      {/* MIRROR: M3 diode wrap, gate bus to M4 and across to the M7 gate */}
      <Path pts={[[84, 61], [68, 61], [68, 44]]} />
      <Path pts={[[68, 44], [68, 33], [244, 33]]} />
      <Wire x1={132} y1={33} x2={132} y2={44} />
      <Node x={132} y={33} />
      <Wire x1={244} y1={33} x2={244} y2={70} />
      <Node x={244} y={33} />
      <Node x={84} y={61} />
      <Net x={54} y={72} label="MIRROR" />
      <Wire x1={84} y1={61} x2={84} y2={107} />
      <Wire x1={148} y1={61} x2={148} y2={107} />
      <Node x={148} y={84} />
      <Path pts={[[148, 84], [212, 84], [212, 190], [244, 190]]} />
      <Net x={152} y={80} label="VOUT1" />
      <Mos x={84} y={124} label="M1" />
      <Mos x={148} y={124} label="M2" gateSide="r" />
      <Wire x1={68} y1={124} x2={44} y2={124} />
      <Term x={44} y={124} label="VINP" anchor="end" lx={40} ly={127} />
      <Wire x1={164} y1={124} x2={186} y2={124} />
      <Term x={186} y={124} label="VINN" lx={190} ly={127} />
      {/* TAIL into M5 */}
      <Wire x1={84} y1={141} x2={148} y2={141} />
      <Node x={116} y={141} />
      <Wire x1={116} y1={141} x2={116} y2={191} />
      <Mos x={116} y={208} label="M5" />
      <Wire x1={100} y1={208} x2={80} y2={208} />
      <Term x={80} y={208} label="VBN_TAIL" anchor="end" lx={76} ly={211} />
      <Wire x1={116} y1={225} x2={116} y2={270} />
      {/* second stage: M7 PMOS load over M6 NMOS, output at the drain junction */}
      <Mos x={260} y={70} label="M7" type="p" flip />
      <Mos x={260} y={190} label="M6" />
      <Wire x1={260} y1={87} x2={260} y2={173} />
      <Node x={260} y={130} />
      <Wire x1={260} y1={130} x2={284} y2={130} />
      <Term x={284} y={130} label="VOUT" lx={288} ly={133} />
      <Wire x1={260} y1={207} x2={260} y2={270} />
      <Rail y={270} x1={60} x2={300} label="VSS" lx={304} ly={273} />
      <Node x={116} y={270} />
      <Node x={260} y={270} />
    </>
  );
}

/* 12. Symmetrical OTA: NMOS input pair, tail M7, and two NMOS diode/mirror
 * stacks (M3/M4 on NA, M5/M6 on NB) whose drains join at VOUT with the
 * PMOS load M8. */
function SymmetricalOta(): ReactNode {
  return (
    <>
      <Rail y={16} x1={60} x2={316} label="VDD" lx={320} ly={19} />
      <Wire x1={290} y1={16} x2={290} y2={33} />
      <Node x={290} y={16} />
      <Mos x={290} y={50} label="M8" type="p" flip />
      <Wire x1={274} y1={50} x2={260} y2={50} />
      <Term x={260} y={50} label="VBP" anchor="end" lx={256} ly={53} />
      {/* input pair */}
      <Mos x={120} y={70} label="M1" />
      <Mos x={200} y={70} label="M2" gateSide="r" />
      <Wire x1={104} y1={70} x2={88} y2={70} />
      <Term x={88} y={70} label="VIP" anchor="end" lx={84} ly={73} />
      <Wire x1={216} y1={70} x2={232} y2={70} />
      <Term x={232} y={70} label="VIN" lx={236} ly={73} />
      {/* tail */}
      <Wire x1={120} y1={87} x2={200} y2={87} />
      <Node x={134} y={87} />
      <Wire x1={134} y1={87} x2={134} y2={93} />
      <Mos x={134} y={110} label="M7" />
      <Wire x1={118} y1={110} x2={98} y2={110} />
      <Term x={98} y={110} label="VBN_TAIL" anchor="end" lx={94} ly={113} />
      <Wire x1={134} y1={127} x2={134} y2={210} />
      {/* NA branch: M1 drain down the left edge to the M3 diode and M4 gate */}
      <Path pts={[[120, 53], [120, 44], [80, 44], [80, 167]]} />
      <Path pts={[[80, 150], [126, 150], [126, 167]]} />
      <Node x={80} y={150} />
      <Node x={96} y={150} />
      <Net x={84} y={60} label="NA" />
      <Mos x={96} y={167} label="M3" />
      <Mos x={142} y={167} label="M4" />
      {/* NB branch: M2 drain over the top right edge, down to M5/M6 gates */}
      <Path pts={[[200, 53], [200, 44], [310, 44], [310, 167], [254, 167]]} />
      <Path pts={[[254, 154], [212, 154], [212, 167]]} />
      <Path pts={[[254, 146], [196, 146]]} />
      <Wire x1={196} y1={150} x2={196} y2={146} />
      <Node x={254} y={154} />
      <Node x={254} y={146} />
      <Net x={250} y={40} label="NB" />
      <Mos x={196} y={167} label="M5" gateSide="r" />
      <Mos x={270} y={167} label="M6" />
      {/* VOUT: M4/M6 drains join the M8 drain; one crossing over the NB trunk */}
      <Path pts={[[142, 150], [142, 140], [146, 140], [146, 98], [266, 98], [266, 130]]} />
      <Wire x1={270} y1={150} x2={270} y2={130} />
      <Path pts={[[290, 67], [290, 130]]} />
      <Wire x1={266} y1={130} x2={290} y2={130} />
      <Node x={270} y={130} />
      <Node x={290} y={130} />
      <Term x={290} y={122} label="VOUT" anchor="middle" lx={290} ly={118} />
      {/* sinks */}
      <Wire x1={96} y1={184} x2={96} y2={210} />
      <Wire x1={142} y1={184} x2={142} y2={210} />
      <Wire x1={196} y1={184} x2={196} y2={210} />
      <Wire x1={270} y1={184} x2={270} y2={210} />
      <Rail y={210} x1={60} x2={316} label="VSS" lx={320} ly={213} />
      <Node x={96} y={210} />
      <Node x={142} y={210} />
      <Node x={196} y={210} />
      <Node x={270} y={210} />
      <Node x={134} y={210} />
    </>
  );
}

/* 13. Three-stage OTA: 5T first stage, then two NMOS/PMOS gain stages
 * (M6/M7 and M8/M9) cascaded to the right; every PMOS load gate sits on
 * the first-stage MIRROR node. */
function ThreeStageOta(): ReactNode {
  return (
    <>
      <Rail y={16} x1={50} x2={300} label="VDD" lx={304} ly={19} />
      <Wire x1={66} y1={16} x2={66} y2={27} />
      <Wire x1={120} y1={16} x2={120} y2={27} />
      <Wire x1={186} y1={16} x2={186} y2={27} />
      <Wire x1={250} y1={16} x2={250} y2={107} />
      <Node x={66} y={16} />
      <Node x={120} y={16} />
      <Node x={186} y={16} />
      <Node x={250} y={16} />
      {/* first stage */}
      <Mos x={66} y={44} label="M3" type="p" flip />
      <Mos x={120} y={44} label="M4" type="p" flip />
      <Path pts={[[66, 61], [50, 61], [50, 44], [50, 33], [224, 33]]} />
      <Wire x1={104} y1={33} x2={104} y2={44} />
      <Node x={104} y={33} />
      <Node x={66} y={61} />
      <Net x={44} y={72} label="MIRROR" />
      <Wire x1={66} y1={61} x2={66} y2={107} />
      <Wire x1={120} y1={61} x2={120} y2={107} />
      <Node x={120} y={84} />
      <Net x={124} y={80} label="VOUT1" />
      <Mos x={66} y={124} label="M1" />
      <Mos x={120} y={124} label="M2" />
      <Wire x1={50} y1={124} x2={34} y2={124} />
      <Term x={34} y={124} label="VINP" anchor="end" lx={30} ly={127} />
      <Path pts={[[104, 124], [104, 112], [116, 112]]} />
      <Term x={116} y={112} label="VINN" lx={120} ly={115} />
      <Wire x1={66} y1={141} x2={120} y2={141} />
      <Node x={93} y={141} />
      <Wire x1={93} y1={141} x2={93} y2={153} />
      <Mos x={93} y={170} label="M5" />
      <Wire x1={77} y1={170} x2={56} y2={170} />
      <Term x={56} y={170} label="VBN_TAIL" anchor="end" lx={52} ly={173} />
      <Wire x1={93} y1={187} x2={93} y2={244} />
      {/* MIRROR continuation to the M7 and M9 load gates */}
      <Wire x1={170} y1={33} x2={170} y2={44} />
      <Node x={170} y={33} />
      <Wire x1={224} y1={33} x2={224} y2={124} />
      <Node x={224} y={33} />
      {/* second stage */}
      <Mos x={186} y={44} label="M7" type="p" flip />
      <Mos x={186} y={190} label="M6" />
      <Wire x1={186} y1={61} x2={186} y2={173} />
      <Node x={186} y={130} />
      <Net x={190} y={126} label="VOUT2" />
      <Path pts={[[120, 84], [138, 84], [138, 190], [170, 190]]} />
      {/* third stage */}
      <Mos x={250} y={124} label="M9" type="p" flip />
      <Mos x={250} y={210} label="M8" />
      <Path pts={[[186, 130], [204, 130], [204, 210], [234, 210]]} />
      <Wire x1={250} y1={141} x2={250} y2={193} />
      <Node x={250} y={166} />
      <Wire x1={250} y1={166} x2={274} y2={166} />
      <Term x={274} y={166} label="VOUT" lx={278} ly={169} />
      <Wire x1={186} y1={207} x2={186} y2={244} />
      <Wire x1={250} y1={227} x2={250} y2={244} />
      <Rail y={244} x1={50} x2={300} label="VSS" lx={304} ly={247} />
      <Node x={93} y={244} />
      <Node x={186} y={244} />
      <Node x={250} y={244} />
    </>
  );
}

/* 14. Current-mirror OTA: NMOS pair, PMOS mirror M3/M4 shifting the signal
 * from NA to NB, NMOS mirror M5/M6 loading the output, PMOS M8 pull-up. */
function CurrentMirrorOta(): ReactNode {
  return (
    <>
      <Rail y={16} x1={50} x2={316} label="VDD" lx={320} ly={19} />
      <Wire x1={190} y1={16} x2={190} y2={43} />
      <Wire x1={250} y1={16} x2={250} y2={43} />
      <Wire x1={300} y1={16} x2={300} y2={103} />
      <Node x={190} y={16} />
      <Node x={250} y={16} />
      <Node x={300} y={16} />
      <Mos x={190} y={60} label="M3" type="p" flip />
      <Mos x={250} y={60} label="M4" type="p" flip />
      {/* NA: M1 drain to the M3 diode wrap and the M4 gate */}
      <Path pts={[[110, 63], [110, 50], [160, 50], [160, 60], [174, 60]]} />
      <Path pts={[[160, 50], [234, 50], [234, 60]]} />
      <Node x={160} y={50} />
      <Path pts={[[190, 77], [190, 90], [174, 90], [174, 60]]} />
      <Net x={114} y={60} label="NA" />
      {/* NB: M2 drain over to the M4 drain, down to the M5 diode and M6 gate */}
      <Path pts={[[170, 63], [170, 56], [214, 56], [214, 110], [250, 110], [250, 77]]} />
      <Wire x1={214} y1={110} x2={214} y2={158} />
      <Node x={214} y={110} />
      <Net x={176} y={52} label="NB" />
      <Wire x1={174} y1={158} x2={234} y2={158} />
      <Wire x1={174} y1={158} x2={174} y2={170} />
      <Wire x1={234} y1={158} x2={234} y2={170} />
      <Wire x1={190} y1={150} x2={190} y2={158} />
      <Node x={174} y={158} />
      <Node x={190} y={158} />
      <Node x={234} y={158} />
      <Mos x={190} y={170} label="M5" />
      <Mos x={250} y={170} label="M6" />
      {/* input pair and tail */}
      <Mos x={110} y={80} label="M1" />
      <Mos x={170} y={80} label="M2" />
      <Wire x1={94} y1={80} x2={74} y2={80} />
      <Term x={74} y={80} label="VIP" anchor="end" lx={70} ly={83} />
      <Wire x1={154} y1={80} x2={140} y2={80} />
      <Term x={140} y={80} label="VIN" anchor="end" lx={136} ly={83} />
      <Wire x1={110} y1={97} x2={170} y2={97} />
      <Node x={140} y={97} />
      <Wire x1={140} y1={97} x2={140} y2={113} />
      <Mos x={140} y={130} label="M7" />
      <Wire x1={124} y1={130} x2={100} y2={130} />
      <Term x={100} y={130} label="VBN_TAIL" anchor="end" lx={96} ly={133} />
      <Wire x1={140} y1={147} x2={140} y2={244} />
      {/* output: M6 and M8 drains on the VOUT bus */}
      <Mos x={300} y={120} label="M8" type="p" flip />
      <Wire x1={284} y1={120} x2={266} y2={120} />
      <Term x={266} y={120} label="VBP" anchor="end" lx={262} ly={123} />
      <Wire x1={250} y1={153} x2={250} y2={140} />
      <Wire x1={300} y1={137} x2={300} y2={140} />
      <Wire x1={250} y1={140} x2={300} y2={140} />
      <Node x={250} y={140} />
      <Node x={275} y={140} />
      <Wire x1={275} y1={140} x2={275} y2={128} />
      <Term x={275} y={128} label="VOUT" anchor="middle" lx={275} ly={124} />
      {/* sinks */}
      <Wire x1={190} y1={187} x2={190} y2={244} />
      <Wire x1={250} y1={187} x2={250} y2={244} />
      <Rail y={244} x1={50} x2={316} label="VSS" lx={320} ly={247} />
      <Node x={140} y={244} />
      <Node x={190} y={244} />
      <Node x={250} y={244} />
    </>
  );
}

/* 15. Fully-differential folded cascode OTA: same 11-device core as the
 * single-ended folded cascode, but both branches carry output taps
 * (VOUTP left, VOUTN right). */
function FullyDiffFoldedCascodeOta(): ReactNode {
  return (
    <>
      <Rail y={16} x1={28} x2={194} label="VDD" lx={198} ly={19} />
      <Wire x1={64} y1={16} x2={64} y2={18} />
      <Wire x1={158} y1={16} x2={158} y2={18} />
      <Node x={64} y={16} />
      <Node x={158} y={16} />
      <Mos x={64} y={35} label="M3" type="p" flip />
      <Mos x={158} y={35} label="M4" type="p" flip />
      <Wire x1={48} y1={35} x2={38} y2={35} />
      <Term x={38} y={35} label="VBP2" anchor="end" lx={34} ly={38} />
      <Wire x1={142} y1={35} x2={132} y2={35} />
      <Term x={132} y={35} label="VBP2" anchor="end" lx={128} ly={38} />
      {/* NLEFT / NRIGHT nodes also feed the input pair drains below */}
      <Node x={64} y={50} />
      <Path pts={[[64, 50], [80, 50], [80, 196], [90, 196]]} />
      <Node x={158} y={50} />
      <Path pts={[[158, 50], [146, 50], [146, 196], [136, 196]]} />
      <Mos x={64} y={67} label="M5" type="p" flip />
      <Mos x={158} y={67} label="M6" type="p" flip />
      <Wire x1={48} y1={67} x2={38} y2={67} />
      <Term x={38} y={67} label="VBP1" anchor="end" lx={34} ly={70} />
      <Wire x1={142} y1={67} x2={132} y2={67} />
      <Term x={132} y={67} label="VBP1" anchor="end" lx={128} ly={70} />
      {/* VOUTP at the M5 drain junction, VOUTN at the M6 drain junction */}
      <Node x={64} y={84} />
      <Wire x1={64} y1={84} x2={36} y2={84} />
      <Term x={36} y={84} label="VOUTP" anchor="end" lx={32} ly={87} />
      <Node x={158} y={84} />
      <Wire x1={158} y1={84} x2={194} y2={84} />
      <Term x={194} y={84} label="VOUTN" lx={196} ly={87} />
      <Mos x={64} y={101} label="M7" />
      <Mos x={158} y={101} label="M8" />
      <Wire x1={48} y1={101} x2={38} y2={101} />
      <Term x={38} y={101} label="VBN1" anchor="end" lx={34} ly={104} />
      <Wire x1={142} y1={101} x2={132} y2={101} />
      <Term x={132} y={101} label="VBN1" anchor="end" lx={128} ly={104} />
      <Mos x={64} y={135} label="M9" />
      <Mos x={158} y={135} label="M10" />
      <Wire x1={48} y1={135} x2={38} y2={135} />
      <Term x={38} y={135} label="VBN2" anchor="end" lx={34} ly={138} />
      <Wire x1={142} y1={135} x2={132} y2={135} />
      <Term x={132} y={135} label="VBN2" anchor="end" lx={128} ly={138} />
      {/* sinks to the VSS rail (left one jogs clear of the input pair) */}
      <Path pts={[[64, 152], [64, 158], [40, 158], [40, 264]]} />
      <Wire x1={158} y1={152} x2={158} y2={264} />
      {/* input pair at the bottom center */}
      <Mos x={90} y={213} label="M1" lx={96} ly={207} />
      <Mos x={136} y={213} label="M2" />
      <Wire x1={74} y1={213} x2={58} y2={213} />
      <Term x={58} y={213} label="VINP" lx={44} ly={209} />
      <Wire x1={120} y1={213} x2={106} y2={213} />
      <Term x={106} y={213} label="VINN" lx={102} ly={225} />
      <Wire x1={90} y1={230} x2={136} y2={230} />
      <Node x={111} y={230} />
      <Mos x={111} y={247} label="M11" />
      <Wire x1={95} y1={247} x2={72} y2={247} />
      <Term x={72} y={247} label="VBN_TAIL" lx={44} ly={243} />
      <Rail y={264} x1={28} x2={194} label="VSS" lx={198} ly={267} />
      <Node x={40} y={264} />
      <Node x={158} y={264} />
      <Node x={111} y={264} />
    </>
  );
}

/* 16. GmC integrator transconductor core: the V1 generator instantiates the
 * same five devices and the same nets as the 5T OTA (M3 diode mirror load,
 * M4, M1/M2 pair, M5 tail), so it shares that schematic. */
function GmcIntegrator(): ReactNode {
  return FiveTota();
}

/* 17. Cascode PMOS current mirror: M1 diode and M2 mirror devices hang from
 * VDD, cascodes M3/M4 (VBC gate bus) drop to the IREF/IOUT terminals. */
function CascodePmosCurrentMirror(): ReactNode {
  return (
    <>
      <Rail y={30} x1={40} x2={182} label="VDD" lx={186} ly={33} />
      <Wire x1={84} y1={30} x2={84} y2={47} />
      <Wire x1={138} y1={30} x2={138} y2={47} />
      <Node x={84} y={30} />
      <Node x={138} y={30} />
      <Mos x={84} y={64} label="M1" type="p" flip />
      <Mos x={138} y={64} label="M2" type="p" flip />
      {/* NB node: M1 drain = M1 gate wrap = M2 gate bus */}
      <Node x={84} y={81} />
      <Path pts={[[84, 81], [68, 81], [68, 64]]} />
      <Path pts={[[84, 81], [122, 81], [122, 64]]} />
      <Wire x1={84} y1={81} x2={84} y2={107} />
      <Wire x1={138} y1={81} x2={138} y2={107} />
      <Net x={88} y={95} label="NB" />
      <Net x={142} y={95} label="NB2" />
      <Mos x={84} y={124} label="M3" type="p" flip />
      <Mos x={138} y={124} label="M4" type="p" flip />
      {/* VBC cascode gate bus */}
      <Wire x1={68} y1={124} x2={122} y2={124} />
      <Wire x1={68} y1={124} x2={46} y2={124} />
      <Term x={46} y={124} label="VBC" anchor="end" lx={42} ly={127} />
      <Wire x1={84} y1={141} x2={84} y2={172} />
      <Term x={84} y={172} label="IREF" anchor="end" lx={78} ly={175} />
      <Wire x1={138} y1={141} x2={138} y2={172} />
      <Term x={138} y={172} label="IOUT" lx={142} ly={175} />
    </>
  );
}

/* 18. Wilson current mirror: M1 diode sets node A, M2 mirrors it into node B,
 * and M3 (gate also on A) feeds back from B to the IOUT terminal. */
function WilsonCurrentMirror(): ReactNode {
  return (
    <>
      <Mos x={84} y={150} label="M1" />
      <Mos x={138} y={150} label="M2" />
      {/* A node: M1 drain = M1 gate wrap = gate bus to M2 and up to M3 */}
      <Node x={84} y={133} />
      <Path pts={[[84, 133], [60, 133], [60, 150]]} />
      <Path pts={[[84, 133], [122, 133], [122, 110]]} />
      <Wire x1={122} y1={110} x2={122} y2={150} />
      <Node x={122} y={133} />
      <Net x={88} y={128} label="A" />
      <Wire x1={84} y1={133} x2={84} y2={98} />
      <Term x={84} y={98} label="IREF" anchor="end" lx={78} ly={101} />
      {/* B node: M2 drain up to the M3 source */}
      <Mos x={138} y={110} label="M3" />
      <Wire x1={138} y1={127} x2={138} y2={133} />
      <Net x={144} y={131} label="B" />
      <Wire x1={138} y1={93} x2={138} y2={64} />
      <Term x={138} y={64} label="IOUT" lx={142} ly={67} />
      <Wire x1={84} y1={167} x2={84} y2={230} />
      <Wire x1={138} y1={167} x2={138} y2={230} />
      <Rail y={230} x1={40} x2={182} label="VSS" lx={186} ly={233} />
      <Node x={84} y={230} />
      <Node x={138} y={230} />
    </>
  );
}

/* 19. Regulated cascode mirror: cascodes M3/M4 over the M1/M2 mirror pair;
 * M5 senses the output branch node NB2 and drives the cascode gate NA. */
function RegulatedCascodeMirror(): ReactNode {
  return (
    <>
      <Mos x={108} y={90} label="M3" />
      <Mos x={180} y={90} label="M4" />
      {/* NA cascode gate bus, fed by the M5 drain returning over the top */}
      <Wire x1={92} y1={90} x2={168} y2={90} />
      <Node x={164} y={90} />
      <Path pts={[[270, 173], [270, 36], [168, 36], [168, 90]]} />
      <Net x={98} y={86} label="NA" />
      <Wire x1={108} y1={73} x2={108} y2={44} />
      <Term x={108} y={44} label="IREF" anchor="end" lx={102} ly={47} />
      <Wire x1={180} y1={73} x2={180} y2={44} />
      <Term x={180} y={44} label="IOUT" lx={184} ly={47} />
      {/* NB2: M4 source down to the M2 drain, tapped for the M5 gate */}
      <Wire x1={180} y1={107} x2={180} y2={173} />
      <Node x={180} y={130} />
      <Path pts={[[180, 130], [254, 130], [254, 190]]} />
      <Net x={186} y={126} label="NB2" />
      {/* NB mirror bases: M1 diode wrap, bus to M2 */}
      <Mos x={108} y={190} label="M1" />
      <Mos x={180} y={190} label="M2" />
      <Wire x1={108} y1={173} x2={108} y2={160} />
      <Path pts={[[92, 190], [92, 160], [164, 160]]} />
      <Wire x1={164} y1={160} x2={164} y2={190} />
      <Node x={92} y={160} />
      <Node x={108} y={160} />
      <Node x={164} y={160} />
      <Net x={98} y={156} label="NB" />
      {/* M5 regulating amplifier */}
      <Mos x={270} y={190} label="M5" />
      <Wire x1={270} y1={207} x2={270} y2={250} />
      <Wire x1={108} y1={207} x2={108} y2={250} />
      <Wire x1={180} y1={207} x2={180} y2={250} />
      <Rail y={250} x1={60} x2={300} label="VSS" lx={304} ly={253} />
      <Node x={108} y={250} />
      <Node x={180} y={250} />
      <Node x={270} y={250} />
    </>
  );
}

/* 20. Wide-swing cascode mirror: bias column M5/M6 generates NB and NBIAS
 * internally; M1/M3 reference and M2/M4 output branches stack above them. */
function WideSwingCascodeMirror(): ReactNode {
  return (
    <>
      {/* bias column */}
      <Mos x={118} y={190} label="M5" gateSide="r" />
      <Mos x={118} y={120} label="M6" gateSide="r" />
      <Path pts={[[118, 173], [134, 173], [134, 190]]} />
      <Path pts={[[134, 190], [134, 166], [246, 166], [246, 190]]} />
      <Wire x1={174} y1={166} x2={174} y2={190} />
      <Node x={134} y={166} />
      <Node x={174} y={166} />
      <Net x={140} y={162} label="NB" />
      {/* NB between M5 drain and M6 source */}
      <Wire x1={118} y1={137} x2={118} y2={173} />
      {/* NBIAS gate bus with external tap */}
      <Path pts={[[134, 120], [134, 113], [246, 113], [246, 120]]} />
      <Wire x1={174} y1={113} x2={174} y2={120} />
      <Node x={174} y={113} />
      <Wire x1={134} y1={113} x2={102} y2={113} />
      <Term x={102} y={113} label="NBIAS" anchor="end" lx={98} ly={116} />
      {/* reference branch */}
      <Mos x={190} y={120} label="M3" />
      <Mos x={190} y={190} label="M1" />
      <Wire x1={190} y1={137} x2={190} y2={173} />
      <Net x={194} y={155} label="NB2" />
      {/* output branch */}
      <Mos x={262} y={120} label="M4" />
      <Mos x={262} y={190} label="M2" />
      <Wire x1={262} y1={137} x2={262} y2={173} />
      <Net x={266} y={155} label="NB2R" />
      {/* IREF joins the M6 and M3 drains; IOUT at the M4 drain */}
      <Wire x1={118} y1={103} x2={118} y2={76} />
      <Wire x1={190} y1={103} x2={190} y2={76} />
      <Wire x1={118} y1={76} x2={190} y2={76} />
      <Node x={118} y={76} />
      <Node x={190} y={76} />
      <Wire x1={154} y1={76} x2={154} y2={60} />
      <Term x={154} y={60} label="IREF" anchor="middle" lx={154} ly={56} />
      <Wire x1={262} y1={103} x2={262} y2={60} />
      <Term x={262} y={60} label="IOUT" lx={266} ly={63} />
      {/* sinks */}
      <Wire x1={118} y1={207} x2={118} y2={250} />
      <Wire x1={190} y1={207} x2={190} y2={250} />
      <Wire x1={262} y1={207} x2={262} y2={250} />
      <Rail y={250} x1={80} x2={300} label="VSS" lx={304} ly={253} />
      <Node x={118} y={250} />
      <Node x={190} y={250} />
      <Node x={262} y={250} />
    </>
  );
}

/* 21. Dual-output NMOS mirror: M1 diode on IREF, M2 and M3 both mirror
 * the gate node to independent outputs. */
function DualOutputCurrentMirror(): ReactNode {
  return (
    <>
      <Mos x={66} y={150} label="M1" />
      <Mos x={122} y={150} label="M2" />
      <Mos x={178} y={150} label="M3" />
      {/* IREF gate node: M1 diode wrap, bus over the top to both gates */}
      <Node x={66} y={133} />
      <Path pts={[[66, 133], [50, 133], [50, 150]]} />
      <Path pts={[[50, 133], [50, 126], [106, 126], [106, 150]]} />
      <Node x={50} y={133} />
      <Path pts={[[50, 126], [50, 90], [162, 90], [162, 150]]} />
      <Node x={50} y={126} />
      <Wire x1={66} y1={133} x2={66} y2={98} />
      <Term x={66} y={98} label="IREF" anchor="end" lx={60} ly={101} />
      <Wire x1={122} y1={133} x2={122} y2={98} />
      <Term x={122} y={98} label="IOUT1" lx={126} ly={101} />
      <Wire x1={178} y1={133} x2={178} y2={98} />
      <Term x={178} y={98} label="IOUT2" lx={182} ly={101} />
      <Wire x1={66} y1={167} x2={66} y2={226} />
      <Wire x1={122} y1={167} x2={122} y2={226} />
      <Wire x1={178} y1={167} x2={178} y2={226} />
      <Rail y={226} x1={40} x2={200} label="VSS" lx={204} ly={229} />
      <Node x={66} y={226} />
      <Node x={122} y={226} />
      <Node x={178} y={226} />
    </>
  );
}

/* 22. Complementary mirror: NMOS pair M1/M2 and PMOS pair M3/M4 share the
 * single IREF diode node; outputs IOUTN (sink) and IOUTP (source). */
function ComplementaryCurrentMirror(): ReactNode {
  return (
    <>
      <Rail y={30} x1={40} x2={182} label="VDD" lx={186} ly={33} />
      <Wire x1={84} y1={30} x2={84} y2={47} />
      <Wire x1={138} y1={30} x2={138} y2={47} />
      <Node x={84} y={30} />
      <Node x={138} y={30} />
      <Mos x={84} y={64} label="M3" type="p" flip />
      <Mos x={138} y={64} label="M4" type="p" flip />
      {/* IREF trunk: M3 diode wrap and M1 diode wrap share the left rail */}
      <Wire x1={68} y1={64} x2={68} y2={133} />
      <Path pts={[[84, 81], [68, 81]]} />
      <Node x={68} y={81} />
      <Wire x1={68} y1={64} x2={122} y2={64} />
      <Node x={122} y={64} />
      <Wire x1={122} y1={64} x2={122} y2={150} />
      <Node x={68} y={90} />
      <Wire x1={68} y1={90} x2={40} y2={90} />
      <Term x={40} y={90} label="IREF" anchor="end" lx={36} ly={93} />
      <Wire x1={138} y1={81} x2={138} y2={104} />
      <Term x={138} y={104} label="IOUTP" lx={142} ly={107} />
      <Mos x={84} y={150} label="M1" />
      <Mos x={138} y={150} label="M2" />
      <Path pts={[[84, 133], [68, 133], [68, 150]]} />
      <Node x={68} y={133} />
      <Wire x1={138} y1={133} x2={168} y2={133} />
      <Term x={168} y={133} label="IOUTN" lx={172} ly={136} />
      <Wire x1={84} y1={167} x2={84} y2={226} />
      <Wire x1={138} y1={167} x2={138} y2={226} />
      <Rail y={226} x1={40} x2={182} label="VSS" lx={186} ly={229} />
      <Node x={84} y={226} />
      <Node x={138} y={226} />
    </>
  );
}

/* 23. NMOS cascode current source: externally biased M1/M2 stack sinking
 * current from the IOUT terminal into VSS. */
function CascodeCurrentSourceNmos(): ReactNode {
  return (
    <>
      <Mos x={111} y={90} label="M2" />
      <Wire x1={111} y1={73} x2={111} y2={48} />
      <Term x={111} y={48} label="IOUT" lx={115} ly={51} />
      <Wire x1={95} y1={90} x2={70} y2={90} />
      <Term x={70} y={90} label="VBN2" anchor="end" lx={66} ly={93} />
      <Wire x1={111} y1={107} x2={111} y2={153} />
      <Net x={115} y={130} label="NC" />
      <Mos x={111} y={170} label="M1" />
      <Wire x1={95} y1={170} x2={70} y2={170} />
      <Term x={70} y={170} label="VBN1" anchor="end" lx={66} ly={173} />
      <Wire x1={111} y1={187} x2={111} y2={226} />
      <Rail y={226} x1={60} x2={170} label="VSS" lx={174} ly={229} />
      <Node x={111} y={226} />
    </>
  );
}

/* 24. PMOS cascode current source: externally biased M1/M2 stack sourcing
 * current from VDD out of the IOUT terminal. */
function CascodeCurrentSourcePmos(): ReactNode {
  return (
    <>
      <Rail y={30} x1={60} x2={170} label="VDD" lx={174} ly={33} />
      <Wire x1={111} y1={30} x2={111} y2={47} />
      <Node x={111} y={30} />
      <Mos x={111} y={64} label="M1" type="p" flip />
      <Wire x1={95} y1={64} x2={70} y2={64} />
      <Term x={70} y={64} label="VBP1" anchor="end" lx={66} ly={67} />
      <Wire x1={111} y1={81} x2={111} y2={127} />
      <Net x={115} y={104} label="NC" />
      <Mos x={111} y={144} label="M2" type="p" flip />
      <Wire x1={95} y1={144} x2={70} y2={144} />
      <Term x={70} y={144} label="VBP2" anchor="end" lx={66} ly={147} />
      <Wire x1={111} y1={161} x2={111} y2={196} />
      <Term x={111} y={196} label="IOUT" lx={115} ly={199} />
    </>
  );
}

/* 25. Cascode bias generator stack: three series diode-connected NMOS
 * producing NB1/NB2/NB3 bias taps above the IREF input. */
function CascodeBiasStack(): ReactNode {
  return (
    <>
      <Mos x={111} y={70} label="M3" />
      <Wire x1={111} y1={53} x2={111} y2={34} />
      <Term x={111} y={34} label="IREF" lx={115} ly={37} />
      <Wire x1={95} y1={70} x2={64} y2={70} />
      <Term x={64} y={70} label="NB3" anchor="end" lx={60} ly={73} />
      <Wire x1={111} y1={87} x2={111} y2={127} />
      <Path pts={[[111, 127], [95, 127], [95, 144]]} />
      <Wire x1={95} y1={127} x2={64} y2={127} />
      <Term x={64} y={127} label="NB2" anchor="end" lx={60} ly={130} />
      <Mos x={111} y={144} label="M2" />
      <Mos x={111} y={214} label="M1" />
      <Wire x1={111} y1={161} x2={111} y2={197} />
      <Path pts={[[111, 197], [95, 197], [95, 214]]} />
      <Wire x1={95} y1={197} x2={64} y2={197} />
      <Term x={64} y={197} label="NB1" anchor="end" lx={60} ly={200} />
      <Wire x1={111} y1={231} x2={111} y2={252} />
      <Rail y={252} x1={60} x2={170} label="VSS" lx={174} ly={255} />
      <Node x={111} y={252} />
    </>
  );
}

/* 26. PMOS differential pair: pair hung from the VDD-side tail M3,
 * open drains (VOUTP/VOUTN) at the bottom. */
function PmosDifferentialPair(): ReactNode {
  return (
    <>
      <Rail y={30} x1={50} x2={180} label="VDD" lx={184} ly={33} />
      <Wire x1={111} y1={30} x2={111} y2={47} />
      <Node x={111} y={30} />
      <Mos x={111} y={64} label="M3" type="p" flip />
      <Wire x1={95} y1={64} x2={70} y2={64} />
      <Term x={70} y={64} label="VBP_TAIL" anchor="end" lx={66} ly={67} />
      <Mos x={74} y={120} label="M1" type="p" flip />
      <Mos x={148} y={120} label="M2" type="p" flip gateSide="r" />
      <Wire x1={74} y1={103} x2={148} y2={103} />
      <Node x={111} y={103} />
      <Wire x1={111} y1={103} x2={111} y2={81} />
      <Wire x1={58} y1={120} x2={38} y2={120} />
      <Term x={38} y={120} label="VIP" anchor="end" lx={34} ly={123} />
      <Wire x1={164} y1={120} x2={184} y2={120} />
      <Term x={184} y={120} label="VIN" lx={188} ly={123} />
      <Wire x1={74} y1={137} x2={74} y2={166} />
      <Term x={74} y={166} label="VOUTP" anchor="end" lx={68} ly={169} />
      <Wire x1={148} y1={137} x2={148} y2={166} />
      <Term x={148} y={166} label="VOUTN" lx={152} ly={169} />
    </>
  );
}

/* 27. Diff pair with PMOS current-source loads: 5T-style core but the
 * loads are gate-biased (VBP), leaving both diff outputs exposed. */
function PmosLoadDifferentialPair(): ReactNode {
  return (
    <>
      <Rail y={16} x1={40} x2={182} label="VDD" lx={186} ly={19} />
      <Wire x1={78} y1={16} x2={78} y2={27} />
      <Wire x1={140} y1={16} x2={140} y2={27} />
      <Node x={78} y={16} />
      <Node x={140} y={16} />
      <Mos x={78} y={44} label="M4" type="p" flip />
      <Mos x={140} y={44} label="M5" type="p" flip />
      {/* VBP load gate bus */}
      <Wire x1={62} y1={44} x2={124} y2={44} />
      <Node x={93} y={44} />
      <Wire x1={93} y1={44} x2={93} y2={32} />
      <Term x={93} y={32} label="VBP" anchor="middle" lx={93} ly={28} />
      <Wire x1={78} y1={61} x2={78} y2={103} />
      <Node x={78} y={82} />
      <Wire x1={78} y1={82} x2={50} y2={82} />
      <Term x={50} y={82} label="VOUTP" anchor="end" lx={46} ly={85} />
      <Wire x1={140} y1={61} x2={140} y2={103} />
      <Node x={140} y={82} />
      <Wire x1={140} y1={82} x2={168} y2={82} />
      <Term x={168} y={82} label="VOUTN" lx={172} ly={85} />
      <Mos x={78} y={120} label="M1" />
      <Mos x={140} y={120} label="M2" gateSide="r" />
      <Wire x1={62} y1={120} x2={42} y2={120} />
      <Term x={42} y={120} label="VINP" anchor="end" lx={38} ly={123} />
      <Wire x1={156} y1={120} x2={176} y2={120} />
      <Term x={176} y={120} label="VINN" lx={180} ly={123} />
      <Wire x1={78} y1={137} x2={140} y2={137} />
      <Node x={109} y={137} />
      <Wire x1={109} y1={137} x2={109} y2={157} />
      <Mos x={109} y={174} label="M3" />
      <Wire x1={93} y1={174} x2={68} y2={174} />
      <Term x={68} y={174} label="VBN_TAIL" anchor="end" lx={64} ly={177} />
      <Wire x1={109} y1={191} x2={109} y2={226} />
      <Rail y={226} x1={40} x2={182} label="VSS" lx={186} ly={229} />
      <Node x={109} y={226} />
    </>
  );
}

/* 28. Folded differential pair: NMOS pair folds up into NFOLD nodes that
 * the PMOS devices M4/M5 pull from VDD; outputs are the NFOLD nodes. */
function FoldedDifferentialPair(): ReactNode {
  return (
    <>
      <Rail y={16} x1={40} x2={182} label="VDD" lx={186} ly={19} />
      <Wire x1={78} y1={16} x2={78} y2={27} />
      <Wire x1={140} y1={16} x2={140} y2={27} />
      <Node x={78} y={16} />
      <Node x={140} y={16} />
      <Mos x={78} y={44} label="M4" type="p" flip />
      <Mos x={140} y={44} label="M5" type="p" flip />
      <Wire x1={62} y1={44} x2={124} y2={44} />
      <Node x={93} y={44} />
      <Wire x1={93} y1={44} x2={93} y2={32} />
      <Term x={93} y={32} label="VBP" anchor="middle" lx={93} ly={28} />
      <Wire x1={78} y1={61} x2={78} y2={103} />
      <Node x={78} y={82} />
      <Wire x1={78} y1={82} x2={50} y2={82} />
      <Term x={50} y={82} label="NFOLD1" anchor="end" lx={46} ly={85} />
      <Wire x1={140} y1={61} x2={140} y2={103} />
      <Node x={140} y={82} />
      <Wire x1={140} y1={82} x2={168} y2={82} />
      <Term x={168} y={82} label="NFOLD2" lx={172} ly={85} />
      <Mos x={78} y={120} label="M1" />
      <Mos x={140} y={120} label="M2" gateSide="r" />
      <Wire x1={62} y1={120} x2={42} y2={120} />
      <Term x={42} y={120} label="VINP" anchor="end" lx={38} ly={123} />
      <Wire x1={156} y1={120} x2={176} y2={120} />
      <Term x={176} y={120} label="VINN" lx={180} ly={123} />
      <Wire x1={78} y1={137} x2={140} y2={137} />
      <Node x={109} y={137} />
      <Wire x1={109} y1={137} x2={109} y2={157} />
      <Mos x={109} y={174} label="M3" />
      <Wire x1={93} y1={174} x2={68} y2={174} />
      <Term x={68} y={174} label="VBN_TAIL" anchor="end" lx={64} ly={177} />
      <Wire x1={109} y1={191} x2={109} y2={226} />
      <Rail y={226} x1={40} x2={182} label="VSS" lx={186} ly={229} />
      <Node x={109} y={226} />
    </>
  );
}

/* 29. Diff pair with cascoded tail: the TAIL node sits on M4 which stacks
 * on M3, both gate-biased (VBN2 over VBN1). */
function CascodeTailDifferentialPair(): ReactNode {
  return (
    <>
      <Mos x={80} y={110} label="M1" />
      <Mos x={142} y={110} label="M2" gateSide="r" />
      <Wire x1={64} y1={110} x2={44} y2={110} />
      <Term x={44} y={110} label="VIP" anchor="end" lx={40} ly={113} />
      <Wire x1={158} y1={110} x2={178} y2={110} />
      <Term x={178} y={110} label="VIN" lx={182} ly={113} />
      <Wire x1={80} y1={93} x2={80} y2={66} />
      <Term x={80} y={66} label="VOUTP" anchor="end" lx={74} ly={69} />
      <Wire x1={142} y1={93} x2={142} y2={66} />
      <Term x={142} y={66} label="VOUTN" lx={146} ly={69} />
      <Wire x1={80} y1={127} x2={142} y2={127} />
      <Node x={111} y={127} />
      <Wire x1={111} y1={127} x2={111} y2={143} />
      <Mos x={111} y={160} label="M4" />
      <Wire x1={95} y1={160} x2={72} y2={160} />
      <Term x={72} y={160} label="VBN2" anchor="end" lx={68} ly={163} />
      <Wire x1={111} y1={177} x2={111} y2={197} />
      <Net x={115} y={188} label="TAILN" />
      <Mos x={111} y={214} label="M3" />
      <Wire x1={95} y1={214} x2={72} y2={214} />
      <Term x={72} y={214} label="VBN1" anchor="end" lx={68} ly={217} />
      <Wire x1={111} y1={231} x2={111} y2={250} />
      <Rail y={250} x1={40} x2={182} label="VSS" lx={186} ly={253} />
      <Node x={111} y={250} />
    </>
  );
}

/* 30. Common-source with diode-connected PMOS load: M2 wraps drain-to-gate
 * on VOUT; gain is set by the gm/gmb ratio of the two devices. */
function DiodeLoadCommonSource(): ReactNode {
  return (
    <>
      <Rail y={30} x1={50} x2={176} label="VDD" lx={180} ly={33} />
      <Wire x1={111} y1={30} x2={111} y2={47} />
      <Node x={111} y={30} />
      <Mos x={111} y={64} label="M2" type="p" flip />
      <Path pts={[[111, 81], [111, 92], [95, 92], [95, 64]]} />
      <Wire x1={111} y1={81} x2={111} y2={133} />
      <Node x={111} y={107} />
      <Wire x1={111} y1={107} x2={142} y2={107} />
      <Term x={142} y={107} label="VOUT" lx={146} ly={110} />
      <Mos x={111} y={150} label="M1" />
      <Wire x1={95} y1={150} x2={72} y2={150} />
      <Term x={72} y={150} label="VIN" anchor="end" lx={68} ly={153} />
      <Wire x1={111} y1={167} x2={111} y2={226} />
      <Rail y={226} x1={50} x2={176} label="VSS" lx={180} ly={229} />
      <Node x={111} y={226} />
    </>
  );
}

/* 31. PMOS source follower: input PMOS M1 hangs from M2 (VBP bias) with
 * the output taken at the M1 source. */
function PmosSourceFollower(): ReactNode {
  return (
    <>
      <Rail y={30} x1={50} x2={176} label="VDD" lx={180} ly={33} />
      <Wire x1={111} y1={30} x2={111} y2={47} />
      <Node x={111} y={30} />
      <Mos x={111} y={64} label="M2" type="p" flip />
      <Wire x1={95} y1={64} x2={72} y2={64} />
      <Term x={72} y={64} label="VBP" anchor="end" lx={68} ly={67} />
      <Wire x1={111} y1={81} x2={111} y2={103} />
      <Node x={111} y={92} />
      <Wire x1={111} y1={92} x2={146} y2={92} />
      <Term x={146} y={92} label="VOUT" lx={150} ly={95} />
      <Mos x={111} y={120} label="M1" type="p" flip />
      <Wire x1={95} y1={120} x2={72} y2={120} />
      <Term x={72} y={120} label="VIN" anchor="end" lx={68} ly={123} />
      <Wire x1={111} y1={137} x2={111} y2={190} />
      <Rail y={190} x1={50} x2={176} label="VSS" lx={180} ly={193} />
      <Node x={111} y={190} />
    </>
  );
}

/* 32. Super source follower: NMOS M1 buffers VIN into VA; M3 sinks the
 * bias current and M2/M4 form the output stage driven from VA. */
function SuperSourceFollower(): ReactNode {
  return (
    <>
      <Rail y={16} x1={50} x2={300} label="VDD" lx={304} ly={19} />
      <Wire x1={100} y1={16} x2={100} y2={53} />
      <Wire x1={220} y1={16} x2={220} y2={47} />
      <Node x={100} y={16} />
      <Node x={220} y={16} />
      <Mos x={100} y={70} label="M1" />
      <Wire x1={84} y1={70} x2={60} y2={70} />
      <Term x={60} y={70} label="VIN" anchor="end" lx={56} ly={73} />
      <Wire x1={100} y1={87} x2={100} y2={133} />
      <Node x={100} y={110} />
      <Net x={104} y={110} label="VA" />
      <Mos x={100} y={150} label="M3" />
      <Wire x1={84} y1={150} x2={60} y2={150} />
      <Term x={60} y={150} label="VBN" anchor="end" lx={56} ly={153} />
      {/* VA drives the M2 gate */}
      <Path pts={[[100, 110], [176, 110], [176, 150], [204, 150]]} />
      <Mos x={220} y={64} label="M4" type="p" flip />
      <Wire x1={204} y1={64} x2={178} y2={64} />
      <Term x={178} y={64} label="VBP" anchor="end" lx={174} ly={67} />
      <Mos x={220} y={150} label="M2" />
      <Wire x1={220} y1={81} x2={220} y2={133} />
      <Node x={220} y={107} />
      <Wire x1={220} y1={107} x2={252} y2={107} />
      <Term x={252} y={107} label="VOUT" lx={256} ly={110} />
      <Wire x1={100} y1={167} x2={100} y2={226} />
      <Wire x1={220} y1={167} x2={220} y2={226} />
      <Rail y={226} x1={50} x2={300} label="VSS" lx={304} ly={229} />
      <Node x={100} y={226} />
      <Node x={220} y={226} />
    </>
  );
}

/* 33. Complementary source follower: NMOS M1 and PMOS M2 both driven by
 * VIN with their sources tied at VOUT (push-pull buffer). */
function ComplementarySourceFollower(): ReactNode {
  return (
    <>
      <Rail y={30} x1={50} x2={176} label="VDD" lx={180} ly={33} />
      <Wire x1={111} y1={30} x2={111} y2={63} />
      <Node x={111} y={30} />
      <Mos x={111} y={80} label="M1" />
      <Wire x1={111} y1={97} x2={111} y2={163} />
      <Node x={111} y={130} />
      <Wire x1={111} y1={130} x2={146} y2={130} />
      <Term x={146} y={130} label="VOUT" lx={150} ly={133} />
      <Mos x={111} y={180} label="M2" type="p" flip />
      <Wire x1={111} y1={197} x2={111} y2={226} />
      <Rail y={226} x1={50} x2={176} label="VSS" lx={180} ly={229} />
      <Node x={111} y={226} />
      {/* shared VIN gate rail */}
      <Wire x1={95} y1={80} x2={95} y2={180} />
      <Node x={95} y={130} />
      <Wire x1={95} y1={130} x2={64} y2={130} />
      <Term x={64} y={130} label="VIN" anchor="end" lx={60} ly={133} />
    </>
  );
}

/* 34. PMOS-input cascode amplifier: input M1 and cascode M2 stack from VDD
 * (PCAS internal node), NMOS M3 sinks the VOUT node. */
function PmosCascodeAmplifier(): ReactNode {
  return (
    <>
      <Rail y={30} x1={50} x2={176} label="VDD" lx={180} ly={33} />
      <Wire x1={111} y1={30} x2={111} y2={47} />
      <Node x={111} y={30} />
      <Mos x={111} y={64} label="M1" type="p" flip />
      <Wire x1={95} y1={64} x2={72} y2={64} />
      <Term x={72} y={64} label="VIN" anchor="end" lx={68} ly={67} />
      <Wire x1={111} y1={81} x2={111} y2={127} />
      <Net x={115} y={104} label="PCAS" />
      <Mos x={111} y={144} label="M2" type="p" flip />
      <Wire x1={95} y1={144} x2={64} y2={144} />
      <Term x={64} y={144} label="VBP_CAS" anchor="end" lx={60} ly={147} />
      <Wire x1={111} y1={161} x2={111} y2={193} />
      <Node x={111} y={177} />
      <Wire x1={111} y1={177} x2={146} y2={177} />
      <Term x={146} y={177} label="VOUT" lx={150} ly={180} />
      <Mos x={111} y={210} label="M3" />
      <Wire x1={95} y1={210} x2={76} y2={210} />
      <Term x={76} y={210} label="VBN" anchor="end" lx={72} ly={213} />
      <Wire x1={111} y1={227} x2={111} y2={252} />
      <Rail y={252} x1={50} x2={176} label="VSS" lx={180} ly={255} />
      <Node x={111} y={252} />
    </>
  );
}

/* 35. Folded cascode amplifier (NMOS input): M1 and the VBP2 current source
 * M3 meet at NFOLD; the PMOS cascode M2 folds up to VOUT over the M4 sink. */
function FoldedCascodeAmplifier(): ReactNode {
  return (
    <>
      <Rail y={16} x1={50} x2={300} label="VDD" lx={304} ly={19} />
      <Wire x1={100} y1={16} x2={100} y2={47} />
      <Node x={100} y={16} />
      <Mos x={100} y={64} label="M3" type="p" flip />
      <Wire x1={84} y1={64} x2={60} y2={64} />
      <Term x={60} y={64} label="VBP2" anchor="end" lx={56} ly={67} />
      <Mos x={100} y={190} label="M1" />
      <Wire x1={84} y1={190} x2={60} y2={190} />
      <Term x={60} y={190} label="VIN" anchor="end" lx={56} ly={193} />
      <Wire x1={100} y1={81} x2={100} y2={173} />
      <Node x={100} y={127} />
      <Net x={104} y={123} label="NFOLD" />
      <Path pts={[[100, 127], [176, 127], [176, 93], [200, 93]]} />
      <Mos x={200} y={110} label="M2" type="p" flip />
      <Wire x1={184} y1={110} x2={160} y2={110} />
      <Term x={160} y={110} label="VBP" anchor="end" lx={156} ly={113} />
      <Mos x={200} y={190} label="M4" />
      <Wire x1={184} y1={190} x2={166} y2={190} />
      <Term x={166} y={190} label="VBN" anchor="end" lx={162} ly={193} />
      <Wire x1={200} y1={127} x2={200} y2={173} />
      <Node x={200} y={150} />
      <Wire x1={200} y1={150} x2={232} y2={150} />
      <Term x={232} y={150} label="VOUT" lx={236} ly={153} />
      <Wire x1={100} y1={207} x2={100} y2={240} />
      <Wire x1={200} y1={207} x2={200} y2={240} />
      <Rail y={240} x1={50} x2={300} label="VSS" lx={304} ly={243} />
      <Node x={100} y={240} />
      <Node x={200} y={240} />
    </>
  );
}

/* 36. PMOS-input folded cascode amplifier: input M1 folds down into PFOLD
 * with the VBN2 sink M3; NMOS cascode M2 drives VOUT against the M4 load. */
function PmosFoldedCascodeAmplifier(): ReactNode {
  return (
    <>
      <Rail y={16} x1={50} x2={300} label="VDD" lx={304} ly={19} />
      <Wire x1={100} y1={16} x2={100} y2={63} />
      <Wire x1={200} y1={16} x2={200} y2={47} />
      <Node x={100} y={16} />
      <Node x={200} y={16} />
      <Mos x={100} y={80} label="M1" type="p" flip />
      <Wire x1={84} y1={80} x2={60} y2={80} />
      <Term x={60} y={80} label="VIN" anchor="end" lx={56} ly={83} />
      <Mos x={100} y={190} label="M3" />
      <Wire x1={84} y1={190} x2={58} y2={190} />
      <Term x={58} y={190} label="VBN2" anchor="end" lx={54} ly={193} />
      <Wire x1={100} y1={97} x2={100} y2={173} />
      <Node x={100} y={135} />
      <Net x={104} y={131} label="PFOLD" />
      <Path pts={[[100, 135], [176, 135], [176, 157], [200, 157]]} />
      <Mos x={200} y={140} label="M2" />
      <Wire x1={184} y1={140} x2={166} y2={140} />
      <Term x={166} y={140} label="VBN" anchor="end" lx={162} ly={143} />
      <Mos x={200} y={64} label="M4" type="p" flip />
      <Wire x1={184} y1={64} x2={166} y2={64} />
      <Term x={166} y={64} label="VBP" anchor="end" lx={162} ly={67} />
      <Wire x1={200} y1={81} x2={200} y2={123} />
      <Node x={200} y={102} />
      <Wire x1={200} y1={102} x2={232} y2={102} />
      <Term x={232} y={102} label="VOUT" lx={236} ly={105} />
      <Wire x1={100} y1={207} x2={100} y2={240} />
      <Rail y={240} x1={50} x2={300} label="VSS" lx={304} ly={243} />
      <Node x={100} y={240} />
    </>
  );
}

/* 37. Common-gate amplifier (NMOS): the signal enters the M1 source,
 * VBN holds the gate, PMOS M2 loads the shared VOUT drain. */
function CommonGateNmos(): ReactNode {
  return (
    <>
      <Rail y={30} x1={50} x2={176} label="VDD" lx={180} ly={33} />
      <Wire x1={111} y1={30} x2={111} y2={47} />
      <Node x={111} y={30} />
      <Mos x={111} y={64} label="M2" type="p" flip />
      <Wire x1={95} y1={64} x2={72} y2={64} />
      <Term x={72} y={64} label="VBP" anchor="end" lx={68} ly={67} />
      <Wire x1={111} y1={81} x2={111} y2={133} />
      <Node x={111} y={107} />
      <Wire x1={111} y1={107} x2={142} y2={107} />
      <Term x={142} y={107} label="VOUT" lx={146} ly={110} />
      <Mos x={111} y={150} label="M1" />
      <Wire x1={95} y1={150} x2={72} y2={150} />
      <Term x={72} y={150} label="VBN" anchor="end" lx={68} ly={153} />
      <Wire x1={111} y1={167} x2={111} y2={196} />
      <Term x={111} y={196} label="VIN" lx={115} ly={199} />
    </>
  );
}

/* 38. Common-gate amplifier (PMOS): signal into the M1 source, NMOS M2
 * sinks the shared VOUT drain. */
function CommonGatePmos(): ReactNode {
  return (
    <>
      <Mos x={111} y={84} label="M1" type="p" flip />
      <Wire x1={111} y1={67} x2={111} y2={44} />
      <Term x={111} y={44} label="VIN" lx={115} ly={47} />
      <Wire x1={95} y1={84} x2={72} y2={84} />
      <Term x={72} y={84} label="VBP" anchor="end" lx={68} ly={87} />
      <Wire x1={111} y1={101} x2={111} y2={153} />
      <Node x={111} y={127} />
      <Wire x1={111} y1={127} x2={142} y2={127} />
      <Term x={142} y={127} label="VOUT" lx={146} ly={130} />
      <Mos x={111} y={170} label="M2" />
      <Wire x1={95} y1={170} x2={72} y2={170} />
      <Term x={72} y={170} label="VBN" anchor="end" lx={68} ly={173} />
      <Wire x1={111} y1={187} x2={111} y2={226} />
      <Rail y={226} x1={50} x2={176} label="VSS" lx={180} ly={229} />
      <Node x={111} y={226} />
    </>
  );
}

/* 39. CMOS inverter amplifier: NMOS M1 and PMOS M2 share VIN and VOUT. */
function InverterAmplifier(): ReactNode {
  return (
    <>
      <Rail y={30} x1={50} x2={176} label="VDD" lx={180} ly={33} />
      <Wire x1={111} y1={30} x2={111} y2={47} />
      <Node x={111} y={30} />
      <Mos x={111} y={64} label="M2" type="p" flip />
      <Mos x={111} y={150} label="M1" />
      <Wire x1={111} y1={81} x2={111} y2={133} />
      <Node x={111} y={107} />
      <Wire x1={111} y1={107} x2={146} y2={107} />
      <Term x={146} y={107} label="VOUT" lx={150} ly={110} />
      <Wire x1={95} y1={64} x2={95} y2={150} />
      <Node x={95} y={107} />
      <Wire x1={95} y1={107} x2={64} y2={107} />
      <Term x={64} y={107} label="VIN" anchor="end" lx={60} ly={110} />
      <Wire x1={111} y1={167} x2={111} y2={226} />
      <Rail y={226} x1={50} x2={176} label="VSS" lx={180} ly={229} />
      <Node x={111} y={226} />
    </>
  );
}

/* 40. Transimpedance common-gate stage: current in at the M1 source (IIN),
 * diode-connected PMOS M2 sets the transimpedance at VOUT. */
function TiaCommonGate(): ReactNode {
  return (
    <>
      <Rail y={30} x1={50} x2={176} label="VDD" lx={180} ly={33} />
      <Wire x1={111} y1={30} x2={111} y2={47} />
      <Node x={111} y={30} />
      <Mos x={111} y={64} label="M2" type="p" flip />
      <Path pts={[[111, 81], [111, 92], [95, 92], [95, 64]]} />
      <Wire x1={111} y1={81} x2={111} y2={133} />
      <Node x={111} y={107} />
      <Wire x1={111} y1={107} x2={142} y2={107} />
      <Term x={142} y={107} label="VOUT" lx={146} ly={110} />
      <Mos x={111} y={150} label="M1" />
      <Wire x1={95} y1={150} x2={72} y2={150} />
      <Term x={72} y={150} label="VBN" anchor="end" lx={68} ly={153} />
      <Wire x1={111} y1={167} x2={111} y2={196} />
      <Term x={111} y={196} label="IIN" lx={115} ly={199} />
    </>
  );
}

/* 41. Class-AB output stage: bias diodes M3 (NB) and M4 (NP) drive the
 * push-pull output devices M1 (NMOS) and M2 (PMOS) at VOUT. */
function ClassAbOutputStage(): ReactNode {
  return (
    <>
      <Rail y={30} x1={40} x2={182} label="VDD" lx={186} ly={33} />
      <Wire x1={74} y1={30} x2={74} y2={47} />
      <Wire x1={138} y1={30} x2={138} y2={47} />
      <Node x={74} y={30} />
      <Node x={138} y={30} />
      <Mos x={74} y={64} label="M4" type="p" flip />
      <Path pts={[[74, 81], [74, 92], [58, 92], [58, 64]]} />
      <Net x={62} y={100} label="NP" />
      <Mos x={138} y={64} label="M2" type="p" flip />
      <Wire x1={58} y1={64} x2={122} y2={64} />
      <Node x={58} y={64} />
      <Mos x={74} y={170} label="M3" gateSide="r" />
      <Path pts={[[74, 153], [90, 153], [90, 170]]} />
      <Net x={78} y={148} label="NB" />
      <Mos x={138} y={170} label="M1" />
      <Wire x1={90} y1={170} x2={122} y2={170} />
      <Node x={90} y={170} />
      <Wire x1={138} y1={81} x2={138} y2={153} />
      <Node x={138} y={117} />
      <Wire x1={138} y1={117} x2={170} y2={117} />
      <Term x={170} y={117} label="VOUT" lx={174} ly={120} />
      <Wire x1={74} y1={187} x2={74} y2={226} />
      <Wire x1={138} y1={187} x2={138} y2={226} />
      <Rail y={226} x1={40} x2={182} label="VSS" lx={186} ly={229} />
      <Node x={74} y={226} />
      <Node x={138} y={226} />
    </>
  );
}

/* 42. CMOS comparator: 5T first stage, then a CMOS inverter second stage -
 * both M6 (NMOS) and M7 (PMOS) gates are driven by VOUT1. */
function CmosComparator(): ReactNode {
  return (
    <>
      <Rail y={16} x1={60} x2={300} label="VDD" lx={304} ly={19} />
      <Wire x1={84} y1={16} x2={84} y2={27} />
      <Wire x1={148} y1={16} x2={148} y2={27} />
      <Wire x1={260} y1={16} x2={260} y2={53} />
      <Node x={84} y={16} />
      <Node x={148} y={16} />
      <Node x={260} y={16} />
      <Mos x={84} y={44} label="M3" type="p" flip />
      <Mos x={148} y={44} label="M4" type="p" flip />
      <Path pts={[[84, 61], [68, 61], [68, 44]]} />
      <Path pts={[[68, 44], [68, 33], [132, 33], [132, 44]]} />
      <Node x={84} y={61} />
      <Net x={54} y={72} label="MIRROR" />
      <Wire x1={84} y1={61} x2={84} y2={107} />
      <Wire x1={148} y1={61} x2={148} y2={107} />
      <Node x={148} y={84} />
      <Net x={152} y={80} label="VOUT1" />
      <Mos x={84} y={124} label="M1" />
      <Mos x={148} y={124} label="M2" gateSide="r" />
      <Wire x1={68} y1={124} x2={44} y2={124} />
      <Term x={44} y={124} label="VINP" anchor="end" lx={40} ly={127} />
      <Wire x1={164} y1={124} x2={186} y2={124} />
      <Term x={186} y={124} label="VINN" lx={190} ly={127} />
      <Wire x1={84} y1={141} x2={148} y2={141} />
      <Node x={116} y={141} />
      <Wire x1={116} y1={141} x2={116} y2={191} />
      <Mos x={116} y={208} label="M5" />
      <Wire x1={100} y1={208} x2={80} y2={208} />
      <Term x={80} y={208} label="VBN_TAIL" anchor="end" lx={76} ly={211} />
      <Wire x1={116} y1={225} x2={116} y2={270} />
      {/* inverter second stage: both gates on VOUT1 */}
      <Mos x={260} y={70} label="M7" type="p" flip />
      <Path pts={[[148, 84], [216, 84], [216, 70], [244, 70]]} />
      <Mos x={260} y={190} label="M6" />
      <Path pts={[[148, 84], [200, 84], [200, 190], [244, 190]]} />
      <Node x={200} y={84} />
      <Node x={216} y={84} />
      <Wire x1={260} y1={87} x2={260} y2={173} />
      <Node x={260} y={130} />
      <Wire x1={260} y1={130} x2={284} y2={130} />
      <Term x={284} y={130} label="VOUT" lx={288} ly={133} />
      <Wire x1={260} y1={207} x2={260} y2={270} />
      <Rail y={270} x1={60} x2={300} label="VSS" lx={304} ly={273} />
      <Node x={116} y={270} />
      <Node x={260} y={270} />
    </>
  );
}

/* 43. Two-stage comparator: 5T first stage, second stage NMOS M6 with a
 * gate-biased (VBP) PMOS load M7 instead of the inverter connection. */
function TwoStageComparator(): ReactNode {
  return (
    <>
      <Rail y={16} x1={60} x2={300} label="VDD" lx={304} ly={19} />
      <Wire x1={84} y1={16} x2={84} y2={27} />
      <Wire x1={148} y1={16} x2={148} y2={27} />
      <Wire x1={260} y1={16} x2={260} y2={53} />
      <Node x={84} y={16} />
      <Node x={148} y={16} />
      <Node x={260} y={16} />
      <Mos x={84} y={44} label="M3" type="p" flip />
      <Mos x={148} y={44} label="M4" type="p" flip />
      <Path pts={[[84, 61], [68, 61], [68, 44]]} />
      <Path pts={[[68, 44], [68, 33], [132, 33], [132, 44]]} />
      <Node x={84} y={61} />
      <Net x={54} y={72} label="MIRROR" />
      <Wire x1={84} y1={61} x2={84} y2={107} />
      <Wire x1={148} y1={61} x2={148} y2={107} />
      <Node x={148} y={84} />
      <Net x={152} y={80} label="VOUT1" />
      <Mos x={84} y={124} label="M1" />
      <Mos x={148} y={124} label="M2" gateSide="r" />
      <Wire x1={68} y1={124} x2={44} y2={124} />
      <Term x={44} y={124} label="VINP" anchor="end" lx={40} ly={127} />
      <Wire x1={164} y1={124} x2={186} y2={124} />
      <Term x={186} y={124} label="VINN" lx={190} ly={127} />
      <Wire x1={84} y1={141} x2={148} y2={141} />
      <Node x={116} y={141} />
      <Wire x1={116} y1={141} x2={116} y2={191} />
      <Mos x={116} y={208} label="M5" />
      <Wire x1={100} y1={208} x2={80} y2={208} />
      <Term x={80} y={208} label="VBN_TAIL" anchor="end" lx={76} ly={211} />
      <Wire x1={116} y1={225} x2={116} y2={270} />
      {/* second stage with VBP-biased load */}
      <Mos x={260} y={70} label="M7" type="p" flip />
      <Wire x1={244} y1={70} x2={224} y2={70} />
      <Term x={224} y={70} label="VBP" anchor="end" lx={220} ly={73} />
      <Mos x={260} y={190} label="M6" />
      <Path pts={[[148, 84], [212, 84], [212, 190], [244, 190]]} />
      <Wire x1={260} y1={87} x2={260} y2={173} />
      <Node x={260} y={130} />
      <Wire x1={260} y1={130} x2={284} y2={130} />
      <Term x={284} y={130} label="VOUT" lx={288} ly={133} />
      <Wire x1={260} y1={207} x2={260} y2={270} />
      <Rail y={270} x1={60} x2={300} label="VSS" lx={304} ly={273} />
      <Node x={116} y={270} />
      <Node x={260} y={270} />
    </>
  );
}

/* 44. StrongARM latch comparator: clocked tail M5, input pair M1/M2,
 * precharge PMOS M6/M7 (CLK gates), and the cross-coupled NMOS pair
 * M3/M4 regenerating on ND1/ND2. */
function StrongarmComparator(): ReactNode {
  return (
    <>
      <Rail y={16} x1={50} x2={300} label="VDD" lx={304} ly={19} />
      <Wire x1={160} y1={16} x2={160} y2={33} />
      <Wire x1={240} y1={16} x2={240} y2={33} />
      <Node x={160} y={16} />
      <Node x={240} y={16} />
      {/* precharge devices with CLK gate bus */}
      <Mos x={160} y={50} label="M6" type="p" flip />
      <Mos x={240} y={50} label="M7" type="p" flip />
      <Wire x1={144} y1={50} x2={224} y2={50} />
      <Node x={184} y={50} />
      <Wire x1={184} y1={50} x2={184} y2={38} />
      <Term x={184} y={38} label="CLK" anchor="middle" lx={184} ly={34} />
      {/* CLK also drives the tail via the left edge */}
      <Path pts={[[144, 50], [84, 50], [84, 204], [184, 204], [184, 214]]} />
      {/* ND1: M6 drain, M1 drain, M3 drain, and the M4 gate (top route);
       * the ND1/ND2 routes cross once at (264,95) - cross-coupled nets,
       * no junction dot means no connection. */}
      <Wire x1={160} y1={67} x2={160} y2={123} />
      <Node x={160} y={95} />
      <Path pts={[[160, 95], [120, 95], [120, 173]]} />
      <Node x={120} y={95} />
      <Net x={124} y={91} label="ND1" />
      <Path pts={[[160, 67], [160, 60], [264, 60], [264, 190]]} />
      <Node x={160} y={60} />
      {/* ND2: M7 drain, M2 drain, M4 drain, M3 gate (over the top) */}
      <Path pts={[[240, 67], [240, 54], [104, 54], [104, 190]]} />
      <Node x={240} y={67} />
      <Wire x1={240} y1={67} x2={240} y2={123} />
      <Node x={240} y={95} />
      <Path pts={[[240, 95], [280, 95], [280, 173]]} />
      <Net x={284} y={91} label="ND2" />
      {/* cross-coupled pair */}
      <Mos x={120} y={190} label="M3" />
      <Mos x={280} y={190} label="M4" />
      {/* input pair */}
      <Mos x={160} y={140} label="M1" />
      <Mos x={240} y={140} label="M2" />
      <Wire x1={144} y1={140} x2={126} y2={140} />
      <Term x={126} y={140} label="VINP" anchor="end" lx={118} ly={143} />
      <Path pts={[[224, 140], [216, 140], [216, 128], [232, 128]]} />
      <Term x={232} y={128} label="VINN" lx={236} ly={131} />
      {/* tail into the clocked M5 */}
      <Wire x1={160} y1={157} x2={240} y2={157} />
      <Node x={200} y={157} />
      <Net x={206} y={153} label="TAIL" />
      <Wire x1={200} y1={157} x2={200} y2={197} />
      <Mos x={200} y={214} label="M5" />
      <Wire x1={200} y1={231} x2={200} y2={250} />
      <Wire x1={120} y1={207} x2={120} y2={250} />
      <Wire x1={280} y1={207} x2={280} y2={250} />
      <Rail y={250} x1={50} x2={300} label="VSS" lx={304} ly={253} />
      <Node x={120} y={250} />
      <Node x={200} y={250} />
      <Node x={280} y={250} />
    </>
  );
}

export const diagramKeys: string[] = [
  '5t-ota', 'telescopic-ota', 'folded-cascode-ota', 'simple-current-mirror',
  'cascode-current-mirror', 'pmos-current-mirror', 'differential-pair-nmos',
  'common-source', 'source-follower', 'cascode-amplifier',
  'two-stage-miller-ota', 'symmetrical-ota', 'three-stage-ota',
  'current-mirror-ota', 'fully-diff-folded-cascode-ota', 'gmc-integrator',
  'cascode-pmos-current-mirror', 'wilson-current-mirror',
  'regulated-cascode-mirror', 'wide-swing-cascode-mirror',
  'dual-output-current-mirror', 'complementary-current-mirror',
  'cascode-current-source-nmos', 'cascode-current-source-pmos',
  'cascode-bias-stack', 'pmos-differential-pair',
  'pmos-load-differential-pair', 'folded-differential-pair',
  'cascode-tail-differential-pair', 'diode-load-common-source',
  'pmos-source-follower', 'super-source-follower',
  'complementary-source-follower', 'pmos-cascode-amplifier',
  'folded-cascode-amplifier', 'pmos-folded-cascode-amplifier',
  'common-gate-nmos', 'common-gate-pmos', 'inverter-amplifier',
  'tia-common-gate', 'class-ab-output-stage', 'cmos-comparator',
  'two-stage-comparator', 'strongarm-comparator',
];

const diagrams: Record<string, ReactNode> = {
  '5t-ota': <FiveTota />,
  'telescopic-ota': <TelescopicOta />,
  'folded-cascode-ota': <FoldedCascodeOta />,
  'simple-current-mirror': <SimpleCurrentMirror />,
  'cascode-current-mirror': <CascodeCurrentMirror />,
  'pmos-current-mirror': <PmosCurrentMirror />,
  'differential-pair-nmos': <DifferentialPairNmos />,
  'common-source': <CommonSource />,
  'source-follower': <SourceFollower />,
  'cascode-amplifier': <CascodeAmplifier />,
  'two-stage-miller-ota': <TwoStageMillerOta />,
  'symmetrical-ota': <SymmetricalOta />,
  'three-stage-ota': <ThreeStageOta />,
  'current-mirror-ota': <CurrentMirrorOta />,
  'fully-diff-folded-cascode-ota': <FullyDiffFoldedCascodeOta />,
  'gmc-integrator': <GmcIntegrator />,
  'cascode-pmos-current-mirror': <CascodePmosCurrentMirror />,
  'wilson-current-mirror': <WilsonCurrentMirror />,
  'regulated-cascode-mirror': <RegulatedCascodeMirror />,
  'wide-swing-cascode-mirror': <WideSwingCascodeMirror />,
  'dual-output-current-mirror': <DualOutputCurrentMirror />,
  'complementary-current-mirror': <ComplementaryCurrentMirror />,
  'cascode-current-source-nmos': <CascodeCurrentSourceNmos />,
  'cascode-current-source-pmos': <CascodeCurrentSourcePmos />,
  'cascode-bias-stack': <CascodeBiasStack />,
  'pmos-differential-pair': <PmosDifferentialPair />,
  'pmos-load-differential-pair': <PmosLoadDifferentialPair />,
  'folded-differential-pair': <FoldedDifferentialPair />,
  'cascode-tail-differential-pair': <CascodeTailDifferentialPair />,
  'diode-load-common-source': <DiodeLoadCommonSource />,
  'pmos-source-follower': <PmosSourceFollower />,
  'super-source-follower': <SuperSourceFollower />,
  'complementary-source-follower': <ComplementarySourceFollower />,
  'pmos-cascode-amplifier': <PmosCascodeAmplifier />,
  'folded-cascode-amplifier': <FoldedCascodeAmplifier />,
  'pmos-folded-cascode-amplifier': <PmosFoldedCascodeAmplifier />,
  'common-gate-nmos': <CommonGateNmos />,
  'common-gate-pmos': <CommonGatePmos />,
  'inverter-amplifier': <InverterAmplifier />,
  'tia-common-gate': <TiaCommonGate />,
  'class-ab-output-stage': <ClassAbOutputStage />,
  'cmos-comparator': <CmosComparator />,
  'two-stage-comparator': <TwoStageComparator />,
  'strongarm-comparator': <StrongarmComparator />,
};

/** Topologies that need the wider 320×286 viewBox (multi-column layouts). */
const wideDiagrams = new Set([
  'symmetrical-ota', 'three-stage-ota', 'fully-diff-folded-cascode-ota',
  'regulated-cascode-mirror', 'wide-swing-cascode-mirror',
  'complementary-current-mirror', 'cascode-bias-stack',
  'folded-differential-pair', 'cascode-tail-differential-pair',
  'super-source-follower', 'tia-common-gate', 'class-ab-output-stage',
]);

export function hasDiagram(key: string): boolean {
  return diagramKeys.includes(key);
}

export function TopologyDiagram({ diagram, className = '' }: { diagram: string; className?: string }) {
  const isWide = wideDiagrams.has(diagram);
  const vb = isWide ? '0 0 320 286' : '0 0 222 286';
  const fallbackX = isWide ? 160 : 111;
  const body: ReactNode = hasDiagram(diagram) ? (
    diagrams[diagram]
  ) : (
    <g>
      <text x={fallbackX} y="136" textAnchor="middle" className="netLabel">
        DIAGRAM UNAVAILABLE
      </text>
      <text x={fallbackX} y="150" textAnchor="middle" className="netLabel">
        {diagram}
      </text>
    </g>
  );
  return (
    <div className={`diagram ${className}`}>
      <svg viewBox={vb} role="img" aria-label={`Topology schematic: ${diagram}`}>
        {body}
      </svg>
    </div>
  );
}
