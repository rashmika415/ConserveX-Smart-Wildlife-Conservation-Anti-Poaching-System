import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const plans = {
  1: {
    name: 'Incident management',
    frontend: [
      ['incidentOutbox.test.js'],
      [
        'fieldManagement.test.jsx',
        'workflows.test.jsx',
        'dataHooks.test.jsx',
        '-t',
        'incident|unsynchronized ranger reports|storage errors',
      ],
    ],
    backend: [['tests/api.test.js', '-t', '^Incident management']],
  },
  2: {
    name: 'GPS collar tracking and alerts',
    frontend: [['collars.test.jsx', 'notifications.test.jsx']],
    backend: [
      ['tests/api.test.js', '-t', '^Collar monitoring and alerts'],
      ['tests/collar-simulator.test.js', 'tests/alert-escalation.test.js'],
    ],
  },
  3: {
    name: 'Patrol management',
    frontend: [
      ['patrolStart.test.jsx', 'offlineWaypoints.test.js'],
      [
        'fieldManagement.test.jsx',
        'dataHooks.test.jsx',
        '-t',
        'patrol|waypoint|early termination|neither network nor local cache',
      ],
    ],
    backend: [
      [
        'tests/api.test.js',
        '-t',
        '^Patrol lifecycle|^offline waypoint retries',
      ],
    ],
  },
  4: {
    name: 'Community reporting',
    frontend: [
      [
        'communityReporting.test.jsx',
        'communityNotifications.test.jsx',
        'pdfExport.test.js',
      ],
      [
        'workflows.test.jsx',
        '-t',
        '^Public reporting|^Community report management',
      ],
    ],
    backend: [
      [
        'tests/api.test.js',
        '-t',
        '^Public community reporting and officer response',
      ],
    ],
  },
};

const member = process.argv[2];
const plan = plans[member];
if (!plan) {
  console.error('Usage: node scripts/test-member.mjs <1|2|3|4>');
  process.exit(1);
}
console.log(`Member ${member}: ${plan.name}`);
for (const [workspace, runs] of Object.entries({
  frontend: plan.frontend,
  backend: plan.backend,
})) {
  const runner =
    workspace === 'frontend'
      ? [fileURLToPath(new URL('node_modules/vitest/vitest.mjs', root)), 'run']
      : [
          '--experimental-vm-modules',
          fileURLToPath(new URL('node_modules/jest/bin/jest.js', root)),
          '--runInBand',
        ];
  for (const args of runs) {
    const selectedArgs = args.map((arg) =>
      workspace === 'frontend' && /\.test\.jsx?$/.test(arg)
        ? `src/test/${arg}`
        : arg,
    );
    console.log(`\nRunning ${workspace} tests: ${selectedArgs.join(' ')}`);
    const result = spawnSync(process.execPath, [...runner, ...selectedArgs], {
      cwd: fileURLToPath(new URL(`${workspace}/`, root)),
      stdio: 'inherit',
    });
    if (result.error) console.error(result.error.message);
    if (result.status !== 0) process.exit(result.status || 1);
  }
}
