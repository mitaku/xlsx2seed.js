const path = require('path');
const Xlsx2Seed = require('../lib/xlsx2seed').Xlsx2Seed;
const commander = require('commander');

const program = commander
  .version(require('../package.json').version)
  .arguments('<files...>')
  .option('-S, --subdivide [sheet_name1:2,1:sheet_name2:2,2:sheet_name3,...]', 'subdivide rules', (value) => value.split(','), [])
  .option('-I, --ignore [sheet_name1,sheet_name2,...]', 'ignore sheet names', (value) => value.split(','), [])
  .option('-O, --only [sheet_name1,sheet_name2:2,...]', 'only sheet names', (value) => value.split(','), [])
  .option('-i, --input [path]', 'input directory', String, '.')
  .option('-o, --output [path]', 'output directory', String, '.')
  .on('--help', () => {
    console.log('  Examples:');
    console.log('');
    console.log('    # multiple files');
    console.log('    $ xlsx2seed -i /path/to/src -o /path/to/dst hoge.xlsx huga.xlsx');
    console.log('');
    console.log('    # only foo and bar sheets / bar subdivide postfix 2');
    console.log('    $ xlsx2seed hoge.xlsx huga.xlsx -O foo,bar:2');
    console.log('');
    console.log('    # foo subdivide prefix 1 / bar subdivide postfix 2 / baz subdivide prefix 1 and postfix 2');
    console.log('    $ xlsx2seed hoge.xlsx huga.xlsx -S 2:foo,bar:2,1:baz:2');
    console.log('');
  })
  .parse(process.argv);

const files = program.args;
if (!files.length) program.help();

function sheet_name_subdivide_rule(sheet_name) {
  const result = sheet_name.match(/^(?:(\d+):)?(.+?)(?::(\d+))?$/);
  if (!result) throw new Error(`[${sheet_name}] is wrong sheet name and subdivide rule definition`);
  return {
    cut_prefix: result[1] ? Number(result[1]) : false,
    cut_postfix: result[3] ? Number(result[3]) : false,
    sheet_name: result[2],
  };
}

const ignore_sheets = {};
for (const sheet of program.ignore.map((sheet_name) => sheet_name_subdivide_rule(sheet_name))) {
  ignore_sheets[sheet.sheet_name] = true;
}

const subdivide_rules = {};

const only_sheets = program.only.length ? {} : null;
for (const sheet of program.only.map((sheet_name) => sheet_name_subdivide_rule(sheet_name))) {
  only_sheets[sheet.sheet_name] = true;
  subdivide_rules[sheet.sheet_name] = sheet;
}

for (const sheet of program.subdivide.map((sheet_name) => sheet_name_subdivide_rule(sheet_name))) {
  subdivide_rules[sheet.sheet_name] = sheet;
}

console.log(`output-directory: ${program.output}`);
for (const file of files) {
  const file_path = path.isAbsolute(file) ? file : path.join(program.input, file);
  console.log(`${file}:`);
  console.log(`  full-path:   ${file_path}`);
  console.log(`  parse-start: ${new Date()}`);
  const xlsx2seed = new Xlsx2Seed(file_path);
  console.log(`  parse-end:   ${new Date()}`);

  console.log(`  sheets:`);
  for (const sheet_name of xlsx2seed.sheet_names) {
    if (only_sheets && !only_sheets[sheet_name]) continue;
    console.log(`    ${sheet_name}:`);
    if (ignore_sheets[sheet_name]) {
      console.log(`      ignore: skip`);
      continue;
    }
    const sheet = xlsx2seed.sheet(sheet_name);
    if (!sheet.has_id_column()) {
      console.log(`      warning: id column not found -> skip!`);
      continue;
    }
    const {cut_prefix, cut_postfix} = subdivide_rules[sheet_name] || {cut_prefix: false, cut_postfix: false};
    if (cut_prefix !== false || cut_postfix !== false)
      console.log(`      subdivide: {cut_prefix: ${Number(cut_prefix)}, cut_postfix: ${Number(cut_postfix)}}`);
    console.log(`      get-start: ${new Date()}`);
    const data = sheet.data;
    // console.log(`      get-end:   ${new Date()}`);
    data.write_as_single_or_separated_yaml_sync(program.output, cut_prefix, cut_postfix);
    console.log(`      write-end: ${new Date()}`);
  }
}
