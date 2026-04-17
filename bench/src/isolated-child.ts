// Child process: load one adapter by module path, run the suite, emit a
// single line of JSON for the parent to collect.

import { runSuite } from './runner.ts';

async function main() {
  const mod = process.argv[2];
  if (!mod) throw new Error('usage: isolated-child <adapter-module>');

  const adapter = await import(mod);
  if (
    typeof adapter.label !== 'string' ||
    typeof adapter.build !== 'function' ||
    typeof adapter.run !== 'function'
  ) {
    throw new Error(`adapter ${mod} must export { label, build, run }`);
  }

  const rows = await runSuite(adapter as Parameters<typeof runSuite>[0]);
  process.stdout.write('ROWS:' + JSON.stringify(rows) + '\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
