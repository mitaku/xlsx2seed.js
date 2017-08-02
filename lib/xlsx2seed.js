if(typeof exports === 'undefined' && typeof window !== 'undefined') var exports = window;
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var XLSX = require('xlsx');
var jsyaml = require('js-yaml');
var semver = require('semver');

var Xlsx2Seed = function () {
  function Xlsx2Seed(file) {
    _classCallCheck(this, Xlsx2Seed);

    this._book = XLSX.readFile(file);
  }

  _createClass(Xlsx2Seed, [{
    key: 'sheet',
    value: function sheet(sheet_name, config) {
      return new Xlsx2SeedSheet(sheet_name, this.book.Sheets[sheet_name], config);
    }
  }, {
    key: 'book',
    get: function get() {
      return this._book;
    }
  }, {
    key: 'sheet_names',
    get: function get() {
      return this._sheet_names || (this._sheet_names = this.book.SheetNames.filter(function (sheet_name) {
        return sheet_name.match(/^[A-Za-z0-9_.]+$/);
      }));
    }
  }]);

  return Xlsx2Seed;
}();

var Xlsx2SeedSheet = function () {
  /**
   * @param {string} sheet_name
   * @param {Worksheet} sheet
   * @param {Object} [config]
   * @param {number} config.column_names_row
   * @param {number} config.data_start_row
   * @param {number} config.ignore_column_names
   * @param {number} config.version_column
   */
  function Xlsx2SeedSheet(sheet_name, sheet) {
    var config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    _classCallCheck(this, Xlsx2SeedSheet);

    this._sheet_name = sheet_name;
    this._sheet = sheet;
    var _config$column_names_ = config.column_names_row,
        column_names_row = _config$column_names_ === undefined ? 1 : _config$column_names_,
        _config$data_start_ro = config.data_start_row,
        data_start_row = _config$data_start_ro === undefined ? column_names_row + 1 : _config$data_start_ro,
        _config$ignore_column = config.ignore_columns,
        ignore_columns = _config$ignore_column === undefined ? [] : _config$ignore_column,
        _config$version_colum = config.version_column,
        version_column = _config$version_colum === undefined ? null : _config$version_colum;

    this._column_names_row = column_names_row;
    this._data_start_row = data_start_row;
    this._ignore_columns = ignore_columns;
    this._version_column = version_column;
    this._data = {};
    this._row_indexes = {};
  }

  _createClass(Xlsx2SeedSheet, [{
    key: 'row_indexes',
    value: function row_indexes() {
      var require_version = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

      if (!this._row_indexes[require_version]) this._get_data(require_version);
      return this._row_indexes[require_version];
    }
  }, {
    key: '_set_column_info',
    value: function _set_column_info() {
      var column_names = [];
      var column_indexes = [];
      for (var column_index = 0; column_index <= this.max_column_index; ++column_index) {
        var address = XLSX.utils.encode_cell({ c: column_index, r: this.column_names_row });
        var cell = this.sheet[address];
        var value = XLSX.utils.format_cell(cell);
        if (!value.length) break;
        if (this.version_column && value === this.version_column) {
          this._version_column_index = column_index;
        } else if (this.ignore_columns.indexOf(value) === -1) {
          column_names.push(value);
          column_indexes.push(column_index);
        }
      }
      this._column_names = column_names;
      this._column_indexes = column_indexes;
    }
  }, {
    key: 'has_id_column',
    value: function has_id_column() {
      return this.column_names.indexOf('id') !== -1;
    }
  }, {
    key: 'sheet_column_index',
    value: function sheet_column_index(column_name) {
      return this.column_indexes[this.column_names.indexOf(column_name)];
    }
  }, {
    key: 'sheet_row_index',
    value: function sheet_row_index(row_index) {
      var require_version = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

      return this.row_indexes(require_version)[row_index];
    }
  }, {
    key: 'data',
    value: function data() {
      var require_version = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

      if (!this._data[require_version]) this._get_data(require_version);
      return this._data[require_version];
    }
  }, {
    key: '_get_data',
    value: function _get_data() {
      var require_version = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

      var row_indexes = this._row_indexes[require_version] = [];
      var rows = [];
      var version_column_index = this.version_column_index;
      var require_version_range = '<= ' + require_version;
      for (var row_index = this.data_start_row; row_index <= this.max_row_index; ++row_index) {
        if (version_column_index && require_version) {
          // version check
          var address = XLSX.utils.encode_cell({ c: version_column_index, r: row_index });
          var cell = this.sheet[address];
          var value = XLSX.utils.format_cell(cell);
          try {
            if (value && !semver.satisfies(value, require_version_range)) {
              continue;
            }
          } catch (error) {
            throw new Xlsx2SeedVersionError(row_index, version_column_index, error);
          }
        }
        var row = [];
        rows.push(row);
        row_indexes.push(row_index);
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = this.column_indexes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var column_index = _step.value;

            var _address = XLSX.utils.encode_cell({ c: column_index, r: row_index });
            var _cell = this.sheet[_address];
            var _value = XLSX.utils.format_cell(_cell);
            var use_value = _value == null || !_value.length ? null : // empty cell -> null
            _cell.t === 'n' && _value.match(/E\+\d+$/) && !isNaN(_value) ? Number(_cell.v) : // 1.00+E12 -> use raw value
            _cell.t === 'n' && _value.match(/,/) && !isNaN(_cell.v) ? Number(_cell.v) : // 1,000 -> use raw value
            isNaN(_value) ? _value.replace(/\\n/g, "\n").replace(/\r/g, "") : // "\\n" -> "\n" / delete "\r"
            Number(_value);
            row.push(use_value);
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
      }
      this._data[require_version] = new Xlsx2SeedData(this.sheet_name, this.column_names, rows);
    }
  }, {
    key: 'sheet_name',
    get: function get() {
      return this._sheet_name;
    }
  }, {
    key: 'sheet',
    get: function get() {
      return this._sheet;
    }
  }, {
    key: 'column_names_row',
    get: function get() {
      return this._column_names_row;
    }
  }, {
    key: 'data_start_row',
    get: function get() {
      return this._data_start_row;
    }
  }, {
    key: 'ignore_columns',
    get: function get() {
      return this._ignore_columns;
    }
  }, {
    key: 'version_column',
    get: function get() {
      return this._version_column;
    }
  }, {
    key: 'all_range',
    get: function get() {
      return this._all_range || (this._all_range = XLSX.utils.decode_range(this.sheet['!ref']));
    }
  }, {
    key: 'max_column_index',
    get: function get() {
      return this._max_column_index || (this._max_column_index = this.all_range.e.c);
    }
  }, {
    key: 'max_row_index',
    get: function get() {
      return this._max_row_index || (this._max_row_index = this.all_range.e.r);
    }
  }, {
    key: 'column_names',
    get: function get() {
      if (!this._column_names) this._set_column_info();
      return this._column_names;
    }
  }, {
    key: 'column_indexes',
    get: function get() {
      if (!this._column_indexes) this._set_column_info();
      return this._column_indexes;
    }
  }, {
    key: 'version_column_index',
    get: function get() {
      if (this.version_column && !this._version_column_index) this._set_column_info();
      return this._version_column_index;
    }
  }]);

  return Xlsx2SeedSheet;
}();

var Xlsx2SeedData = function () {
  function Xlsx2SeedData(sheet_name, column_names, rows) {
    _classCallCheck(this, Xlsx2SeedData);

    this._sheet_name = sheet_name;
    this._column_names = column_names;
    this._rows = rows;
  }

  _createClass(Xlsx2SeedData, [{
    key: 'as_key_based',
    value: function as_key_based() {
      var _this = this;

      var records = {};
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        var _loop = function _loop() {
          var row = _step2.value;

          var record = {};
          row.forEach(function (value, index) {
            var key = _this.column_names[index];
            record[key] = value;
          });
          if (record.id) {
            // skip no id / id = 0
            records['data' + record.id] = record;
          }
        };

        for (var _iterator2 = this.rows[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          _loop();
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

      return records;
    }
  }, {
    key: 'as_separated_key_based',
    value: function as_separated_key_based() {
      var cut_prefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
      var cut_postfix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

      var records = this.as_key_based();
      var separated_records = {};
      for (var key in records) {
        var _record = records[key];
        var id = _record.id.toString();
        var cut_id = id.slice(cut_prefix, id.length - cut_postfix);
        var cut_key = 'data' + cut_id;
        if (!separated_records[cut_key]) separated_records[cut_key] = {};
        separated_records[cut_key][key] = _record;
      }
      return separated_records;
    }
  }, {
    key: 'as_yaml',
    value: function as_yaml() {
      return jsyaml.dump(this.as_key_based());
    }
  }, {
    key: 'as_separated_yaml',
    value: function as_separated_yaml() {
      var cut_prefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
      var cut_postfix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

      var separated_records = this.as_separated_key_based(cut_prefix, cut_postfix);
      var separated_yamls = {};
      for (var key in separated_records) {
        var records = separated_records[key];
        separated_yamls[key] = jsyaml.dump(records);
      }
      return separated_yamls;
    }
  }, {
    key: 'write_as_yaml',
    value: function write_as_yaml(directory) {
      var name = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      var extension = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '.yml';

      var fso = require('fso');
      return fso.new(directory).new((name ? name : this.sheet_name) + extension).writeFile(this.as_yaml());
    }
  }, {
    key: 'write_as_yaml_sync',
    value: function write_as_yaml_sync(directory) {
      var name = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      var extension = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '.yml';

      var fso = require('fso');
      fso.new(directory).new((name ? name : this.sheet_name) + extension).writeFileSync(this.as_yaml());
    }
  }, {
    key: 'write_as_separated_yaml',
    value: function write_as_separated_yaml(directory) {
      var cut_prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      var cut_postfix = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
      var name = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
      var extension = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : '.yml';

      var separated_yamls = this.as_separated_yaml(cut_prefix, cut_postfix);
      var fso = require('fso');
      var dir = fso.new(directory).new(name ? name : this.sheet_name);
      return dir.exists().then(function (exists) {
        if (!exists) dir.mkdirp();
      }).then(function () {
        var promises = [];
        for (var key in separated_yamls) {
          var yaml = separated_yamls[key];
          promises.push(dir.new(key + extension).writeFile(yaml));
        }
        return Promise.all(promises);
      });
    }
  }, {
    key: 'write_as_separated_yaml_sync',
    value: function write_as_separated_yaml_sync(directory) {
      var cut_prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      var cut_postfix = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
      var name = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
      var extension = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : '.yml';

      var separated_yamls = this.as_separated_yaml(cut_prefix, cut_postfix);
      var fso = require('fso');
      var dir = fso.new(directory).new(name ? name : this.sheet_name);
      dir.mkdirpSync();
      for (var key in separated_yamls) {
        var yaml = separated_yamls[key];
        dir.new(key + extension).writeFileSync(yaml);
      }
    }
  }, {
    key: 'write_as_single_or_separated_yaml',
    value: function write_as_single_or_separated_yaml(directory) {
      var cut_prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var cut_postfix = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var name = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
      var extension = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : '.yml';

      if (cut_prefix === false && cut_postfix === false) {
        return this.write_as_yaml(directory, name, extension);
      } else {
        return this.write_as_separated_yaml(directory, Number(cut_prefix), Number(cut_postfix), name, extension);
      }
    }
  }, {
    key: 'write_as_single_or_separated_yaml_sync',
    value: function write_as_single_or_separated_yaml_sync(directory) {
      var cut_prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var cut_postfix = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var name = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
      var extension = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : '.yml';

      if (cut_prefix === false && cut_postfix === false) {
        this.write_as_yaml_sync(directory, name, extension);
      } else {
        this.write_as_separated_yaml_sync(directory, Number(cut_prefix), Number(cut_postfix), name, extension);
      }
    }
  }, {
    key: 'sheet_name',
    get: function get() {
      return this._sheet_name;
    }
  }, {
    key: 'column_names',
    get: function get() {
      return this._column_names;
    }
  }, {
    key: 'rows',
    get: function get() {
      return this._rows;
    }
  }]);

  return Xlsx2SeedData;
}();

var Xlsx2SeedVersionError = function (_Error) {
  _inherits(Xlsx2SeedVersionError, _Error);

  function Xlsx2SeedVersionError(row_index, column_index, reason) {
    _classCallCheck(this, Xlsx2SeedVersionError);

    var address = XLSX.utils.encode_cell({ c: column_index, r: row_index });

    var _this2 = _possibleConstructorReturn(this, (Xlsx2SeedVersionError.__proto__ || Object.getPrototypeOf(Xlsx2SeedVersionError)).call(this, 'Version Compare Error at ' + address + ' cell.\nreason:\n---\n' + reason.stack + '---\n'));

    _this2.row_index = row_index;
    _this2.column_index = column_index;
    _this2.reason = reason;
    _this2.address = address;
    return _this2;
  }

  return Xlsx2SeedVersionError;
}(Error);

module.exports = { Xlsx2Seed: Xlsx2Seed, Xlsx2SeedSheet: Xlsx2SeedSheet, Xlsx2SeedData: Xlsx2SeedData, Xlsx2SeedVersionError: Xlsx2SeedVersionError };
//# sourceMappingURL=xlsx2seed.js.map
