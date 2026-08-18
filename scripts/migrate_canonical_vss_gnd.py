from pathlib import Path
import re
import sys

ROOT = Path("canonical")


def _block_end(text, start):
    next_proc = text.find("\nprocedure(", start + 1)
    return len(text) if next_proc < 0 else next_proc


def migrate_file(path: Path):
    text = path.read_text(encoding="utf-8")
    original = text
    changed = False

    # Repair the already-migrated broad shape without changing the behavior of
    # non-VSS VDC sources. The caller explicitly selects GND only for PLUS=VSS.
    matches = list(re.finditer(r"procedure\((\w+)_CreateVDC\(", text))
    for match in reversed(matches):
        prefix = match.group(1)
        start = match.start()
        end = _block_end(text, start)
        block = text[start:end]
        broad_sig = f"procedure({prefix}_CreateVDC(cv master gndMaster name xy value plusNet)"
        if broad_sig not in block:
            continue

        wire_m = re.search(
            r'wp=schCreateWire\(cv "route" "full" list\(plus ep\) ([A-Za-z0-9_]+) \\1 0\)',
            block,
        )
        if not wire_m:
            return False, f"{prefix}: cannot determine PLUS wire width"
        wire = wire_m.group(1)

        body_start = block.find("let((", block.find(f"procedure({prefix}_CreateVDC"))
        if body_start < 0:
            return False, f"{prefix}: cannot find CreateVDC body"

        body = f'''let((inst gnd plus minus ep em wp wm)\n        inst=dbCreateInst(cv master name xy "R0")\n        unless(inst error("{prefix}: cannot create VDC %s.\\n" name))\n        {prefix}_SetVDC(inst value)\n        plus={prefix}_VDCPinCenter(inst "PLUS")\n        minus={prefix}_VDCPinCenter(inst "MINUS")\n        ep=list(car(plus) cadr(plus)+{prefix}_STUB)\n        wp=schCreateWire(cv "route" "full" list(plus ep) {wire} {wire} 0)\n        unless(wp error("{prefix}: VDC PLUS wiring failed for %s.\\n" name))\n        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" {wire} nil)\n        if(equal(minusNet "GND") then\n            gnd=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")\n            unless(gnd error("{prefix}: cannot create GND for VDC %s.\\n" name))\n            else\n            em=list(car(minus) cadr(minus)-{prefix}_STUB)\n            wm=schCreateWire(cv "route" "full" list(minus em) {wire} {wire} 0)\n            unless(wm error("{prefix}: VDC MINUS wiring failed for %s.\\n" name))\n            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" {wire} nil)\n        )\n        printf("{prefix}: VDC %s = %sV PLUS=%s MINUS=%s\\n" name value plusNet minusNet)\n        inst\n    )\n)'''

        new_block = block[:body_start] + body + "\n"
        new_block = new_block.replace(broad_sig,
            f"procedure({prefix}_CreateVDC(cv master gndMaster name xy value plusNet minusNet)", 1)
        text = text[:start] + new_block + text[end:]
        changed = True

    # Make every migrated VDC call explicit. A source whose PLUS net is VSS is
    # the only source that gets direct analogLib/gnd; all others retain VSS on MINUS.
    def call_repl(match):
        prefix = match.group(1)
        args = match.group(2).strip()
        if args.endswith('"GND"') or args.endswith('"VSS"'):
            return match.group(0)
        net_m = re.search(r'"([^"]+)"\s*$', args)
        if not net_m:
            raise ValueError(f"{prefix}: cannot determine VDC PLUS net")
        plus_net = net_m.group(1)
        minus_net = "GND" if plus_net == "VSS" else "VSS"
        return f'{prefix}_CreateVDC(cv vdcMaster gndMaster {args} "{minus_net}")'

    text = re.sub(
        r'(?m)^\s*(\w+)_CreateVDC\(cv vdcMaster ([^\n]*)\)$',
        call_repl,
        text,
    )
    changed |= text != original

    if changed:
        path.write_text(text, encoding="utf-8")
        return True, "VSS-only normalization"
    return False, "no broad VDC migration found"


def validate():
    failures = []
    checked = 0

    for path in sorted(ROOT.rglob("*.il")):
        text = path.read_text(encoding="utf-8")
        matches = list(re.finditer(r"procedure\((\w+)_CreateVDC\(", text))
        if not matches:
            continue
        checked += 1

        for match in matches:
            prefix = match.group(1)
            end = _block_end(text, match.start())
            block = text[match.start():end]
            expected_sig = f"procedure({prefix}_CreateVDC(cv master gndMaster name xy value plusNet minusNet)"
            if expected_sig not in block:
                failures.append(f"{path}: {prefix}: non-explicit CreateVDC signature")
            if 'if(equal(minusNet "GND") then' not in block:
                failures.append(f"{path}: {prefix}: missing VSS-only GND branch")
            if "wm=schCreateWire" not in block or "minusNet" not in block:
                failures.append(f"{path}: {prefix}: legacy non-VSS MINUS wire/label missing")
            if 'strcat(name "_GND")' not in block:
                failures.append(f"{path}: {prefix}: unique GND naming missing")

        for call in re.finditer(
            r'(?m)^\s*(\w+)_CreateVDC\(cv vdcMaster gndMaster ([^\n]*)\)$',
            text,
        ):
            args = call.group(2).strip()
            nets = re.search(r'"([^"]+)"\s+"([^"]+)"$', args)
            if not nets:
                failures.append(f"{path}: malformed VDC call")
                continue
            plus_net, minus_net = nets.groups()
            expected = "GND" if plus_net == "VSS" else "VSS"
            if minus_net != expected:
                failures.append(
                    f"{path}: PLUS={plus_net} must terminate at MINUS={expected}, found {minus_net}"
                )

    print(f"Checked {checked} canonical VDC generator files")
    if failures:
        for failure in failures:
            print(f"FAIL: {failure}")
        return False
    print("Canonical VSS-only validation: PASS")
    return True


def main():
    changed = []
    skipped = []
    for path in sorted(ROOT.rglob("*.il")):
        try:
            did_change, reason = migrate_file(path)
        except ValueError as exc:
            did_change, reason = False, str(exc)
        if did_change:
            changed.append(f"{path}: {reason}")
        else:
            skipped.append(f"{path}: {reason}")

    print("NORMALIZED:")
    for item in changed:
        print(f"  {item}")
    print("SKIPPED:")
    for item in skipped:
        print(f"  {item}")

    return 0 if validate() else 1


if __name__ == "__main__":
    sys.exit(main())
