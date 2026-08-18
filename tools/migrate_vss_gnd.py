from pathlib import Path
import re
import sys

ROOT = Path("canonical")


def migrate_file(path: Path):
    text = path.read_text(encoding="utf-8")
    original = text

    sig_match = re.search(
        r"procedure\((\w+)_CreateVDC\(cv master name xy value plusNet minusNet\)",
        text,
    )
    if not sig_match:
        return "skip", "no canonical CreateVDC signature"

    prefix = sig_match.group(1)
    sig = f"procedure({prefix}_CreateVDC(cv master name xy value plusNet minusNet)"
    new_sig = f"procedure({prefix}_CreateVDC(cv master gndMaster name xy value plusNet)"

    start = text.find(sig)
    next_proc = text.find("\nprocedure(", start + len(sig))
    end = len(text) if next_proc < 0 else next_proc
    block = text[start:end]

    if (
        "gndMaster" in block
        and 'strcat(name "_GND")' in block
        and 'schCreateWire(cv "route" "full" list(minus em)' not in block
        and "minusNet" not in block
    ):
        return "skip", "already compliant"

    old = re.search(
        r"let\(\(inst plus minus ep em wp wm\)\n"
        r".*?"
        r"printf\(\"[^\"]*VDC %s = %sV PLUS=%s MINUS=%s\\n\" name value plusNet minusNet\)\n"
        r"        inst\n"
        r"    \)\n\)\n",
        block,
        re.S,
    )
    if not old:
        return "fail", "CreateVDC body pattern requires manual review"

    new_body = f'''let((inst gnd plus minus ep wp)\n        inst=dbCreateInst(cv master name xy "R0")\n        unless(inst error("{prefix}: cannot create VDC %s.\\n" name))\n        {prefix}_SetVDC(inst value)\n        plus={prefix}_VDCPinCenter(inst "PLUS")\n        minus={prefix}_VDCPinCenter(inst "MINUS")\n        ep=list(car(plus) cadr(plus)+{prefix}_STUB)\n        wp=schCreateWire(cv "route" "full" list(plus ep) {prefix}_WIRE {prefix}_WIRE 0)\n        unless(wp error("{prefix}: VDC PLUS wiring failed for %s.\\n" name))\n        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" {prefix}_WIRE nil)\n        gnd=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")\n        unless(gnd error("{prefix}: cannot create GND for VDC %s.\\n" name))\n        printf("{prefix}: VDC %s = %sV PLUS=%s MINUS=GND\\n" name value plusNet)\n        inst\n    )\n)\n'''

    block2 = block.replace(sig, new_sig, 1).replace(old.group(0), new_body, 1)
    if block2 == block:
        return "fail", "no effective VDC change"
    text = text[:start] + block2 + text[end:]

    # Add gndMaster to the main generator let-list.
    if "gndMaster=" not in text:
        let_pat = re.compile(r"(let\(\(cv [^\n]*?vdcMaster) (pinMaster)")
        text, n = let_pat.subn(r"\1 gndMaster \2", text, count=1)
        if n != 1:
            return "fail", "could not add gndMaster to main let-list"

    # Open analogLib/gnd beside analogLib/vdc.
    open_pat = re.compile(
        rf'(vdcMaster={re.escape(prefix)}_OpenMaster\("analogLib" "vdc"\)\n)(\s*)(pinMaster={re.escape(prefix)}_OpenMaster)'
    )
    text, n = open_pat.subn(
        rf'\1        gndMaster={prefix}_OpenMaster("analogLib" "gnd")\n\2\3',
        text,
        count=1,
    )
    if n != 1:
        return "fail", "could not add analogLib/gnd master"

    # Update every VDC call with the old final minusNet="VSS" argument.
    call_pat = re.compile(
        rf'{re.escape(prefix)}_CreateVDC\(cv vdcMaster ([^\n]*?) "VSS"\)'
    )
    text, n = call_pat.subn(
        lambda m: f'{prefix}_CreateVDC(cv vdcMaster gndMaster {m.group(1)})',
        text,
    )
    if n == 0:
        return "fail", "no VDC calls updated"

    # Strict validation of the modified CreateVDC.
    vdc = re.search(
        rf'procedure\({re.escape(prefix)}_CreateVDC\(cv master gndMaster name xy value plusNet\).*?(?=\nprocedure\(|\Z)',
        text,
        re.S,
    )
    if not vdc:
        return "fail", "modified CreateVDC not found after migration"
    b = vdc.group(0)
    required = [
        "gndMaster",
        'strcat(name "_GND")',
        "MINUS=GND",
        'list(plus ep)',
    ]
    forbidden = [
        "minusNet",
        "em=list(car(minus)",
        'list(minus em)',
        "wm=schCreateWire",
        "car(wm)",
    ]
    if any(x not in b for x in required) or any(x in b for x in forbidden):
        return "fail", "post-validation failed VSS/GND contract"

    if text == original:
        return "skip", "no textual change"
    path.write_text(text, encoding="utf-8")
    return "changed", f"updated {n} VDC calls"


def validate_all():
    failures = []
    procedures = 0
    compliant = 0
    for path in sorted(ROOT.rglob("*.il")):
        text = path.read_text(encoding="utf-8")
        for m in re.finditer(
            r"procedure\((\w+)_CreateVDC\(cv master gndMaster name xy value plusNet\).*?(?=\nprocedure\(|\Z)",
            text,
            re.S,
        ):
            procedures += 1
            b = m.group(0)
            if (
                'strcat(name "_GND")' in b
                and 'list(plus ep)' in b
                and 'list(minus em)' not in b
                and 'schCreateWireLabel(cv car(wm)' not in b
                and "minusNet" not in b
            ):
                compliant += 1
            else:
                failures.append(str(path))
    return procedures, compliant, failures


changed, skipped, failed = [], [], []
for p in sorted(ROOT.rglob("*.il")):
    status, reason = migrate_file(p)
    if status == "changed":
        changed.append(f"{p}: {reason}")
    elif status == "skip":
        skipped.append(f"{p}: {reason}")
    else:
        failed.append(f"{p}: {reason}")

print("=== VSS/GND migration ===")
print(f"Changed: {len(changed)}")
for x in changed:
    print("CHANGED", x)
print(f"Skipped: {len(skipped)}")
for x in skipped:
    print("SKIPPED", x)
print(f"Manual review failures: {len(failed)}")
for x in failed:
    print("FAILED", x)

if failed:
    sys.exit(2)

procedures, compliant, validation_failures = validate_all()
print(f"VDC procedures found: {procedures}")
print(f"VDC procedures compliant: {compliant}")
if validation_failures:
    for x in validation_failures:
        print("NONCOMPLIANT", x)
    sys.exit(3)
