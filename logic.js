/* globals define,module */
/*
Using a Universal Module Loader that should be browser, require, and AMD friendly
http://ricostacruz.com/cheatsheets/umdjs.html
*/
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.jsonLogic = factory();
  }
})(this, function() {
  'use strict';
  if (!Array.isArray) {
    Array.isArray = function(arg) {
      return Object.prototype.toString.call(arg) === '[object Array]';
    };
  }

  var jsonLogic = {};
  var operations = {
    '==': function(a, b) {
      return a == b;
    },
    '===': function(a, b) {
      return a === b;
    },
    '!=': function(a, b) {
      return a != b;
    },
    '!==': function(a, b) {
      return a !== b;
    },
    '>': function(a, b) {
      if (b === null) return false;
      return a > b;
    },
    '>=': function(a, b) {
      if (b === null) return false;
      return a >= b;
    },
    '<': function(a, b, c) {
      if (a === null) return false;
      return c === undefined ? a < b : a < b && b < c;
    },
    '<=': function(a, b, c) {
      if (a === null) return false;
      return c === undefined ? a <= b : a <= b && b <= c;
    },
    '!!': function(a) {
      return truthy(a);
    },
    '!': function(a) {
      return !truthy(a);
    },
    '%': function(a, b) {
      if (b === null) return 0;
      return a % b;
    },
    in: function(a, b) {
      if (!b || typeof b.indexOf === 'undefined') return false;
      return b.indexOf(a) !== -1;
    },
    cat: function() {
      return Array.prototype.join.call(arguments, '');
    },
    substr: function(source, start, end) {
      if (end < 0) {
        // JavaScript doesn't support negative end, this emulates PHP behavior
        var temp = String(source).substr(start);
        return temp.substr(0, temp.length + end);
      }
      return String(source).substr(start, end);
    },
    '+': function() {
      return Array.prototype.reduce.call(
        arguments,
        function(a, b) {
          return parseFloat(+a, 10) + parseFloat(+b, 10);
        },
        0
      );
    },
    '*': function() {
      return Array.prototype.reduce.call(arguments, function(a, b) {
        return parseFloat(+a, 10) * parseFloat(+b, 10);
      });
    },
    '-': function() {
      return Array.prototype.reduce.call(arguments, function(a, b) {
        return parseFloat(+a, 10) - parseFloat(+b, 10);
      });
    },
    '/': function() {
      return Array.prototype.reduce.call(arguments, function(a, b) {
        if (b === null) return 0;
        return parseFloat(+a, 10) / parseFloat(+b, 10);
      });
    },
    min: function() {
      return Math.min.apply(this, arguments);
    },
    max: function() {
      return Math.max.apply(this, arguments);
    },
    merge: function() {
      return Array.prototype.reduce.call(
        arguments,
        function(a, b) {
          return a.concat(b);
        },
        []
      );
    },
    var: function(a, b) {
      var not_found = b === undefined ? null : b;
      var data = this;
      if (typeof a === 'undefined' || a === '' || a === null) {
        return data;
      }
      var sub_props = String(a).split('.');
      for (var i = 0; i < sub_props.length; i++) {
        if (data === null) {
          return not_found;
        }
        // Descending into data
        data = data[sub_props[i]];
        if (data === undefined) {
          return not_found;
        }
      }
      return data;
    },
    missing: function() {
      /*
      Missing can receive many keys as many arguments, like {"missing:[1,2]}
      Missing can also receive *one* argument that is an array of keys,
      which typically happens if it's actually acting on the output of another command
      (like 'if' or 'merge')
      */

      var missing = [];
      var keys = Array.isArray(arguments[0]) ? arguments[0] : arguments;

      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = jsonLogic.apply({ var: key }, this);
        if (value === null || value === '') {
          missing.push(key);
        }
      }

      return missing;
    },
    missing_some: function(need_count, options) {
      // missing_some takes two arguments, how many (minimum) items must be present, and an array of keys (just like 'missing') to check for presence.
      var are_missing = jsonLogic.apply({ missing: options }, this);

      if (options.length - are_missing.length >= need_count) {
        return [];
      } else {
        return are_missing;
      }
    },
    method: function(obj, method, args) {
      return obj[method].apply(obj, args);
    },
    // OnSign TV specific operators
    '><': function(loc, region) {
      // Checks if a coordinate is inside a georegion object
      if (loc === null || region === null) return false;
      if (region.path) {
        return isWithinPolygon(loc, region);
      } else {
        return isWithinCircle(loc, region);
      }
    },
    '*=': function(a, b) {
      // Startswith
      if (a === null || b === null) return false;
      return a.substr(0, b.length) === b;
    },
    '=*': function(a, b) {
      // Endswith
      if (a === null || b === null) return false;
      return a.substr(-b.length, b.length) === b;
    },
    '>t<': function(point, rect, refs) {
      // Checks if a point happens withing a rectangle, optionally distorted by refs.
      if (!(Array.isArray(point) && point.length === 2)) return false;
      if (!(Array.isArray(rect) && rect.length === 4)) return false;

      if (refs === undefined) {
        return (
          point[0] >= rect[0] && point[0] <= rect[0] + rect[2] && point[1] >= rect[1] && point[1] <= rect[1] + rect[3]
        );
      } else if (Array.isArray(refs)) {
        for (var i = 0; i < refs.length; i++) {
          var ref_rect = refs[i].rect;
          if (Array.isArray(ref_rect) && ref_rect.length === 4) {
            var x = ref_rect[0] + (ref_rect[0] * rect[0]) / 100000;
            var y = ref_rect[1] + (ref_rect[1] * rect[1]) / 100000;
            var w = (ref_rect[2] * rect[2]) / 100000;
            var h = (ref_rect[3] * rect[3]) / 100000;
            if (point[0] >= x && point[0] <= x + w && point[1] >= y && point[1] <= y + h) {
              return true;
            }
          }
        }
      }
      return false;
    },
    tsrep: function(ts, start, freq) {
      // Checks if current timestamp is a repetition from start every freq. All in seconds.
      return ((ts % 86400) - start) % freq === 0;
    },
    match: function(str, regexp, flag) {
      if (!flag) flag = '';
      return str.match(new RegExp(regexp, flag));
    }
  };

  function isWithinPolygon(point, polygon) {
    if (!polygon.path) return false;
    // The array representing the polygon represents each point with an array.
    // We map it to use `lat` and `lng` instead.
    var mappedPolygon = polygon.path.map(function(point) {
      return { lat: point[0], lng: point[1] };
    });

    var crossings = 0;
    for (var i = 0; i < mappedPolygon.length; i++) {
      // Build a rect with the next two points of the polygon
      var a = mappedPolygon[i];
      // When we reach the last iteration, we need to connect it back to the first point.
      var b = mappedPolygon[i + 1 == mappedPolygon.length ? 0 : i + 1];
      // Check if the virtual ray intercepts this side of the polygon
      if (rayCrossesSegment(point, a, b)) crossings++;
    }
    // If the number of crossings is odd, then the point is inside the polygon.
    return crossings % 2 == 1;
  }

  function isWithinCircle(point, circle) {
    if (!circle || !point) return false;

    // This method uses the [Haversine formula](http://en.wikipedia.org/wiki/Haversine_formula).
    var R = 6371;
    var dLat = (point.lat - circle.lat) * (Math.PI / 180);
    var dLon = (point.lng - circle.lng) * (Math.PI / 180);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2);
    a += Math.cos(circle.lat * (Math.PI / 180)) * Math.cos(point.lat * (Math.PI / 180));
    a *= Math.sin(dLon / 2) * Math.sin(dLon / 2);

    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    // Get the distance in `meters`
    var distance = R * c * 1000;

    return distance <= circle.rad;
  }

  function rayCrossesSegment(point, a, b) {
    if (!point || !a || !b) return false;

    var px = point.lng;
    var py = point.lat;
    var ax = a.lng;
    var ay = a.lat;
    var bx = b.lng;
    var by = b.lat;
    if (ay > by) {
      ax = b.lng;
      ay = b.lat;
      bx = a.lng;
      by = a.lat;
    }

    if (px < 0) px += 360;
    if (ax < 0) ax += 360;
    if (bx < 0) bx += 360;

    if (py == ay || py == by) py += 0.00000001;
    if (py > by || py < ay || px >= Math.max(ax, bx)) return false;
    if (px < Math.min(ax, bx)) return true;

    var red = ax != bx ? (by - ay) / (bx - ax) : Infinity;
    var blue = ax != px ? (py - ay) / (px - ax) : Infinity;

    return blue >= red;
  }

  function is_logic(logic) {
    return (
      typeof logic === 'object' && // An object
      logic !== null && // but not null
      !Array.isArray(logic) && // and not an array
      Object.keys(logic).length === 1 // with exactly one key
    );
  }

  /*
  This helper will defer to the JsonLogic spec as a tie-breaker when different language interpreters define different behavior for the truthiness of primitives.  E.g., PHP considers empty arrays to be falsy, but Javascript considers them to be truthy. JsonLogic, as an ecosystem, needs one consistent answer.

  Spec and rationale here: http://jsonlogic.com/truthy
  */
  function truthy(value) {
    if (Array.isArray(value) && value.length === 0) {
      return false;
    }
    if (typeof value === 'object' && !!value && Object.keys(value).length === 0) {
      return false;
    }
    return !!value;
  }

  jsonLogic.truthy = truthy;

  jsonLogic.apply = function(logic, data) {
    // Does this array contain logic? Only one way to find out.
    if (Array.isArray(logic)) {
      return logic.map(function(l) {
        return jsonLogic.apply(l, data);
      });
    }
    // You've recursed to a primitive, stop!
    if (!is_logic(logic)) {
      return logic;
    }

    data = data || {};

    var op;
    for (op in logic) break;
    var values = logic[op];
    var i;
    var current;
    var scopedLogic, scopedData, filtered, initial;

    // easy syntax for unary operators, like {"var" : "x"} instead of strict {"var" : ["x"]}
    if (!Array.isArray(values)) {
      values = [values];
    }

    // 'if', 'and', and 'or' violate the normal rule of depth-first calculating consequents, let each manage recursion as needed.
    if (op === 'if' || op == '?:') {
      /* 'if' should be called with a odd number of parameters, 3 or greater
      This works on the pattern:
      if( 0 ){ 1 }else{ 2 };
      if( 0 ){ 1 }else if( 2 ){ 3 }else{ 4 };
      if( 0 ){ 1 }else if( 2 ){ 3 }else if( 4 ){ 5 }else{ 6 };

      The implementation is:
      For pairs of values (0,1 then 2,3 then 4,5 etc)
      If the first evaluates truthy, evaluate and return the second
      If the first evaluates falsy, jump to the next pair (e.g, 0,1 to 2,3)
      given one parameter, evaluate and return it. (it's an Else and all the If/ElseIf were false)
      given 0 parameters, return NULL (not great practice, but there was no Else)
      */
      for (i = 0; i < values.length - 1; i += 2) {
        if (truthy(jsonLogic.apply(values[i], data))) {
          return jsonLogic.apply(values[i + 1], data);
        }
      }
      if (values.length === i + 1) return jsonLogic.apply(values[i], data);
      return null;
    } else if (op === 'and') {
      // Return first falsy, or last
      for (i = 0; i < values.length; i += 1) {
        current = jsonLogic.apply(values[i], data);
        if (!truthy(current)) {
          return current;
        }
      }
      return current; // Last
    } else if (op === 'or') {
      // Return first truthy, or last
      for (i = 0; i < values.length; i += 1) {
        current = jsonLogic.apply(values[i], data);
        if (truthy(current)) {
          return current;
        }
      }
      return current; // Last
    } else if (op === 'filter') {
      scopedData = jsonLogic.apply(values[0], data);
      scopedLogic = values[1];

      if (!Array.isArray(scopedData)) {
        return [];
      }
      // Return only the elements from the array in the first argument,
      // that return truthy when passed to the logic in the second argument.
      // For parity with JavaScript, reindex the returned array
      return scopedData.filter(function(datum) {
        return truthy(jsonLogic.apply(scopedLogic, datum));
      });
    } else if (op === 'map') {
      scopedData = jsonLogic.apply(values[0], data);
      scopedLogic = values[1];

      if (!Array.isArray(scopedData)) {
        return [];
      }

      return scopedData.map(function(datum) {
        return jsonLogic.apply(scopedLogic, datum);
      });
    } else if (op === 'reduce') {
      scopedData = jsonLogic.apply(values[0], data);
      scopedLogic = values[1];
      initial = typeof values[2] !== 'undefined' ? values[2] : null;

      if (!Array.isArray(scopedData)) {
        return initial;
      }

      return scopedData.reduce(function(accumulator, current) {
        return jsonLogic.apply(scopedLogic, { current: current, accumulator: accumulator });
      }, initial);
    } else if (op === 'all') {
      scopedData = jsonLogic.apply(values[0], data);
      scopedLogic = values[1];
      // All of an empty set is false. Note, some and none have correct fallback after the for loop
      if (!scopedData.length) {
        return false;
      }
      for (i = 0; i < scopedData.length; i += 1) {
        if (!truthy(jsonLogic.apply(scopedLogic, scopedData[i]))) {
          return false; // First falsy, short circuit
        }
      }
      return true; // All were truthy
    } else if (op === 'none') {
      filtered = jsonLogic.apply({ filter: values }, data);
      return filtered.length === 0;
    } else if (op === 'some') {
      filtered = jsonLogic.apply({ filter: values }, data);
      return filtered.length > 0;
    }

    // Everyone else gets immediate depth-first recursion
    values = values.map(function(val) {
      return jsonLogic.apply(val, data);
    });

    // The operation is called with "data" bound to its "this" and "values" passed as arguments.
    // Structured commands like % or > can name formal arguments while flexible commands (like missing or merge) can operate on the pseudo-array arguments
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments
    if (typeof operations[op] === 'function') {
      return operations[op].apply(data, values);
    } else if (op.indexOf('.') > 0) {
      // Contains a dot, and not in the 0th position
      var sub_ops = String(op).split('.');
      var operation = operations;
      for (i = 0; i < sub_ops.length; i++) {
        // Descending into operations
        operation = operation[sub_ops[i]];
        if (operation === undefined) {
          throw new Error('Unrecognized operation ' + op + ' (failed at ' + sub_ops.slice(0, i + 1).join('.') + ')');
        }
      }

      return operation.apply(data, values);
    }

    throw new Error('Unrecognized operation ' + op);
  };

  return jsonLogic;
});
