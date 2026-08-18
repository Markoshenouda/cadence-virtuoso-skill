from pathlib import Path
import re
import sys

ROOT = Path("canonical")


def migrate_file(path: Path):
    text = path.read_text(encoding="utf-8")
    matches = list(
        re.finditer(
            r"procedure\((\w+)_CreateVDC\(cv master name xy value plusNet minusNet\)",
            text,
        )
    )
    if not matches:
        return False, "no legacy CreateVDC"

    original = text
    prefixes = []

    for match in reversed(matches):
        prefix = match.group(1)
        prefixes.append(prefix)
        old_sig = f"procedure({prefix}_CreateVDC(cv master name xy value plusNet minusNet)"
        new_sig = f"procedure({prefix}_CreateVDC(cv master gndMaster name xy value plusNet)"
        start = match.start()
        next_proc = text.find("\nprocedure(", match.end())
        end = len(text) if next_proc < 0 else next_proc
        block = text[start:end]

        # Only touch the known legacy VDC implementation. Unknown variants are
        # reported rather than guessed or rewritten blindly.
        if "wm=schCreateWire" not in block or "minusNet" not in block:
            return False, f"{prefix}: legacy shape not recognized"

        body_match = re.search(
            r"let\(\(inst plus minus ep em wp wm\)\n.*?\n        inst\n    \)\n\)\n",
            block,
            re.S,
        )
        if not body_match:
            return False, f"{prefix}: legacy body not recognized"

        body = f'''let((inst gnd plus minus ep wp)\n        inst=dbCreateInst(cv master name xy "R0")\n        unless(inst error("{prefix}: cannot create VDC %s.\\n" name))\n        {prefix}_SetVDC(inst value)\n        plus={prefix}_VDCPinCenter(inst "PLUS")\n        minus={prefix}_VDCPinCenter(inst "MINUS")\n        ep=list(car(plus) cadr(plus)+{prefix}_STUB)\n        wp=schCreateWire(cv "route" "full" list(plus ep) {prefix}_WIRE {prefix}_WIRE 0)\n        unless(wp error("{prefix}: VDC PLUS wiring failed for %s.\\n" name))\n        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" {prefix}_WIRE nil)\n        gnd=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")\n        unless(gnd error("{prefix}: cannot create GND for VDC %s.\\n" name))\n        printf("{prefix}: VDC %s = %sV PLUS=%s MINUS=GND\\n" name value plusNet)\n        inst\n    )\n)\n'''

        block = block.replace(old_sig, new_sig, 1)
        block = block.replace(body_match.group(0), body, 1)
        text = text[:start] + block + text[end:]

    # Add gndMaster to the generator let binding.
    if "gndMaster=" not in text:
        let_match = re.search(r"let\(\(([^\n]*vdcMaster[^\n]*)\)\n", text)
        if not let_match:
            return False, "no let binding containing vdcMaster"
        binding = let_match.group(1)
        if "gndMaster" not in binding:
            binding_new = binding.replace("vdcMaster", "vdcMaster gndMaster", 1)
            text = text[: let_match.start(1)] + binding_new + text[let_match.end(1) :]

    # Add analogLib/gnd beside the existing analogLib/vdc master.
    if "gndMaster=" not in text:
        inserted = False
        open_master = re.search(
            r'(?m)^(\s*)vdcMaster=([A-Za-z0-9_]+_OpenMaster)\("analogLib" "vdc"\)\s*$',
            text,
        )
        if open_master:
            indent, opener = open_master.group(1), open_master.group(2)
            line = f'{indent}gndMaster={opener}("analogLib" "gnd")'
            text = text[: open_master.end()] + "\n" + line + text[open_master.end() :]
            inserted = True
        else:
            direct_master = re.search(
                r'(?m)^(\s*)vdcMaster=dbOpenCellViewByType\("analogLib" "vdc" "symbol" "" "r"\)\s*$',
                text,
            )
            if direct_master:
                indent = direct_master.group(1)
                line = f'{indent}gndMaster=dbOpenCellViewByType("analogLib" "gnd" "symbol" "" "r")'
                text = text[: direct_master.end()] + "\n" + line + text[direct_master.end() :]
                inserted = True
        if not inserted:
            return False, "could not add analogLib/gnd master"

    call_total = 0
    for prefix in sorted(set(prefixes)):
        text, count = re.subn(
            rf"{re.escape(prefix)}_CreateVDC\(cv vdcMaster ([^\n]*?) \"VSS\"\)",
            lambda m, p=prefix: f"{p}_CreateVDC(cv vdcMaster gndMaster {m.group(1)})",
            text,
        )
        call_total += count

    if call_total == 0:
        return False, "no VDC calls with VSS MINUS found"

    path.write_text(text, encoding="utf-8")
    return text != original, f"{call_total} VDC calls"


def validate():
    failures = []
    checked = 0
    for path in sorted(ROOT.rglob("*.il")):
        text = path.read_text(encoding="utf-8")
        matches = list(re.finditer(r"procedure\((\w+)_CreateVDC\(", text))
        if not matches:
            continue
        checked += 1
        if "gndMaster=" not in text:
            failures.append(f"{path}: gndMaster binding missing")
        for match in matches:
            prefix = match.group(1)
            next_proc = text.find("\nprocedure(", match.end())
            block = text[match.start() : len(text) if next_proc < 0 else next_proc]
            if "cv master gndMaster name xy value plusNet" not in block:
                failures.append(f"{path}: {prefix}_CreateVDC legacy signature remains")
            if 'strcat(name "_GND")' not in block:
                failures.append(f"{path}: {prefix}_CreateVDC missing unique GND naming")
            if 'list(plus ep)' not in block:
                failures.append(f"{path}: {prefix}_CreateVDC PLUS wire missing")
            if "wm=schCreateWire" in block or "minusNet" in block:
                failures.append(f"{path}: {prefix}_CreateVDC still has MINUS wire/label")
    print(f"Checked {checked} canonical VDC generators")
    if failures:
        for failure in failures:
            print(f"FAIL: {failure}")
        return False
    print("Canonical VSS/GND validation: PASS")
    return True


def main():
    changed = []
    skipped = []
    for path in sorted(ROOT.rglob("*.il")):
        did_change, reason = migrate_file(path)
        if did_change:
            changed.append(f"{path}: {reason}")
        elif reason != "no legacy CreateVDC":
            skipped.append(f"{path}: {reason}")

    print("MIGRATED:")
    for item in changed:
        print(f"  {item}")
    print("SKIPPED:")
    for item in skipped:
        print(f"  {item}")

    if not validate():
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
