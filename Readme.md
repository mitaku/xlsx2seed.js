# [xlsx2seed.js](https://github.com/Narazaka/xlsx2seed.js)

[![npm](https://img.shields.io/npm/v/xlsx2seed.svg)](https://www.npmjs.com/package/xlsx2seed)
[![npm license](https://img.shields.io/npm/l/xlsx2seed.svg)](https://www.npmjs.com/package/xlsx2seed)
[![npm download total](https://img.shields.io/npm/dt/xlsx2seed.svg)](https://www.npmjs.com/package/xlsx2seed)
[![npm download by month](https://img.shields.io/npm/dm/xlsx2seed.svg)](https://www.npmjs.com/package/xlsx2seed)
[![Bower](https://img.shields.io/bower/v/xlsx2seed.svg)](https://github.com/Narazaka/xlsx2seed.js)
[![Bower](https://img.shields.io/bower/l/xlsx2seed.svg)](https://github.com/Narazaka/xlsx2seed.js)

[![Dependency Status](https://david-dm.org/Narazaka/xlsx2seed.js.svg)](https://david-dm.org/Narazaka/xlsx2seed.js)
[![devDependency Status](https://david-dm.org/Narazaka/xlsx2seed.js/dev-status.svg)](https://david-dm.org/Narazaka/xlsx2seed.js#info=devDependencies)
[![Build Status](https://travis-ci.org/Narazaka/xlsx2seed.js.svg)](https://travis-ci.org/Narazaka/xlsx2seed.js)
[![codecov.io](https://codecov.io/github/Narazaka/xlsx2seed.js/coverage.svg?branch=master)](https://codecov.io/github/Narazaka/xlsx2seed.js?branch=master)
[![Code Climate](https://codeclimate.com/github/Narazaka/xlsx2seed.js/badges/gpa.svg)](https://codeclimate.com/github/Narazaka/xlsx2seed.js)

xlsx to seed yamls

## Install

npm:
```
npm install xlsx2seed
```

## Usage

```
$ xlsx2seed

  Usage: xlsx2seed [options] <files...>

  Options:

    -h, --help                                                        output usage information
    -V, --version                                                     output the version number
    -S,--subdivide [sheet_name1:2,1:sheet_name2:2,2:sheet_name3,...]  subdivide rules
    -I,--ignore [sheet_name1,sheet_name2,...]                         ignore sheet names
    -O,--only [sheet_name1,sheet_name2:2,...]                         only sheet names
    -i,--input [path]                                                 input directory
    -o,--output [path]                                                output directory

  Examples:

    # multiple files
    $ xlsx2seed -i /path/to/src -o /path/to/dst hoge.xlsx huga.xlsx

    # only foo and bar sheets / bar subdivide postfix 2
    $ xlsx2seed hoge.xlsx huga.xlsx -O foo,bar:2

    # foo subdivide prefix 1 / bar subdivide postfix 2 / baz subdivide prefix 1 and postfix 2
    $ xlsx2seed hoge.xlsx huga.xlsx -S 2:foo,bar:2,1:baz:2
```

## License

This is released under [MIT License](http://narazaka.net/license/MIT?2015).
