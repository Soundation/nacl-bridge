'use strict';

module.exports = function (grunt) {

  grunt.initConfig({

    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        eqnull: true,
        browser: true,
        globals: {
          jQuery: true
        }
      },
      files: ['nacl-bridge.js']
    },

    karma: {
      unit: {
        configFile: 'karma.conf.js',
      },
      //continuous integration mode: run tests once in PhantomJS browser.
      continuous: {
        configFile: 'karma.conf.js',
        singleRun: true,
        browsers: ['PhantomJS']
      },
    },

    watch: {
      scripts: {
        files: ['nacl-bridge.js'],
        tasks: ['jshint'],
        options: {
          spawn: false
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-karma');

  grunt.registerTask('default', ['jshint', 'karma:unit']);

};