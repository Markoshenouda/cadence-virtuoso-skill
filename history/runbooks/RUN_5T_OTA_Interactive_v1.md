# 5T OTA Interactive Generator V1 — Test Procedure

This version tests the first stage only: selecting **NMOS input pair** or **PMOS input pair**.

It intentionally does not generate the OTA yet. This isolates the user-choice mechanism before topology generation is added.

## 1. Copy to Debian

From Windows CMD:

```cmd
scp "C:\Users\marko\Desktop\5T_OTA_Generator_Interactive_v1.il" cadence@192.168.75.216:/home/cadence/
```

## 2. Open a NEW empty schematic

Open a fresh editable schematic in Cadence Virtuoso IC6.1.7.

## 3. Load

In CIW:

```skill
load("/home/cadence/5T_OTA_Generator_Interactive_v1.il")
```

## 4. Test only the selection dialog first

Run:

```skill
TOTA5_InputPairSelectionTest_20260810()
```

The generator should ask:

```text
Input pair type [NMOS/PMOS]:
```

Enter:

```text
NMOS
```

Expected:

```text
TOTA5: Selected NMOS input pair.
TOTA5: Selection test result = NMOS
```

Then test again with:

```text
PMOS
```

Expected:

```text
TOTA5: Selected PMOS input pair.
TOTA5: Selection test result = PMOS
```

## 5. Test the main entry point

After the selection helper works, run:

```skill
Create5TOTA()
```

It should ask for NMOS/PMOS and then stop after confirming the selection.

Expected behavior:

```text
TOTA5: Input pair selected = NMOS
TOTA5: Selection accepted.
TOTA5: Generator is intentionally stopping here.
TOTA5: Next revision will build the selected topology.
```

or the corresponding PMOS result.

## 6. Do not expect devices yet

V1 is deliberately a **selection-stage test**. It should not create the five MOS devices yet.

Once this first stage works in the user's Cadence session, the next revision can use the selected value to generate either:

- NMOS input-pair 5T OTA, or
- PMOS input-pair 5T OTA.

## 7. Why this is separated

The project rule is test-first for new functionality. The input-pair selection is isolated so that a dialog/API problem cannot be confused with MOS placement, CDF sizing, pin extraction, wiring, or schematic pin creation.
