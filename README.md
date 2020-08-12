# OnSign TV Custom json-logic-js

This is a fork of the original repo at <https://github.com/jwadhams/json-logic-js>. Check [Differences from original json-logic-js](#differences-from-original-json-logic-js) to see what we changed.

This parser accepts [JsonLogic](http://jsonlogic.com) rules and executes them in JavaScript.

The JsonLogic format is designed to allow you to share rules (logic) between front-end and back-end code (regardless of language difference), even to store logic along with a record in a database.  JsonLogic is documented extensively at [JsonLogic.com](http://jsonlogic.com), including examples of every [supported operation](http://jsonlogic.com/operations.html) and a place to [try out rules in your browser](http://jsonlogic.com/play.html).

## Installation

To parse JsonLogic rules in a JavaScript backend (like Node.js), install this library via [NPM](https://www.npmjs.com/):

```bash
npm install --save onsigntv/json-logic-js#master
```

Note that this project uses a [module loader](http://ricostacruz.com/cheatsheets/umdjs.html) that also makes it suitable for RequireJS projects.

If that doesn't suit you, and you want to manage updates yourself, the entire library is self-contained in `logic.js` and you can download it straight into your project as you see fit.

```bash
curl -O https://raw.githubusercontent.com/onsigntv/json-logic-js/master/logic.js
```

## Examples

### Simple
```js
jsonLogic.apply( { "==" : [1, 1] } );
// true
```

This is a simple test, equivalent to `1 == 1`.  A few things about the format:

  1. The operator is always in the "key" position. There is only one key per JsonLogic rule.
  1. The values are typically an array.
  1. Each value can be a string, number, boolean, array (non-associative), or null

### Compound
Here we're beginning to nest rules.

```js
jsonLogic.apply(
  {"and" : [
    { ">" : [3,1] },
    { "<" : [1,3] }
  ] }
);
// true
```

In an infix language (like JavaScript) this could be written as:

```js
( (3 > 1) && (1 < 3) )
```

### Data-Driven

Obviously these rules aren't very interesting if they can only take static literal data. Typically `jsonLogic` will be called with a rule object and a data object. You can use the `var` operator to get attributes of the data object:

```js
jsonLogic.apply(
  { "var" : ["a"] }, // Rule
  { a : 1, b : 2 }   // Data
);
// 1
```

If you like, we support [syntactic sugar](https://en.wikipedia.org/wiki/Syntactic_sugar) on unary operators to skip the array around values:

```js
jsonLogic.apply(
  { "var" : "a" },
  { a : 1, b : 2 }
);
// 1
```

You can also use the `var` operator to access an array by numeric index:

```js
jsonLogic.apply(
  {"var" : 1 },
  [ "apple", "banana", "carrot" ]
);
// "banana"
```

Here's a complex rule that mixes literals and data. The pie isn't ready to eat unless it's cooler than 110 degrees, *and* filled with apples.

```js
var rules = { "and" : [
  {"<" : [ { "var" : "temp" }, 110 ]},
  {"==" : [ { "var" : "pie.filling" }, "apple" ] }
] };

var data = { "temp" : 100, "pie" : { "filling" : "apple" } };

jsonLogic.apply(rules, data);
// true
```

### Always and Never
Sometimes the rule you want to process is "Always" or "Never."  If the first parameter passed to `jsonLogic` is a non-object, non-associative-array, it is returned immediately.

```js
//Always
jsonLogic.apply(true, data_will_be_ignored);
// true

//Never
jsonLogic.apply(false, i_wasnt_even_supposed_to_be_here);
// false
```

## Compatibility

This library makes use of `Array.map` and `Array.reduce`, so it's not *exactly* Internet Explorer 8 friendly.

If you want to use JsonLogic *and* support deprecated browsers, you could easily use [BabelJS's polyfill](https://babeljs.io/docs/usage/polyfill/) or directly incorporate the polyfills documented on MDN for [map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map) and [reduce](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce).

## Differences from original json-logic-js

This repository removes a lot of unneeded code and add some extra specific operators, besides doing some overall improvements to the code.

### New Operators

The new operators are:

- `><`: Receives a geo-coordinate and a list of region objects, and checks whether the coordinate is inside the any region.
- `>.<`: Receives a geo-coordinate and a region object, and checks whether the coordinate is inside the region.
- `>t<`: Receives a point, in virtual coordinates from 0 to 100_000 and a rectangle array of [x, y, width, height], to determine wether the point
  is within the rectangle. Third parameter is optional for mapping the rectangle to a different area of the plane. Returns a boolean.
- `tsrep`: Receives the current unix timestamp, a timestamp from the start of the day and a repetition value to determine wether the current
  timestamp is a repeating point within the day. Returns a boolean.
- `match`: Checks whether the first parameter matches a regular expression in the second parameter. Returns the match array or `null`.
- `*=`: Checks whether the first argument starts with the second argument
- `=*`: Checks whether the first argument ends with the second argument

### Improvements

The main repository had a lot of issues regarding `null` values, and some operators were really inconsistent.
This repo makes sure that:

- When doing comparisons with `null`, we will always return `false`
- When doing operations with `null`, we will always consider null as `0`
- `0` will be returned when a value is divided by `0`. This matches well with the second change.
- All operations now support an arbitrary amount of arguments (excluding `%`)
- Calling operations with only 1 value returns that value. Ex.: `{"-": [1]} === 1` (excluding `%`)
- An empty object `{}` is considered false
