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

export const diagramKeys: string[] = [
  '5t-ota',
  'telescopic-ota',
  'folded-cascode-ota',
  'simple-current-mirror',
  'cascode-current-mirror',
  'pmos-current-mirror',
  'differential-pair-nmos',
  'common-source',
  'source-follower',
  'cascode-amplifier',
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
};

export function hasDiagram(key: string): boolean {
  return diagramKeys.includes(key);
}

export function TopologyDiagram({ diagram }: { diagram: string }) {
  const body: ReactNode = hasDiagram(diagram) ? (
    diagrams[diagram]
  ) : (
    <g>
      <text x="111" y="136" textAnchor="middle" className="netLabel">
        DIAGRAM UNAVAILABLE
      </text>
      <text x="111" y="150" textAnchor="middle" className="netLabel">
        {diagram}
      </text>
    </g>
  );
  return (
    <div className="diagram">
      <svg viewBox="0 0 222 286" role="img" aria-label={`Topology schematic: ${diagram}`}>
        {body}
      </svg>
    </div>
  );
}
