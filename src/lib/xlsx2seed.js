const XLSX = require('xlsx');
const jsyaml = require('js-yaml');
const semver = require('semver');

class Xlsx2Seed {
  constructor(file) {
    this._book = XLSX.readFile(file);
  }

  get book() {
    return this._book;
  }

  get sheet_names() {
    return this._sheet_names
      || (this._sheet_names = this.book.SheetNames.filter(
        (sheet_name) => sheet_name.match(/^[A-Za-z0-9_.]+$/))
      );
  }

  sheet(sheet_name, config) {
    return new Xlsx2SeedSheet(sheet_name, this.book.Sheets[sheet_name], config);
  }
}

class Xlsx2SeedSheet {
  /**
   * @param {string} sheet_name
   * @param {Worksheet} sheet
   * @param {Object} [config]
   * @param {number} config.column_names_row
   * @param {number} config.data_start_row
   * @param {number} config.ignore_column_names
   * @param {number} config.version_column
   */
  constructor(sheet_name, sheet, config = {}) {
    this._sheet_name = sheet_name;
    this._sheet = sheet;
    const {
      column_names_row = 1,
      data_start_row = column_names_row + 1,
      ignore_columns = [],
      version_column = null,
    } = config;
    this._column_names_row = column_names_row;
    this._data_start_row = data_start_row;
    this._ignore_columns = ignore_columns;
    this._version_column = version_column;
    this._data = {};
    this._row_indexes = {};
  }

  get sheet_name() {
    return this._sheet_name;
  }

  get sheet() {
    return this._sheet;
  }

  get column_names_row() {
    return this._column_names_row;
  }

  get data_start_row() {
    return this._data_start_row;
  }

  get ignore_columns() {
    return this._ignore_columns;
  }

  get version_column() {
    return this._version_column;
  }

  get all_range() {
    return this._all_range || (this._all_range = XLSX.utils.decode_range(this.sheet['!ref']));
  }

  get max_column_index() {
    return this._max_column_index || (this._max_column_index = this.all_range.e.c);
  }

  get max_row_index() {
    return this._max_row_index || (this._max_row_index = this.all_range.e.r);
  }

  get column_names() {
    if (!this._column_names) this._set_column_info();
    return this._column_names;
  }

  get column_indexes() {
    if (!this._column_indexes) this._set_column_info();
    return this._column_indexes;
  }

  get version_column_index() {
    if (this.version_column && !this._version_column_index) this._set_column_info();
    return this._version_column_index;
  }

  row_indexes(require_version = '') {
    if (!this._row_indexes[require_version]) this._get_data(require_version);
    return this._row_indexes[require_version];
  }

  _set_column_info() {
    const column_names = [];
    const column_indexes = [];
    for (let column_index = 0; column_index <= this.max_column_index; ++column_index) {
      const address = XLSX.utils.encode_cell({c: column_index, r: this.column_names_row});
      const cell = this.sheet[address];
      const value = XLSX.utils.format_cell(cell);
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

  has_id_column() {
    return this.column_names.indexOf('id') !== -1;
  }

  sheet_column_index(column_name) {
    return this.column_indexes[this.column_names.indexOf(column_name)];
  }

  sheet_row_index(row_index, require_version = '') {
    return this.row_indexes(require_version)[row_index];
  }

  data(require_version = '') {
    if (!this._data[require_version]) this._get_data(require_version);
    return this._data[require_version];
  }

  _get_data(require_version = '') {
    const row_indexes = this._row_indexes[require_version] = [];
    const rows = [];
    const version_column_index = this.version_column_index;
    const require_version_range = `>= ${require_version}`;
    for (let row_index = this.data_start_row; row_index <= this.max_row_index; ++row_index) {
      if (version_column_index && require_version) { // version check
        const address = XLSX.utils.encode_cell({c: version_column_index, r: row_index});
        const cell = this.sheet[address];
        const value = XLSX.utils.format_cell(cell);
        try {
          if (value && !semver.satisfies(value, require_version_range)) {
            continue;
          }
        } catch (error) {
          throw new Xlsx2SeedVersionError(row_index, version_column_index, error);
        }
      }
      const row = [];
      rows.push(row);
      row_indexes.push(row_index);
      for (const column_index of this.column_indexes) {
        const address = XLSX.utils.encode_cell({c: column_index, r: row_index});
        const cell = this.sheet[address];
        const value = XLSX.utils.format_cell(cell);
        const use_value =
          value == null || !value.length ? null : // empty cell -> null
          cell.t === 'n' && value.match(/E\+\d+$/) && !isNaN(value) ? Number(cell.v) : // 1.00+E12 -> use raw value
          cell.t === 'n' && value.match(/,/) && !isNaN(cell.v) ? Number(cell.v) : // 1,000 -> use raw value
          isNaN(value) ? value.replace(/\\n/g, "\n").replace(/\r/g, "") : // "\\n" -> "\n" / delete "\r"
          Number(value);
        row.push(use_value);
      }
    }
    this._data[require_version] = new Xlsx2SeedData(this.sheet_name, this.column_names, rows);
  }
}

class Xlsx2SeedData {
  constructor(sheet_name, column_names, rows) {
    this._sheet_name = sheet_name;
    this._column_names = column_names;
    this._rows = rows;
  }

  get sheet_name() {
    return this._sheet_name;
  }

  get column_names() {
    return this._column_names;
  }

  get rows() {
    return this._rows;
  }

  as_key_based() {
    const records = {};
    for (const row of this.rows) {
      const record = {};
      row.forEach((value, index) => {
        const key = this.column_names[index];
        record[key] = value;
      });
      if (record.id) { // skip no id / id = 0
        records[`data${record.id}`] = record;
      }
    }
    return records;
  }

  as_separated_key_based(cut_prefix = 0, cut_postfix = 0) {
    const records = this.as_key_based();
    const separated_records = {};
    for (const key in records) {
      const record = records[key];
      const id = record.id.toString();
      const cut_id = id.slice(cut_prefix, id.length - cut_postfix);
      const cut_key = `data${cut_id}`;
      if (!separated_records[cut_key]) separated_records[cut_key] = {};
      separated_records[cut_key][key] = record;
    }
    return separated_records;
  }

  as_yaml() {
    return jsyaml.dump(this.as_key_based());
  }

  as_separated_yaml(cut_prefix = 0, cut_postfix = 0) {
    const separated_records = this.as_separated_key_based(cut_prefix, cut_postfix);
    const separated_yamls = {};
    for (const key in separated_records) {
      const records = separated_records[key];
      separated_yamls[key] = jsyaml.dump(records);
    }
    return separated_yamls;
  }

  write_as_yaml(directory, name = null, extension = '.yml') {
    const fso = require('fso');
    return fso.new(directory).new((name ? name : this.sheet_name) + extension)
      .writeFile(this.as_yaml());
  }

  write_as_yaml_sync(directory, name = null, extension = '.yml') {
    const fso = require('fso');
    fso.new(directory).new((name ? name : this.sheet_name) + extension)
      .writeFileSync(this.as_yaml());
  }

  write_as_separated_yaml(
    directory, cut_prefix = 0, cut_postfix = 0, name = null, extension = '.yml'
  ) {
    const separated_yamls = this.as_separated_yaml(cut_prefix, cut_postfix);
    const fso = require('fso');
    const dir = fso.new(directory).new(name ? name : this.sheet_name);
    return dir.exists().then((exists) => {
      if (!exists) dir.mkdirp();
    }).then(() => {
      const promises = [];
      for (const key in separated_yamls) {
        const yaml = separated_yamls[key];
        promises.push(dir.new(key + extension).writeFile(yaml));
      }
      return Promise.all(promises);
    });
  }

  write_as_separated_yaml_sync(
    directory, cut_prefix = 0, cut_postfix = 0, name = null, extension = '.yml'
  ) {
    const separated_yamls = this.as_separated_yaml(cut_prefix, cut_postfix);
    const fso = require('fso');
    const dir = fso.new(directory).new(name ? name : this.sheet_name);
    dir.mkdirpSync();
    for (const key in separated_yamls) {
      const yaml = separated_yamls[key];
      dir.new(key + extension).writeFileSync(yaml);
    }
  }

  write_as_single_or_separated_yaml(
    directory, cut_prefix = false, cut_postfix = false, name = null, extension = '.yml'
  ) {
    if (cut_prefix === false && cut_postfix === false) {
      return this.write_as_yaml(directory, name, extension);
    } else {
      return this.write_as_separated_yaml(
        directory, Number(cut_prefix), Number(cut_postfix), name, extension
      );
    }
  }

  write_as_single_or_separated_yaml_sync(
    directory, cut_prefix = false, cut_postfix = false, name = null, extension = '.yml'
  ) {
    if (cut_prefix === false && cut_postfix === false) {
      this.write_as_yaml_sync(directory, name, extension);
    } else {
      this.write_as_separated_yaml_sync(
        directory, Number(cut_prefix), Number(cut_postfix), name, extension
      );
    }
  }
}

class Xlsx2SeedVersionError extends Error {
  constructor(row_index, column_index, reason) {
    const address = XLSX.utils.encode_cell({c: column_index, r: row_index});
    super(`Version Compare Error at ${address} cell.\nreason:\n---\n${reason.stack}---\n`);
    this.row_index = row_index;
    this.column_index = column_index;
    this.reason = reason;
    this.address = address;
  }
}

module.exports = {Xlsx2Seed, Xlsx2SeedSheet, Xlsx2SeedData, Xlsx2SeedVersionError};
