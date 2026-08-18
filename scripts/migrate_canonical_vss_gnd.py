from pathlib import Path
import re
import sys

ROOT = Path("canonical")


def block_end(text, start):
    nxt = text.find("\nprocedure(", start + 1)
    return len(text) if nxt < 0 else nxt


def wire_width(block):
    patterns = [
        r'\w+\s*=\s*schCreateWire\(cv\s+"route"\s+"full"\s+list\(plus\s+ep\)\s+([^\s\)]+)\s+([^\s\)]+)\s+0\)',
        r'\w+\s*=\s*schCreateWire\(cv\s+"route"\s+"full"\s+list\(plus\s+ep\)\s+([^\s\)]+)\s+([^\s\)]+)\s*\)',
    ]
    for pattern in patterns:
        m = re.search(pattern, block)
        if m and m.group(1) == m.group(2):
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
        done = new_sig in block and 'if(equal(minusNet "GND") then' in block and 'strcat(name "_GND")' in block and "wm=schCreateWire" in block
    else:
        new_sig = f"procedure({prefix}_VDC(cv master gndMaster name xy plusNet value minusNet)"
        pinc = f"{prefix}_VPin"
        setv = f"{prefix}_SetVDC"
        done = new_sig in block and 'if(equal(minusNet "GND") then' in block and 'strcat(name "_GND")' in block and "wm=schCreateWire" in block
    if done:
        return text, False

    width = wire_width(block)
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


def migrate_calls(text):
    changed = False
    create_pat = re.compile(r'(?m)^(\s*)(\w+)_CreateVDC\(cv vdcMaster(?: gndMaster)? ([^\n]*)\)$')

    def create_repl(m):
        nonlocal changed
        indent, prefix, args = m.groups()
        quoted = re.findall(r'"([^"]*)"', args)
        if not quoted:
            raise ValueError(f"{prefix}_CreateVDC: malformed call")
        if len(quoted) >= 2 and quoted[-1] in ("GND", "VSS"):
            plus_net, minus_net = quoted[-2], quoted[-1]
        else:
            plus_net = quoted[-1]
            minus_net = "GND" if plus_net == "VSS" else "VSS"
            args += f' "{minus_net}"'
            changed = True
        expected = "GND" if plus_net == "VSS" else "VSS"
        if minus_net != expected:
            args = args.rsplit('"', 2)[0] + f'"{expected}"'
            changed = True
        if "cv vdcMaster gndMaster " not in m.group(0):
            changed = True
        return f'{indent}{prefix}_CreateVDC(cv vdcMaster gndMaster {args})'

    text = create_pat.sub(create_repl, text)

    vdc_pat = re.compile(r'(?m)^(\s*)(\w+)_VDC\(cv vdcMaster(?: gndMaster)? ([^\n]*)\)$')

    def vdc_repl(m):
        nonlocal changed
        indent, prefix, args = m.groups()
        quoted = re.findall(r'"([^"]*)"', args)
        if len(quoted) < 2:
            raise ValueError(f"{prefix}_VDC: malformed call")
        if quoted[-1] in ("GND", "VSS") and len(quoted) >= 3:
            plus_net, minus_net = quoted[-2], quoted[-1]
        else:
            plus_net = quoted[-2]
            minus_net = "GND" if plus_net == "VSS" else "VSS"
            args += f' "{minus_net}"'
            changed = True
        expected = "GND" if plus_net == "VSS" else "VSS"
        if minus_net != expected:
            args = args.rsplit('"', 2)[0] + f'"{expected}"'
            changed = True
        if "cv vdcMaster gndMaster " not in m.group(0):
            changed = True
        return f'{indent}{prefix}_VDC(cv vdcMaster gndMaster {args})'

    text = vdc_pat.sub(vdc_repl, text)
    return text, changed


def migrate_file(path):
    text = path.read_text(encoding="utf-8")
    original = text
    matches = list(re.finditer(r'procedure\((\w+)_(CreateVDC|VDC)\(', text))
    for match in reversed(matches):
        text, _ = migrate_vdc_procedure(text, match)
    text, _ = migrate_calls(text)
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def validate():
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
        for m in re.finditer(r'(?m)^\s*(\w+)_(CreateVDC|VDC)\(cv vdcMaster gndMaster ([^\n]*)\)$', text):
            prefix, kind, args = m.groups()
            quoted = re.findall(r'"([^"]*)"', args)
            if kind == "CreateVDC":
                if len(quoted) < 2:
                    failures.append(f"{path}: malformed {prefix}_CreateVDC call")
                    continue
                plus_net, minus_net = quoted[-2], quoted[-1]
            else:
                if len(quoted) < 3:
                    failures.append(f"{path}: malformed {prefix}_VDC call")
                    continue
                plus_net, minus_net = quoted[-3], quoted[-1]
            expected = "GND" if plus_net == "VSS" else "VSS"
            if minus_net != expected:
                failures.append(f"{path}: {prefix}_{kind}: PLUS={plus_net} requires MINUS={expected}, found {minus_net}")
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
