'use strict';

if (typeof require !== 'undefined') {
  var assert = require('power-assert');
  const xlsx2seed = require('../src/lib/xlsx2seed');
  var Xlsx2Seed = xlsx2seed.Xlsx2Seed;
  var Xlsx2SeedSheet = xlsx2seed.Xlsx2SeedSheet;
  var Xlsx2SeedData = xlsx2seed.Xlsx2SeedData;
}

describe('Xlsx2SeedData', function() {
  lazy('sheet_name', () => 'sheet');
  lazy('column_names', () => ['id', 'col1', 'col2']);
  lazy('rows', () => [
    [1, 'c1-1', 'c2-1'],
    [2, 'c1-2', 'c2-2'],
    [0, 'no', 'no-2'],
  ]);
  lazy('data', function(){
    return new Xlsx2SeedData(this.sheet_name, this.column_names, this.rows)
  });

  describe('getetrs', () => {
    subject(function(){ return this.data; });

    it('sheet_name', function(){ assert(this.subject.sheet_name == this.sheet_name); });
    it('column_names', function(){ assert(this.subject.column_names == this.column_names); });
    it('rows', function(){ assert(this.subject.rows == this.rows); });
  });

  describe('as_key_based', () => {
    subject(function(){ return this.data.as_key_based(); });
    lazy('key_based', () => ({
      data1: { id: 1, col1: 'c1-1', col2: 'c2-1' },
      data2: { id: 2, col1: 'c1-2', col2: 'c2-2' },
    }));

    it('', function(){ assert.deepEqual(this.subject, this.key_based); });
  });
});
