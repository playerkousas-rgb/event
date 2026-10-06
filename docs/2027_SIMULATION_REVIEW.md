# ISD 2027 fake-data connection review

## Purpose and boundary

This is a **strictly separate rehearsal profile**, not a 2027 operating system.
It contains fake, review-friendly values so reviewers can modify one canonical
source and confirm all of its dependent outputs resolve from that source.

- Profile status: `simulation_seed_from_2026_evidence_not_live`
- Simulation files: `data/2027_simulation_*` and
  `data/2027_simulation_sources/`
- Real baseline: `data/2027_canonical_source_registry.json`,
  `data/2027_output_connection_registry.json`, and
  `data/2027_blank_sources/`
- The real baseline stays blank: 96 controlled sources, 109 output pointers,
  revision 0, and no operational 2026 data.
- The simulation preserves the same 96-source / 109-output topology, but has
  approved fake source records at revision 1 for review only.
- The separately labelled Drive review pack is in
  [`98_演練覆核（假資料・非 live）`](https://drive.google.com/drive/folders/1bkpIFbp9x6YzDfDYCEiKOgaHNChJEHdk),
  beside—not inside—the active blank system folder. Its artifact IDs are listed
  in `data/2027_simulation_drive_registry.json`.

The simulation may **never** be published as real 2027 data, uploaded into the
active blank-framework Drive folder, or used as a deployment/intake source.
Before real 2027 entry, delete/rebuild the simulation profile and enter new
approved 2027 content in the blank profile through the formal controlled-source
process.

## One-time evidence seed

```bash
node tools/build_2027_simulation_from_2026.js
```

This is the only simulation component that reads `data/isd_2026.json`. It first
checks the checksum in `data/2026_reference_lock.json`, then creates derived
fake records. Personal names, contact details, car plates, direct document URLs
and full ceremony scripts are not carried over. Participant and guest data are
anonymised patterns; document and script records are metadata/templates.

The command resets simulation content back to its reproducible revision-1
seed. It does **not** touch the blank framework.

## Review form: edit one source and watch propagation

```bash
node tools/serve_2027_simulation_review.js
```

Open `http://localhost:4177` locally (or the Arena preview URL in this
workspace). The form:

1. lists the simulation canonical source IDs and their ownership;
2. lets the reviewer change that source's `editable_test_value`;
3. records a controlled approved simulation revision with an audit ID;
4. rebuilds only the simulation projection/review; and
5. highlights every dependent output card, showing the same source revision and
   preview value.

The server never opens the 2026 archive and rejects blocked live-2026
references through the shared source validator. It only writes
`data/2027_simulation_sources/`,
`data/2027_simulation_output_source_projection.json`, and
`data/2027_simulation_review.json`.

For a non-browser source edit, use the review-only builder afterward:

```bash
node tools/build_2027_simulation_review.js
```

This builder deliberately does not read 2026 evidence. It only resolves the
current fake simulation sources into the pointer-only projection and review
preview.

## Verification

```bash
node tests/simulation_2027_review_test.js
```

The test rebuilds the fake seed, confirms the blank profile remains untouched,
and proves a single source revision is visible to all dependent output pointers
without copying the value into output-owned data.
