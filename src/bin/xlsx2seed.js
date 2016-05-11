const fs = require('fs');
const path = require('path');
const jsyaml = require('js-yaml');
const Xlsx2Seed = require('../lib/xlsx2seed').Xlsx2Seed;
const commander = require('commander');

const default_config_file = 'xlsx2seed.yml';

const program = commander
  .version(require('../package.json').version)
  .arguments('<files...>')
  .option('-S, --subdivide [sheet_name1:2,1:sheet_name2:2,2:sheet_name3,...]', 'subdivide rules', (value) => value.split(','), [])
  .option('-I, --ignore [sheet_name1,sheet_name2,...]', 'ignore sheet names', (value) => value.split(','), [])
  .option('-O, --only [sheet_name1,sheet_name2:2,...]', 'only sheet names', (value) => value.split(','), [])
  .option('-i, --input [path]', 'input directory', String, '.')
  .option('-o, --output [path]', 'output directory', String, '.')
  .option('-d, --stdout', 'output one sheets to stdout')
  .option('-c, --config [path]', 'config file (default: xlsx2seed.yml)', String, '')
  .option('-C, --config-content [yaml string]', 'config content', String, '')
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
    console.log('    # column names row is 3 (2 in zero origin)');
    console.log('    $ xlsx2seed hoge.xlsx huga.xlsx -C "column_names_row: 2"');
    console.log('');
  })
  .parse(process.argv);

const files = program.args;
if (!files.length) program.help();

function get_config(program) {
  try {
    if (program.configContent) {
      return jsyaml.load(program.configContent);
    } else {
      if (program.config) {
        return jsyaml.load(fs.readFileSync(program.config, {encoding: 'utf8'}));
      } else if (fs.existsSync(default_config_file)) {
        return jsyaml.load(fs.readFileSync(default_config_file, {encoding: 'utf8'}));
      } else {
        return;
      }
    }
  } catch(error) {
    console.error("load config failed!");
    console.error(error.toString());
    process.exit(1);
  }
}
const config = get_config(program);

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

const _console = {
  log: function log(...args) {
    if (!program.stdout) console.log(...args);
  },
  time: function log(...args) {
    if (!program.stdout) console.time(...args);
  },
  timeEnd: function log(...args) {
    if (!program.stdout) console.timeEnd(...args);
  },
};

_console.log(`output-directory: ${program.output}`);
_console.time(`total`);
for (const file of files) {
  const file_path = path.isAbsolute(file) ? file : path.join(program.input, file);
  _console.log(`${file}:`);
  _console.log(`  full-path: ${file_path}`);
  _console.time(`  parsetime`);
  const xlsx2seed = new Xlsx2Seed(file_path);
  _console.timeEnd(`  parsetime`);

  _console.log(`  sheets:`);
  for (const sheet_name of xlsx2seed.sheet_names) {
    if (only_sheets && !only_sheets[sheet_name]) continue;
    _console.log(`    ${sheet_name}:`);
    if (ignore_sheets[sheet_name]) {
      _console.log(`      ignore: skip`);
      continue;
    }
    const sheet = xlsx2seed.sheet(sheet_name, config);
    if (!sheet.has_id_column()) {
      _console.log(`      warning: id column not found -> skip!`);
      continue;
    }
    const {cut_prefix, cut_postfix} = subdivide_rules[sheet_name] || {cut_prefix: false, cut_postfix: false};
    if (cut_prefix !== false || cut_postfix !== false)
      _console.log(`      subdivide: {cut_prefix: ${Number(cut_prefix)}, cut_postfix: ${Number(cut_postfix)}}`);
    _console.time(`      writetime`);
    const data = sheet.data;
    if (program.stdout) {
      const output_data = {};
      output_data[sheet_name] = data.as_key_based();
      console.log(jsyaml.dump(output_data));
    } else {
      data.write_as_single_or_separated_yaml_sync(program.output, cut_prefix, cut_postfix);
    }
    _console.timeEnd(`      writetime`);
  }
}
_console.timeEnd(`total`);
