/* eslint-env node, es6 */
var fs = require('fs');
var jsonLogic = require('../logic.js');
var QUnit = require('qunitjs');

var parse_and_iterate = function(local_file, description, runner) {
  fs.readFile(local_file, 'utf8', function(error, body) {
    var tests;
    try {
      tests = JSON.parse(body);
    } catch (e) {
      throw new Error(`Trouble parsing ${description}: ${e.message}`);
    }

    // Remove comments
    tests = tests.filter(function(test) {
      return typeof test !== 'string';
    });

    console.log(`Including ${tests.length} description`);

    QUnit.test(description, function() {
      tests.map(runner);
    });
  });
};

function basic_test(test) {
  var rule = test[0];
  var data = test[1];
  var expected = test[2];

  QUnit.assert.deepEqual(
    jsonLogic.apply(rule, data),
    expected,
    `jsonLogic.apply(${JSON.stringify(rule)},${JSON.stringify(data)}) === ${JSON.stringify(expected)}`
  );
}

parse_and_iterate('tests.json', 'applies() tests', basic_test);
parse_and_iterate('onsign_op.json', 'onsign_op() tests', basic_test);
parse_and_iterate('onsign_extra.json', 'onsign_extra() tests', basic_test);

QUnit.test('Bad operator', function(assert) {
  assert.throws(function() {
    jsonLogic.apply({ fubar: [] });
  }, /Unrecognized operation/);
});

QUnit.test('edge cases', function(assert) {
  assert.equal(jsonLogic.apply(), undefined, 'Called with no arguments');
});

QUnit.test('Expanding functionality with method', function(assert) {
  // Data contains a real object with methods and local state
  var a = {
    count: 0,
    increment: function() {
      return (this.count += 1);
    },
    add: function(b) {
      return (this.count += b);
    }
  };

  // Look up "a" in data, and run the increment method on it with no args.
  assert.equal(
    jsonLogic.apply({ method: [{ var: 'a' }, 'increment'] }, { a: a }),
    1 // Happy return value
  );
  assert.equal(a.count, 1); // Happy state change

  // Run the add method with an argument
  assert.equal(
    jsonLogic.apply({ method: [{ var: 'a' }, 'add', [41]] }, { a: a }),
    42 // Happy return value
  );
  assert.equal(a.count, 42); // Happy state change
});
