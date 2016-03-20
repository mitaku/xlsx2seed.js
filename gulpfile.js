const path = require('path');
const gulp = require('gulp');
const rimraf = require('rimraf');
const $ = (require('gulp-load-plugins'))();
const isparta = require('isparta');

const files = {
  bin: {
    js: 'src/bin/**/*.js',
  },
  lib: {
    js: 'src/lib/**/*.js',
  },
  test: {
    js: 'test/**/*.js',
  },
  mock: {
    js: 'mock/**/*.js',
  },
  conf: {
    js: '*.js',
  },
  doc: 'doc/**/*',
};

const dirs = {
  src: 'src',
  dst: '.',
  doc: 'doc',
};

gulp.task('default', ['build']);

gulp.task('bin', function() {
  return gulp.src(files.bin.js, {base: dirs.src})
    .pipe($.sourcemaps.init())
    .pipe($.babel())
    .pipe($.header('#!/usr/bin/env node\n'))
//    .pipe($.uglify())
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest(dirs.dst));
});

gulp.task('lib', function() {
  return gulp.src(files.lib.js, {base: dirs.src})
    .pipe($.sourcemaps.init())
    .pipe($.babel())
    .pipe($.header(
      "if(typeof exports === 'undefined' && typeof window !== 'undefined')"
      + ' var exports = window;\n'
    ))
//    .pipe($.uglify())
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest(dirs.dst));
});

gulp.task('js', ['lib', 'bin']);

gulp.task('build', ['js', 'test', 'lint', 'doc']);

gulp.task('test', ['test-node']);

gulp.task('test-cli', ['test-node']);

gulp.task('pre-test', function() {
  return gulp.src(files.lib.js)
    .pipe($.istanbul({instrumenter: isparta.Instrumenter}))
    .pipe($.istanbul.hookRequire())
    .pipe(gulp.dest('test-tmp'));
});

gulp.task('test-node', ['pre-test'], function() {
  return gulp.src(files.test.js, {read: false})
    .pipe($.mocha())
    .pipe($.istanbul.writeReports());
});

gulp.task('lint', function() {
  return gulp.src(
    [files.bin.js, files.lib.js, files.test.js, files.mock.js, files.conf.js],
    {base: '.'}
  )
    .pipe($.eslint({useEslintrc: true}))
    .pipe($.eslint.format())
    .pipe($.eslint.failAfterError());
});

gulp.task('lint-fix', function() {
  return gulp.src(
    [files.bin.js, files.lib.js, files.test.js, files.mock.js, files.conf.js],
    {base: '.'}
  )
    .pipe($.eslint({useEslintrc: true, fix: true}))
    .pipe($.eslint.format())
    .pipe($.eslint.failAfterError())
    .pipe(gulp.dest('.'));
});

gulp.task('clean-doc', function(done) {
  return rimraf(files.doc, done);
});

gulp.task('doc', ['clean-doc'], function() {
  return gulp.src(dirs.src, {read: false, base: dirs.src})
    .pipe($.esdoc({destination: dirs.doc}));
});

gulp.task('watch', function() {
  gulp.start(['js', 'test-node', 'lint', 'doc']);
  return $.watch([files.bin.js, files.lib.js, files.test.js], function() {
    return gulp.start(['js', 'test-node', 'lint', 'doc']);
  });
});
