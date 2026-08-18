from pathlib import Path
import re
import sys

ROOT = Path("canonical")
NUM = re.compile(r'^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?[munpfkMG]?$')


def block_end(text, start):
    nxt = text.find("\nprocedure(", start + 1)
    return len(text) if nxt < 0 else nxt


def wire_width(text, block, prefix):
    patterns = [
        r'\w+\s*=\s*schCreateWire\(cv\s+"route"\s+"full"\s+list\(plus\s+ep\)\s+([^\s\)]+)\s+([^\s\)]+)\s+0\)',
        r'\w+\s*=\s*schCreateWire\(cv\s+"route"\s+"full"\s+list\(plus\s+ep\)\s+([^\s\)]+)\s+([^\s\)]+)\s*\)',
    ]
    for pattern in patterns:
        m = re.search(pattern, block)
        if m and m.group(1) == m.group(2):
            return m.group(1)
    m = re.search(rf'(?m)(?:\(\s*)?setq\s*\(?\s*{re.escape(prefix)}_WIRE\s+([^\s\)]+)', text)
    if m:
        return m.group(1)
    raise ValueError("cannot determine PLUS wire width")


def migrate_vdc_procedure(text, match):
    prefix, kind = match.group(1), match.group(2)
    start = match.start()
    end = block_end(text, start)
    block = text[start:end]
    if kind == "CreateVDC":
        new_sig = f"procedure({prefix}_CreateVDC(cv master gndMaster name xy value plusNet minusNet)"
        pinc = f"{prefix}_VDCPinCenter"
        setv = f"{prefix}_SetVDC"
    else:
        new_sig = f"procedure({prefix}_VDC(cv master gndMaster name xy plusNet value minusNet)"
        pinc = f"{prefix}_VPin"
        setv = f"{prefix}_SetVDC"
    done = (
        new_sig in block
        and 'if(equal(minusNet "GND") then' in block
        and 'strcat(name "_GND")' in block
        and "wm=schCreateWire" in block
    )
    if done:
        return text, False
    width = wire_width(text, block, prefix)
    body = f'''{new_sig}
    let((inst gnd plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("{prefix}: cannot create VDC %s.\\n" name))
        {setv}(inst value)
        plus={pinc}(inst "PLUS")
        minus={pinc}(inst "MINUS")
        ep=list(car(plus) cadr(plus)+{prefix}_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) {width} {width} 0)
        unless(wp error("{prefix}: VDC PLUS wiring failed for %s.\\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" {width} nil)
        if(equal(minusNet "GND") then
            gnd=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gnd error("{prefix}: cannot create GND for VDC %s.\\n" name))
            else
            em=list(car(minus) cadr(minus)-{prefix}_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) {width} {width} 0)
            unless(wm error("{prefix}: VDC MINUS wiring failed for %s.\\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" {width} nil)
        )
        printf("{prefix}: VDC %s = %sV PLUS=%s MINUS=%s\\n" name value plusNet minusNet)
        inst
    )
)
'''
    return text[:start] + body + text[end:], True


def parse_create_call(rest):
    quoted = re.findall(r'"([^"]*)"', rest)
    if len(quoted) < 2:
        raise ValueError("malformed CreateVDC call")
    tail = quoted[-3:] if len(quoted) >= 3 else quoted
    if len(tail) == 3 and NUM.fullmatch(tail[-1]):
        plus_net, minus_net, value = tail
    elif len(tail) == 3:
        value, plus_net, minus_net = tail
    else:
        value, plus_net = tail[-2:]
        minus_net = "GND" if plus_net == "VSS" else "VSS"
    return value, plus_net, minus_net


def parse_vdc_call(rest):
    coord_match = re.match(r'([^\s]+)\s+', rest)
    if not coord_match:
        raise ValueError("malformed VDC coordinate")
    coord = coord_match.group(1)
    quoted = re.findall(r'"([^"]*)"', rest)
    if len(quoted) < 2:
        raise ValueError("malformed VDC call")
    if quoted[-1] in ("GND", "VSS") and len(quoted) >= 3:
        plus_net, value, minus_net = quoted[-3], quoted[-2], quoted[-1]
    else:
        plus_net, value = quoted[-2], quoted[-1]
        minus_net = "GND" if plus_net == "VSS" else "VSS"
    return coord, plus_net, value, minus_net


def migrate_calls(text):
    changed = False
    create_pat = re.compile(r'(?m)^(\s*)(\w+)_CreateVDC\(cv vdcMaster(?: gndMaster)?\s+"([^"]+)"\s+([^\n]*)\)$')

    def create_repl(m):
        nonlocal changed
        indent, prefix, name, rest = m.groups()
        value, plus_net, _ = parse_create_call(rest)
        minus_net = "GND" if plus_net == "VSS" else "VSS"
        changed = True
        return f'{indent}{prefix}_CreateVDC(cv vdcMaster gndMaster "{name}" "{value}" "{plus_net}" "{minus_net}")'

    text = create_pat.sub(create_repl, text)
    vdc_pat = re.compile(r'(?m)^(\s*)(\w+)_VDC\(cv vdcMaster(?: gndMaster)?\s+"([^"]+)"\s+([^\n]*)\)$')

    def vdc_repl(m):
        nonlocal changed
        indent, prefix, name, rest = m.groups()
        coord, plus_net, value, _ = parse_vdc_call(rest)
        minus_net = "GND" if plus_net == "VSS" else "VSS"
        changed = True
        return f'{indent}{prefix}_VDC(cv vdcMaster gndMaster "{name}" {coord} "{plus_net}" "{value}" "{minus_net}")'

    text = vdc_pat.sub(vdc_repl, text)
    return text, changed


def migrate_special_contracts(path, text):
    if path.name != "Telescopic_OTA_NMOS_Diff_TotalW_V7_VDC_InputBias_OutputPins_20260812.il":
        return text
    changed = False
    old = 'TOTA7_LabelTerminal(cv M4 "D" "VOUTN")'
    new = 'voutnEnd=TOTA7_LabelTerminal(cv M4 "D" "VOUTN")'
    if old in text and new not in text:
        text = text.replace(old, new, 1)
        changed = True
    marker = 'printf("TOTA7: SCHEMATIC_GENERATION_COMPLETED\\n")'
    status = 'printf("STATUS   : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\\n")\n        '
    if 'STATUS   : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED' not in text and marker in text:
        text = text.replace(marker, status + marker, 1)
        changed = True
    return text


def migrate_file(path):
    text = path.read_text(encoding="utf-8")
    original = text
    matches = list(re.finditer(r'procedure\((\w+)_(CreateVDC|VDC)\(', text))
    for match in reversed(matches):
        text, _ = migrate_vdc_procedure(text, match)
    text, _ = migrate_calls(text)
    text = migrate_special_contracts(path, text)
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def validate():  # noqa: C901
    failures = []
    checked = 0
    for path in sorted(ROOT.rglob("*.il")):
        text = path.read_text(encoding="utf-8")
        matches = list(re.finditer(r'procedure\((\w+)_(CreateVDC|VDC)\(', text))
        if not matches:
            continue
        checked += 1
        for match in matches:
            prefix, kind = match.group(1), match.group(2)
            block = text[match.start():block_end(text, match.start())]
            sig = (
                f"procedure({prefix}_CreateVDC(cv master gndMaster name xy value plusNet minusNet)"
                if kind == "CreateVDC"
                else f"procedure({prefix}_VDC(cv master gndMaster name xy plusNet value minusNet)"
            )
            if sig not in block:
                failures.append(f"{path}: {prefix}_{kind}: non-explicit VSS/GND signature")
            if 'if(equal(minusNet "GND") then' not in block:
                failures.append(f"{path}: {prefix}_{kind}: missing GND-only branch")
            if "wm=schCreateWire" not in block or "minusNet" not in block:
                failures.append(f"{path}: {prefix}_{kind}: legacy VSS MINUS path missing")
            if 'strcat(name "_GND")' not in block:
                failures.append(f"{path}: {prefix}_{kind}: unique GND naming missing")
        for m in re.finditer(r'(?m)^\s*(\w+)_CreateVDC\(cv vdcMaster gndMaster\s+"([^"]+)"\s+([^\n]*)\)$', text):
            prefix, _, rest = m.groups()
            try:
                _, plus_net, minus_net = parse_create_call(rest)
            except ValueError:
                failures.append(f"{path}: malformed {prefix}_CreateVDC call")
                continue
            expected = "GND" if plus_net == "VSS" else "VSS"
            if minus_net != expected:
                failures.append(f"{path}: {prefix}_CreateVDC: PLUS={plus_net} requires MINUS={expected}, found {minus_net}")
        for m in re.finditer(r'(?m)^\s*(\w+)_VDC\(cv vdcMaster gndMaster\s+"([^"]+)"\s+([^\n]*)\)$', text):
            prefix, _, rest = m.groups()
            try:
                _, plus_net, _, minus_net = parse_vdc_call(rest)
            except ValueError:
                failures.append(f"{path}: malformed {prefix}_VDC call")
                continue
            expected = "GND" if plus_net == "VSS" else "VSS"
            if minus_net != expected:
                failures.append(f"{path}: {prefix}_VDC: PLUS={plus_net} requires MINUS={expected}, found {minus_net}")
    print(f"Checked {checked} canonical VDC generator files")
    if failures:
        print("VALIDATION FAILURES:")
        for failure in failures:
            print(f"  {failure}")
        return False
    print("Canonical VSS-only validation: PASS")
    return True


def main():
    changed = []
    for path in sorted(ROOT.rglob("*.il")):
        try:
            if migrate_file(path):
                changed.append(str(path))
        except ValueError as exc:
            print(f"ERROR: {path}: {exc}")
            return 1
    print("NORMALIZED:")
    for item in changed:
        print(f"  {item}")
    return 0 if validate() else 1


if __name__ == "__main__":
    sys.exit(main())
