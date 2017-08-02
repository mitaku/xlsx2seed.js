#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var jsyaml = require('js-yaml');
var Xlsx2Seed = require('../lib/xlsx2seed').Xlsx2Seed;
var commander = require('commander');

var default_config_file = 'xlsx2seed.yml';

var program = commander.version(require('../package.json').version).arguments('<files...>').option('-S, --subdivide [sheet_name1:2,1:sheet_name2:2,2:sheet_name3,...]', 'subdivide rules', function (value) {
  return value.split(',');
}, []).option('-I, --ignore [sheet_name1,sheet_name2,...]', 'ignore sheet names', function (value) {
  return value.split(',');
}, []).option('-O, --only [sheet_name1,sheet_name2:2,...]', 'only sheet names', function (value) {
  return value.split(',');
}, []).option('-i, --input [path]', 'input directory', String, '.').option('-o, --output [path]', 'output directory', String, '.').option('-d, --stdout', 'output one sheets to stdout').option('-R, --require-version [version]', 'require version (with version column)', String, '').option('-v, --version-column [column_name]', 'version column', String, '').option('-n, --ignore-columns [column_name1,column_name2,...]', 'ignore columns', function (value) {
  return value.split(',');
}, []).option('-c, --config [path]', 'config file (default: xlsx2seed.yml)', String, '').option('-C, --config-content [yaml string]', 'config content', String, '').on('--help', function () {
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
}).parse(process.argv);

var files = program.args;
if (!files.length) program.help();

function get_config(program) {
  try {
    if (program.configContent) {
      return jsyaml.load(program.configContent);
    } else {
      if (program.config) {
        return jsyaml.load(fs.readFileSync(program.config, { encoding: 'utf8' }));
      } else if (fs.existsSync(default_config_file)) {
        return jsyaml.load(fs.readFileSync(default_config_file, { encoding: 'utf8' }));
      } else {
        return {};
      }
    }
  } catch (error) {
    console.error("load config failed!");
    console.error(error.toString());
    process.exit(1);
  }
}
var config = get_config(program);
if (program.versionColumn) config.version_column = program.versionColumn;
if (program.ignoreColumns) config.ignore_columns = program.ignoreColumns;

function sheet_name_subdivide_rule(sheet_name) {
  var result = sheet_name.match(/^(?:(\d+):)?(.+?)(?::(\d+))?$/);
  if (!result) throw new Error('[' + sheet_name + '] is wrong sheet name and subdivide rule definition');
  return {
    cut_prefix: result[1] ? Number(result[1]) : false,
    cut_postfix: result[3] ? Number(result[3]) : false,
    sheet_name: result[2]
  };
}

var ignore_sheets = {};
var _iteratorNormalCompletion = true;
var _didIteratorError = false;
var _iteratorError = undefined;

try {
  for (var _iterator = program.ignore.map(function (sheet_name) {
    return sheet_name_subdivide_rule(sheet_name);
  })[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
    var sheet = _step.value;

    ignore_sheets[sheet.sheet_name] = true;
  }
} catch (err) {
  _didIteratorError = true;
  _iteratorError = err;
} finally {
  try {
    if (!_iteratorNormalCompletion && _iterator.return) {
      _iterator.return();
    }
  } finally {
    if (_didIteratorError) {
      throw _iteratorError;
    }
  }
}

var subdivide_rules = {};

var only_sheets = program.only.length ? {} : null;
var _iteratorNormalCompletion2 = true;
var _didIteratorError2 = false;
var _iteratorError2 = undefined;

try {
  for (var _iterator2 = program.only.map(function (sheet_name) {
    return sheet_name_subdivide_rule(sheet_name);
  })[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
    var _sheet = _step2.value;

    only_sheets[_sheet.sheet_name] = true;
    subdivide_rules[_sheet.sheet_name] = _sheet;
  }
} catch (err) {
  _didIteratorError2 = true;
  _iteratorError2 = err;
} finally {
  try {
    if (!_iteratorNormalCompletion2 && _iterator2.return) {
      _iterator2.return();
    }
  } finally {
    if (_didIteratorError2) {
      throw _iteratorError2;
    }
  }
}

var _iteratorNormalCompletion3 = true;
var _didIteratorError3 = false;
var _iteratorError3 = undefined;

try {
  for (var _iterator3 = program.subdivide.map(function (sheet_name) {
    return sheet_name_subdivide_rule(sheet_name);
  })[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
    var _sheet2 = _step3.value;

    subdivide_rules[_sheet2.sheet_name] = _sheet2;
  }
} catch (err) {
  _didIteratorError3 = true;
  _iteratorError3 = err;
} finally {
  try {
    if (!_iteratorNormalCompletion3 && _iterator3.return) {
      _iterator3.return();
    }
  } finally {
    if (_didIteratorError3) {
      throw _iteratorError3;
    }
  }
}

var _console = {
  log: function log() {
    var _console2;

    if (!program.stdout) (_console2 = console).log.apply(_console2, arguments);
  },
  time: function log() {
    var _console3;

    if (!program.stdout) (_console3 = console).time.apply(_console3, arguments);
  },
  timeEnd: function log() {
    var _console4;

    if (!program.stdout) (_console4 = console).timeEnd.apply(_console4, arguments);
  }
};

_console.log('output-directory: ' + program.output);
_console.time('total');
var _iteratorNormalCompletion4 = true;
var _didIteratorError4 = false;
var _iteratorError4 = undefined;

try {
  for (var _iterator4 = files[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
    var file = _step4.value;

    var file_path = path.isAbsolute(file) ? file : path.join(program.input, file);
    _console.log(file + ':');
    _console.log('  full-path: ' + file_path);
    _console.time('  parsetime');
    var xlsx2seed = new Xlsx2Seed(file_path);
    _console.timeEnd('  parsetime');

    _console.log('  sheets:');
    var _iteratorNormalCompletion5 = true;
    var _didIteratorError5 = false;
    var _iteratorError5 = undefined;

    try {
      for (var _iterator5 = xlsx2seed.sheet_names[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
        var sheet_name = _step5.value;

        if (only_sheets && !only_sheets[sheet_name]) continue;
        _console.log('    ' + sheet_name + ':');
        if (ignore_sheets[sheet_name]) {
          _console.log('      ignore: skip');
          continue;
        }
        var _sheet3 = xlsx2seed.sheet(sheet_name, config);
        if (!_sheet3.has_id_column()) {
          _console.log('      warning: id column not found -> skip!');
          continue;
        }

        var _ref = subdivide_rules[sheet_name] || { cut_prefix: false, cut_postfix: false },
            cut_prefix = _ref.cut_prefix,
            cut_postfix = _ref.cut_postfix;

        if (cut_prefix !== false || cut_postfix !== false) _console.log('      subdivide: {cut_prefix: ' + Number(cut_prefix) + ', cut_postfix: ' + Number(cut_postfix) + '}');
        _console.time('      writetime');
        var data = _sheet3.data(program.requireVersion);
        if (program.stdout) {
          var output_data = {};
          output_data[sheet_name] = data.as_key_based();
          console.log(jsyaml.dump(output_data));
        } else {
          data.write_as_single_or_separated_yaml_sync(program.output, cut_prefix, cut_postfix);
        }
        _console.timeEnd('      writetime');
      }
    } catch (err) {
      _didIteratorError5 = true;
      _iteratorError5 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion5 && _iterator5.return) {
          _iterator5.return();
        }
      } finally {
        if (_didIteratorError5) {
          throw _iteratorError5;
        }
      }
    }
  }
} catch (err) {
  _didIteratorError4 = true;
  _iteratorError4 = err;
} finally {
  try {
    if (!_iteratorNormalCompletion4 && _iterator4.return) {
      _iterator4.return();
    }
  } finally {
    if (_didIteratorError4) {
      throw _iteratorError4;
    }
  }
}

_console.timeEnd('total');
//# sourceMappingURL=xlsx2seed.js.map
