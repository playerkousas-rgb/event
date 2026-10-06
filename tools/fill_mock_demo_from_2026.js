#!/usr/bin/env node
'use strict';
/*
 * Retired compatibility entrypoint.
 *
 * 2026 is now an immutable reference archive and may not feed a mutable 2027
 * product on every rebuild. The one-time bootstrap was completed into
 * data/isd_2027.json. This command therefore delegates to the 2027-only
 * builder; it deliberately does not import reference_archive.js.
 */
console.warn('DEPRECATED: 2026 is not a live source for the 2027 mock. Rebuilding from data/isd_2027.json instead.');
require('./build_mock_demo_from_2027.js');
