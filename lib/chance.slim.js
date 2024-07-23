//  Chance.js 1.0.16
//  http://chancejs.com
//  (c) 2013 Victor Quinn
//  Chance may be freely distributed or modified under the MIT license.

(function() {

  // Constants
  var MAX_INT = 9007199254740992;
  var MIN_INT = -MAX_INT;
  var NUMBERS = '0123456789';
  var CHARS_LOWER = 'abcdefghijklmnopqrstuvwxyz';
  var CHARS_UPPER = CHARS_LOWER.toUpperCase();
  var HEX_POOL = NUMBERS + "abcdef";

  // Errors
  function UnsupportedError(message) {
    this.name = 'UnsupportedError';
    this.message = message || 'This feature is not supported on this platform';
  }

  UnsupportedError.prototype = new Error();
  UnsupportedError.prototype.constructor = UnsupportedError;

  // Cached array helpers
  var slice = Array.prototype.slice;

  // Constructor
  function Chance(seed) {
    if (!(this instanceof Chance)) {
      if (!seed) {
        seed = null;
      }
      // handle other non-truthy seeds, as described in issue #322
      return seed === null ? new Chance() : new Chance(seed);
    }

    // if user has provided a function, use that as the generator
    if (typeof seed === 'function') {
      this.random = seed;
      return this;
    }

    if (arguments.length) {
      // set a starting value of zero so we can add to it
      this.seed = 0;
    }

    // otherwise, leave this.seed blank so that MT will receive a blank

    for (var i = 0; i < arguments.length; i++) {
      var seedling = 0;
      if (Object.prototype.toString.call(arguments[i]) === '[object String]') {
        for (var j = 0; j < arguments[i].length; j++) {
          // create a numeric hash for each argument, add to seedling
          var hash = 0;
          for (var k = 0; k < arguments[i].length; k++) {
            hash = arguments[i].charCodeAt(k) + (hash << 6) + (hash << 16) - hash;
          }
          seedling += hash;
        }
      } else {
        seedling = arguments[i];
      }
      this.seed += (arguments.length - i) * seedling;
    }

    // If no generator function was provided, use our MT
    this.mt = this.mersenne_twister(this.seed);
    this.bimd5 = this.blueimp_md5();
    this.random = function() {
      return this.mt.random(this.seed);
    }
    ;

    return this;
  }

  Chance.prototype.VERSION = "1.0.16";

  // Random helper functions
  function initOptions(options, defaults) {
    options = options || {};

    if (defaults) {
      for (var i in defaults) {
        if (typeof options[i] === 'undefined') {
          options[i] = defaults[i];
        }
      }
    }

    return options;
  }

  function range(size) {
    return Array.apply(null, Array(size)).map(function(_, i) {
      return i;
    });
  }

  function testRange(test, errorMessage) {
    if (test) {
      throw new RangeError(errorMessage);
    }
  }

  /**
     * Encode the input string with Base64.
     */
  var base64 = function() {
    throw new Error('No Base64 encoder available.');
  };

  // Select proper Base64 encoder.
  (function determineBase64Encoder() {
    if (typeof btoa === 'function') {
      base64 = btoa;
    } else if (typeof Buffer === 'function') {
      base64 = function(input) {
        return new Buffer(input).toString('base64');
      }
      ;
    }
  }
  )();

  // -- Basics --

  /**
     *  Return a random bool, either true or false
     *
     *  @param {Object} [options={ likelihood: 50 }] alter the likelihood of
     *    receiving a true or false value back.
     *  @throws {RangeError} if the likelihood is out of bounds
     *  @returns {Bool} either true or false
     */
  Chance.prototype.bool = function(options) {
    // likelihood of success (true)
    options = initOptions(options, {
      likelihood: 50
    });

    // Note, we could get some minor perf optimizations by checking range
    // prior to initializing defaults, but that makes code a bit messier
    // and the check more complicated as we have to check existence of
    // the object then existence of the key before checking constraints.
    // Since the options initialization should be minor computationally,
    // decision made for code cleanliness intentionally. This is mentioned
    // here as it's the first occurrence, will not be mentioned again.
    testRange(options.likelihood < 0 || options.likelihood > 100, "Chance: Likelihood accepts values from 0 to 100.");

    return this.random() * 100 < options.likelihood;
  }
  ;

  Chance.prototype.likely = function(likelihood) {
    return this.bool({
      likelihood
    })
  }

  /**
     *  Return a random character.
     *
     *  @param {Object} [options={}] can specify a character pool, only alpha,
     *    only symbols, and casing (lower or upper)
     *  @returns {String} a single random character
     *  @throws {RangeError} Can only specify alpha or symbols, not both
     */
  Chance.prototype.character = function(options) {
    options = initOptions(options);
    testRange(options.alpha && options.symbols, "Chance: Cannot specify both alpha and symbols.");

    var symbols = "!@#$%^&*()[]", letters, pool;

    if (options.casing === 'lower') {
      letters = CHARS_LOWER;
    } else if (options.casing === 'upper') {
      letters = CHARS_UPPER;
    } else {
      letters = CHARS_LOWER + CHARS_UPPER;
    }

    if (options.pool) {
      pool = options.pool;
    } else if (options.alpha) {
      pool = letters;
    } else if (options.symbols) {
      pool = symbols;
    } else {
      pool = letters + NUMBERS + symbols;
    }

    return pool.charAt(this.natural({
      max: (pool.length - 1)
    }));
  }
  ;

  // Note, wanted to use "float" or "double" but those are both JS reserved words.

  // Note, fixed means N OR LESS digits after the decimal. This because
  // It could be 14.9000 but in JavaScript, when this is cast as a number,
  // the trailing zeroes are dropped. Left to the consumer if trailing zeroes are
  // needed
  /**
     *  Return a random floating point number
     *
     *  @param {Object} [options={}] can specify a fixed precision, min, max
     *  @returns {Number} a single floating point number
     *  @throws {RangeError} Can only specify fixed or precision, not both. Also
     *    min cannot be greater than max
     */
  Chance.prototype.floating = function(options) {
    options = initOptions(options, {
      fixed: 4
    });
    testRange(options.fixed && options.precision, "Chance: Cannot specify both fixed and precision.");

    var num;
    var fixed = Math.pow(10, options.fixed);

    var max = MAX_INT / fixed;
    var min = -max;

    testRange(options.min && options.fixed && options.min < min, "Chance: Min specified is out of range with fixed. Min should be, at least, " + min);
    testRange(options.max && options.fixed && options.max > max, "Chance: Max specified is out of range with fixed. Max should be, at most, " + max);

    options = initOptions(options, {
      min: min,
      max: max
    });

    // Todo - Make this work!
    // options.precision = (typeof options.precision !== "undefined") ? options.precision : false;

    num = this.integer({
      min: options.min * fixed,
      max: options.max * fixed
    });
    var num_fixed = (num / fixed).toFixed(options.fixed);

    return parseFloat(num_fixed);
  }
  ;

  /**
     *  Return a random integer
     *
     *  NOTE the max and min are INCLUDED in the range. So:
     *  chance.integer({min: 1, max: 3});
     *  would return either 1, 2, or 3.
     *
     *  @param {Object} [options={}] can specify a min and/or max
     *  @returns {Number} a single random integer number
     *  @throws {RangeError} min cannot be greater than max
     */
  Chance.prototype.integer = function(options) {
    // 9007199254740992 (2^53) is the max integer number in JavaScript
    // See: http://vq.io/132sa2j
    options = initOptions(options, {
      min: MIN_INT,
      max: MAX_INT
    });
    testRange(options.min > options.max, "Chance: Min cannot be greater than Max.");

    return Math.floor(this.random() * (options.max - options.min + 1) + options.min);
  }
  ;

  Chance.prototype.randBetween = function(min, max) {
    return this.integer({
      min,
      max
    })
  }

  /**
     *  Return a random natural
     *
     *  NOTE the max and min are INCLUDED in the range. So:
     *  chance.natural({min: 1, max: 3});
     *  would return either 1, 2, or 3.
     *
     *  @param {Object} [options={}] can specify a min and/or maxm or a numerals count.
     *  @returns {Number} a single random integer number
     *  @throws {RangeError} min cannot be greater than max
     */
  Chance.prototype.natural = function(options) {
    options = initOptions(options, {
      min: 0,
      max: MAX_INT
    });
    if (typeof options.numerals === 'number') {
      testRange(options.numerals < 1, "Chance: Numerals cannot be less than one.");
      options.min = Math.pow(10, options.numerals - 1);
      options.max = Math.pow(10, options.numerals) - 1;
    }
    testRange(options.min < 0, "Chance: Min cannot be less than zero.");
    return this.integer(options);
  }
  ;

  /**
     *  Return a random hex number as string
     *
     *  NOTE the max and min are INCLUDED in the range. So:
     *  chance.hex({min: '9', max: 'B'});
     *  would return either '9', 'A' or 'B'.
     *
     *  @param {Object} [options={}] can specify a min and/or max and/or casing
     *  @returns {String} a single random string hex number
     *  @throws {RangeError} min cannot be greater than max
     */
  Chance.prototype.hex = function(options) {
    options = initOptions(options, {
      min: 0,
      max: MAX_INT,
      casing: 'lower'
    });
    testRange(options.min < 0, "Chance: Min cannot be less than zero.");
    var integer = this.natural({
      min: options.min,
      max: options.max
    });
    if (options.casing === 'upper') {
      return integer.toString(16).toUpperCase();
    }
    return integer.toString(16);
  }
  ;

  Chance.prototype.letter = function(options) {
    options = initOptions(options, {
      casing: 'lower'
    });
    var pool = "abcdefghijklmnopqrstuvwxyz";
    var letter = this.character({
      pool: pool
    });
    if (options.casing === 'upper') {
      letter = letter.toUpperCase();
    }
    return letter;
  }

  /**
     *  Return a random string
     *
     *  @param {Object} [options={}] can specify a length
     *  @returns {String} a string of random length
     *  @throws {RangeError} length cannot be less than zero
     */
  Chance.prototype.string = function(options) {
    options = initOptions(options, {
      length: this.natural({
        min: 5,
        max: 20
      })
    });
    testRange(options.length < 0, "Chance: Length cannot be less than zero.");
    var length = options.length
      , text = this.n(this.character, length, options);

    return text.join("");
  }
  ;

  /**
     *  Return a random buffer
     *
     *  @param {Object} [options={}] can specify a length
     *  @returns {Buffer} a buffer of random length
     *  @throws {RangeError} length cannot be less than zero
     */
  Chance.prototype.buffer = function(options) {
    if (typeof Buffer === 'undefined') {
      throw new UnsupportedError('Sorry, the buffer() function is not supported on your platform');
    }
    options = initOptions(options, {
      length: this.natural({
        min: 5,
        max: 20
      })
    });
    testRange(options.length < 0, "Chance: Length cannot be less than zero.");
    var length = options.length;
    var content = this.n(this.character, length, options);

    return Buffer.from(content);
  }
  ;

  // -- End Basics --

  // -- Helpers --

  Chance.prototype.capitalize = function(word) {
    return word.charAt(0).toUpperCase() + word.substr(1);
  }
  ;

  Chance.prototype.mixin = function(obj) {
    for (var func_name in obj) {
      Chance.prototype[func_name] = obj[func_name];
    }
    return this;
  }
  ;

  /**
     *  Given a function that generates something random and a number of items to generate,
     *    return an array of items where none repeat.
     *
     *  @param {Function} fn the function that generates something random
     *  @param {Number} num number of terms to generate
     *  @param {Object} options any options to pass on to the generator function
     *  @returns {Array} an array of length `num` with every item generated by `fn` and unique
     *
     *  There can be more parameters after these. All additional parameters are provided to the given function
     */
  Chance.prototype.unique = function(fn, num, options) {
    testRange(typeof fn !== "function", "Chance: The first argument must be a function.");

    var comparator = function(arr, val) {
      return arr.indexOf(val) !== -1;
    };

    if (options) {
      comparator = options.comparator || comparator;
    }

    var arr = [], count = 0, result, MAX_DUPLICATES = num * 50, params = slice.call(arguments, 2);

    while (arr.length < num) {
      var clonedParams = JSON.parse(JSON.stringify(params));
      result = fn.apply(this, clonedParams);
      if (!comparator(arr, result)) {
        arr.push(result);
        // reset count when unique found
        count = 0;
      }

      if (++count > MAX_DUPLICATES) {
        throw new RangeError("Chance: num is likely too large for sample set");
      }
    }
    return arr;
  }
  ;

  /**
     *  Gives an array of n random terms
     *
     *  @param {Function} fn the function that generates something random
     *  @param {Number} n number of terms to generate
     *  @returns {Array} an array of length `n` with items generated by `fn`
     *
     *  There can be more parameters after these. All additional parameters are provided to the given function
     */
  Chance.prototype.n = function(fn, n) {
    testRange(typeof fn !== "function", "Chance: The first argument must be a function.");

    if (typeof n === 'undefined') {
      n = 1;
    }
    var i = n
      , arr = []
      , params = slice.call(arguments, 2);

    // Providing a negative count should result in a noop.
    i = Math.max(0, i);

    for (null; i--; null) {
      arr.push(fn.apply(this, params));
    }

    return arr;
  }
  ;

  // H/T to SO for this one: http://vq.io/OtUrZ5
  Chance.prototype.pad = function(number, width, pad) {
    // Default pad to 0 if none provided
    pad = pad || '0';
    // Convert number to a string
    number = number + '';
    return number.length >= width ? number : new Array(width - number.length + 1).join(pad) + number;
  }
  ;

  // DEPRECATED on 2015-10-01
  Chance.prototype.pick = function(arr, count) {
    if (arr.length === 0) {
      throw new RangeError("Chance: Cannot pick() from an empty array");
    }
    if (!count || count === 1) {
      return arr[this.natural({
        max: arr.length - 1
      })];
    } else {
      return this.shuffle(arr).slice(0, count);
    }
  }
  ;

  // Given an array, returns a single random element
  Chance.prototype.pickone = function(arr) {
    if (arr.length === 0) {
      throw new RangeError("Chance: Cannot pickone() from an empty array");
    }
    return arr[this.natural({
      max: arr.length - 1
    })];
  }
  ;

  // Given an array, returns a random set with 'count' elements
  Chance.prototype.pickset = function(arr, count) {
    if (count === 0) {
      return [];
    }
    if (arr.length === 0) {
      throw new RangeError("Chance: Cannot pickset() from an empty array");
    }
    if (count < 0) {
      throw new RangeError("Chance: Count must be a positive number");
    }
    if (!count || count === 1) {
      return [this.pickone(arr)];
    } else {
      return this.shuffle(arr).slice(0, count);
    }
  }
  ;

  Chance.prototype.shuffle = function(arr) {
    var new_array = [], j = 0, length = Number(arr.length), source_indexes = range(length), last_source_index = length - 1, selected_source_index;

    for (var i = 0; i < length; i++) {
      // Pick a random index from the array
      selected_source_index = this.natural({
        max: last_source_index
      });
      j = source_indexes[selected_source_index];

      // Add it to the new array
      new_array[i] = arr[j];

      // Mark the source index as used
      source_indexes[selected_source_index] = source_indexes[last_source_index];
      last_source_index -= 1;
    }

    return new_array;
  }
  ;

  // Returns a single item from an array with relative weighting of odds
  Chance.prototype.weighted = function(arr, weights, trim) {
    if (arr.length !== weights.length) {
      throw new RangeError("Chance: Length of array and weights must match");
    }

    // scan weights array and sum valid entries
    var sum = 0;
    var val;
    for (var weightIndex = 0; weightIndex < weights.length; ++weightIndex) {
      val = weights[weightIndex];
      if (isNaN(val)) {
        throw new RangeError("Chance: All weights must be numbers");
      }

      if (val > 0) {
        sum += val;
      }
    }

    if (sum === 0) {
      throw new RangeError("Chance: No valid entries in array weights");
    }

    // select a value within range
    var selected = this.random() * sum;

    // find array entry corresponding to selected value
    var total = 0;
    var lastGoodIdx = -1;
    var chosenIdx;
    for (weightIndex = 0; weightIndex < weights.length; ++weightIndex) {
      val = weights[weightIndex];
      total += val;
      if (val > 0) {
        if (selected <= total) {
          chosenIdx = weightIndex;
          break;
        }
        lastGoodIdx = weightIndex;
      }

      // handle any possible rounding error comparison to ensure something is picked
      if (weightIndex === (weights.length - 1)) {
        chosenIdx = lastGoodIdx;
      }
    }

    var chosen = arr[chosenIdx];
    trim = (typeof trim === 'undefined') ? false : trim;
    if (trim) {
      arr.splice(chosenIdx, 1);
      weights.splice(chosenIdx, 1);
    }

    return chosen;
  }
  ;

  Chance.prototype.weightedString = function(str) {
    let[w,p] = str.split("/").map(w=>w.split(","))
    if (w.length != p.length) {
      console.log(str)
    }
    return this.weighted(w, p.map(Number))
  }

  // -- End Helpers --

  Chance.prototype.syllable = function(options) {
    options = initOptions(options);

    var length = options.length || this.natural({
      min: 2,
      max: 3
    }), consonants = 'bcdfghjklmnprstvwz', // consonants except hard to speak ones
    vowels = 'aeiou', // vowels
    all = consonants + vowels, // all
    text = '', chr;

    // I'm sure there's a more elegant way to do this, but this works
    // decently well.
    for (var i = 0; i < length; i++) {
      if (i === 0) {
        // First character can be anything
        chr = this.character({
          pool: all
        });
      } else if (consonants.indexOf(chr) === -1) {
        // Last character was a vowel, now we want a consonant
        chr = this.character({
          pool: consonants
        });
      } else {
        // Last character was a consonant, now we want a vowel
        chr = this.character({
          pool: vowels
        });
      }

      text += chr;
    }

    if (options.capitalize) {
      text = this.capitalize(text);
    }

    return text;
  }
  ;

  Chance.prototype.word = function(options) {
    options = initOptions(options);

    testRange(options.syllables && options.length, "Chance: Cannot specify both syllables AND length.");

    var syllables = options.syllables || this.natural({
      min: 1,
      max: 3
    })
      , text = '';

    if (options.length) {
      // Either bound word by length
      do {
        text += this.syllable();
      } while (text.length < options.length);
      text = text.substring(0, options.length);
    } else {
      // Or by number of syllables
      for (var i = 0; i < syllables; i++) {
        text += this.syllable();
      }
    }

    if (options.capitalize) {
      text = this.capitalize(text);
    }

    return text;
  }
  ;

  Chance.prototype.gender = function(options) {
    options = initOptions(options, {
      extraGenders: []
    });
    return this.pick(['Male', 'Female'].concat(options.extraGenders));
  }
  ;

  Chance.prototype.first = function(options) {
    options = initOptions(options, {
      gender: this.gender(),
      nationality: 'en'
    });
    return this.pick(this.get("firstNames")[options.gender.toLowerCase()][options.nationality.toLowerCase()]);
  }
  ;

  Chance.prototype.last = function(options) {
    options = initOptions(options, {
      nationality: '*'
    });
    if (options.nationality === "*") {
      var allLastNames = []
      var lastNames = this.get("lastNames")
      Object.keys(lastNames).forEach(function(key, i) {
        allLastNames = allLastNames.concat(lastNames[key])
      })
      return this.pick(allLastNames)
    } else {
      return this.pick(this.get("lastNames")[options.nationality.toLowerCase()]);
    }

  }
  ;

  Chance.prototype.name = function(options) {
    options = initOptions(options);

    var first = this.first(options), last = this.last(options), name;

    if (options.middle) {
      name = first + ' ' + this.first(options) + ' ' + last;
    } else if (options.middle_initial) {
      name = first + ' ' + this.character({
        alpha: true,
        casing: 'upper'
      }) + '. ' + last;
    } else {
      name = first + ' ' + last;
    }

    return name;
  }
  ;

  Chance.prototype.firstName = function(options) {
    options = initOptions(options);
    options.nationality = options.nationality || this.pickone(Object.keys(data.firstNames.male))
    return this.first(options);
  }
  ;

  /**
     * #Description:
     * ===============================================
     * Generate random color value base on color type:
     * -> hex
     * -> rgb
     * -> rgba
     * -> 0x
     * -> named color
     *
     * #Examples:
     * ===============================================
     * * Geerate random hex color
     * chance.color() => '#79c157' / 'rgb(110,52,164)' / '0x67ae0b' / '#e2e2e2' / '#29CFA7'
     *
     * * Generate Hex based color value
     * chance.color({format: 'hex'})    => '#d67118'
     *
     * * Generate simple rgb value
     * chance.color({format: 'rgb'})    => 'rgb(110,52,164)'
     *
     * * Generate Ox based color value
     * chance.color({format: '0x'})     => '0x67ae0b'
     *
     * * Generate graiscale based value
     * chance.color({grayscale: true})  => '#e2e2e2'
     *
     * * Return valide color name
     * chance.color({format: 'name'})   => 'red'
     *
     * * Make color uppercase
     * chance.color({casing: 'upper'})  => '#29CFA7'
     *
     * * Min Max values for RGBA
     * var light_red = chance.color({format: 'hex', min_red: 200, max_red: 255, max_green: 0, max_blue: 0, min_alpha: .2, max_alpha: .3});
     *
     * @param  [object] options
     * @return [string] color value
     */
  Chance.prototype.color = function(options) {
    function gray(value, delimiter) {
      return [value, value, value].join(delimiter || '');
    }

    function rgb(hasAlpha) {
      var rgbValue = (hasAlpha) ? 'rgba' : 'rgb';
      var alphaChannel = (hasAlpha) ? (',' + this.floating({
        min: min_alpha,
        max: max_alpha
      })) : "";
      var colorValue = (isGrayscale) ? (gray(this.natural({
        min: min_rgb,
        max: max_rgb
      }), ',')) : (this.natural({
        min: min_green,
        max: max_green
      }) + ',' + this.natural({
        min: min_blue,
        max: max_blue
      }) + ',' + this.natural({
        max: 255
      }));
      return rgbValue + '(' + colorValue + alphaChannel + ')';
    }

    function hex(start, end, withHash) {
      var symbol = (withHash) ? "#" : "";
      var hexstring = "";

      if (isGrayscale) {
        hexstring = gray(this.pad(this.hex({
          min: min_rgb,
          max: max_rgb
        }), 2));
        if (options.format === "shorthex") {
          hexstring = gray(this.hex({
            min: 0,
            max: 15
          }));
        }
      } else {
        if (options.format === "shorthex") {
          hexstring = this.pad(this.hex({
            min: Math.floor(min_red / 16),
            max: Math.floor(max_red / 16)
          }), 1) + this.pad(this.hex({
            min: Math.floor(min_green / 16),
            max: Math.floor(max_green / 16)
          }), 1) + this.pad(this.hex({
            min: Math.floor(min_blue / 16),
            max: Math.floor(max_blue / 16)
          }), 1);
        } else if (min_red !== undefined || max_red !== undefined || min_green !== undefined || max_green !== undefined || min_blue !== undefined || max_blue !== undefined) {
          hexstring = this.pad(this.hex({
            min: min_red,
            max: max_red
          }), 2) + this.pad(this.hex({
            min: min_green,
            max: max_green
          }), 2) + this.pad(this.hex({
            min: min_blue,
            max: max_blue
          }), 2);
        } else {
          hexstring = this.pad(this.hex({
            min: min_rgb,
            max: max_rgb
          }), 2) + this.pad(this.hex({
            min: min_rgb,
            max: max_rgb
          }), 2) + this.pad(this.hex({
            min: min_rgb,
            max: max_rgb
          }), 2);
        }
      }

      return symbol + hexstring;
    }

    options = initOptions(options, {
      format: this.pick(['hex', 'shorthex', 'rgb', 'rgba', '0x', 'name']),
      grayscale: false,
      casing: 'lower',
      min: 0,
      max: 255,
      min_red: undefined,
      max_red: undefined,
      min_green: undefined,
      max_green: undefined,
      min_blue: undefined,
      max_blue: undefined,
      min_alpha: 0,
      max_alpha: 1
    });

    var isGrayscale = options.grayscale;
    var min_rgb = options.min;
    var max_rgb = options.max;
    var min_red = options.min_red;
    var max_red = options.max_red;
    var min_green = options.min_green;
    var max_green = options.max_green;
    var min_blue = options.min_blue;
    var max_blue = options.max_blue;
    var min_alpha = options.min_alpha;
    var max_alpha = options.max_alpha;
    if (options.min_red === undefined) {
      min_red = min_rgb;
    }
    if (options.max_red === undefined) {
      max_red = max_rgb;
    }
    if (options.min_green === undefined) {
      min_green = min_rgb;
    }
    if (options.max_green === undefined) {
      max_green = max_rgb;
    }
    if (options.min_blue === undefined) {
      min_blue = min_rgb;
    }
    if (options.max_blue === undefined) {
      max_blue = max_rgb;
    }
    if (options.min_alpha === undefined) {
      min_alpha = 0;
    }
    if (options.max_alpha === undefined) {
      max_alpha = 1;
    }
    if (isGrayscale && min_rgb === 0 && max_rgb === 255 && min_red !== undefined && max_red !== undefined) {
      min_rgb = ((min_red + min_green + min_blue) / 3);
      max_rgb = ((max_red + max_green + max_blue) / 3);
    }
    var colorValue;

    if (options.format === 'hex') {
      colorValue = hex.call(this, 2, 6, true);
    } else if (options.format === 'shorthex') {
      colorValue = hex.call(this, 1, 3, true);
    } else if (options.format === 'rgb') {
      colorValue = rgb.call(this, false);
    } else if (options.format === 'rgba') {
      colorValue = rgb.call(this, true);
    } else if (options.format === '0x') {
      colorValue = '0x' + hex.call(this, 2, 6);
    } else if (options.format === 'name') {
      return this.pick(this.get("colorNames"));
    } else {
      throw new RangeError('Invalid format provided. Please provide one of "hex", "shorthex", "rgb", "rgba", "0x" or "name".');
    }

    if (options.casing === 'upper') {
      colorValue = colorValue.toUpperCase();
    }

    return colorValue;
  }
  ;

  Chance.prototype.coordinates = function(options) {
    return this.latitude(options) + ', ' + this.longitude(options);
  }
  ;

  Chance.prototype.latitude = function(options) {
    options = initOptions(options, {
      fixed: 5,
      min: -90,
      max: 90
    });
    return this.floating({
      min: options.min,
      max: options.max,
      fixed: options.fixed
    });
  }
  ;

  Chance.prototype.longitude = function(options) {
    options = initOptions(options, {
      fixed: 5,
      min: -180,
      max: 180
    });
    return this.floating({
      min: options.min,
      max: options.max,
      fixed: options.fixed
    });
  }
  ;

  Chance.prototype.hour = function(options) {
    options = initOptions(options, {
      min: options && options.twentyfour ? 0 : 1,
      max: options && options.twentyfour ? 23 : 12
    });

    testRange(options.min < 0, "Chance: Min cannot be less than 0.");
    testRange(options.twentyfour && options.max > 23, "Chance: Max cannot be greater than 23 for twentyfour option.");
    testRange(!options.twentyfour && options.max > 12, "Chance: Max cannot be greater than 12.");
    testRange(options.min > options.max, "Chance: Min cannot be greater than Max.");

    return this.natural({
      min: options.min,
      max: options.max
    });
  }
  ;

  Chance.prototype.millisecond = function() {
    return this.natural({
      max: 999
    });
  }
  ;

  Chance.prototype.minute = Chance.prototype.second = function(options) {
    options = initOptions(options, {
      min: 0,
      max: 59
    });

    testRange(options.min < 0, "Chance: Min cannot be less than 0.");
    testRange(options.max > 59, "Chance: Max cannot be greater than 59.");
    testRange(options.min > options.max, "Chance: Min cannot be greater than Max.");

    return this.natural({
      min: options.min,
      max: options.max
    });
  }
  ;

  Chance.prototype.month = function(options) {
    options = initOptions(options, {
      min: 1,
      max: 12
    });

    testRange(options.min < 1, "Chance: Min cannot be less than 1.");
    testRange(options.max > 12, "Chance: Max cannot be greater than 12.");
    testRange(options.min > options.max, "Chance: Min cannot be greater than Max.");

    var month = this.pick(this.months().slice(options.min - 1, options.max));
    return options.raw ? month : month.name;
  }
  ;

  Chance.prototype.months = function() {
    return this.get("months");
  }
  ;

  Chance.prototype.second = function() {
    return this.natural({
      max: 59
    });
  }
  ;

  Chance.prototype.pl_pesel = function() {
    var number = this.natural({
      min: 1,
      max: 9999999999
    });
    var arr = this.pad(number, 10).split('');
    for (var i = 0; i < arr.length; i++) {
      arr[i] = parseInt(arr[i]);
    }

    var controlNumber = (1 * arr[0] + 3 * arr[1] + 7 * arr[2] + 9 * arr[3] + 1 * arr[4] + 3 * arr[5] + 7 * arr[6] + 9 * arr[7] + 1 * arr[8] + 3 * arr[9]) % 10;
    if (controlNumber !== 0) {
      controlNumber = 10 - controlNumber;
    }

    return arr.join('') + controlNumber;
  }
  ;

  Chance.prototype.pl_nip = function() {
    var number = this.natural({
      min: 1,
      max: 999999999
    });
    var arr = this.pad(number, 9).split('');
    for (var i = 0; i < arr.length; i++) {
      arr[i] = parseInt(arr[i]);
    }

    var controlNumber = (6 * arr[0] + 5 * arr[1] + 7 * arr[2] + 2 * arr[3] + 3 * arr[4] + 4 * arr[5] + 5 * arr[6] + 6 * arr[7] + 7 * arr[8]) % 11;
    if (controlNumber === 10) {
      return this.pl_nip();
    }

    return arr.join('') + controlNumber;
  }
  ;

  Chance.prototype.pl_regon = function() {
    var number = this.natural({
      min: 1,
      max: 99999999
    });
    var arr = this.pad(number, 8).split('');
    for (var i = 0; i < arr.length; i++) {
      arr[i] = parseInt(arr[i]);
    }

    var controlNumber = (8 * arr[0] + 9 * arr[1] + 2 * arr[2] + 3 * arr[3] + 4 * arr[4] + 5 * arr[5] + 6 * arr[6] + 7 * arr[7]) % 11;
    if (controlNumber === 10) {
      controlNumber = 0;
    }

    return arr.join('') + controlNumber;
  }
  ;

  // Dice - For all the board game geeks out there, myself included ;)
  function diceFn(range) {
    return function() {
      return this.natural(range);
    }
    ;
  }
  Chance.prototype.d4 = diceFn({
    min: 1,
    max: 4
  });
  Chance.prototype.d3 = diceFn({
    min: 1,
    max: 3
  });
  Chance.prototype.d6 = diceFn({
    min: 1,
    max: 6
  });
  Chance.prototype.d8 = diceFn({
    min: 1,
    max: 8
  });
  Chance.prototype.d10 = diceFn({
    min: 1,
    max: 10
  });
  Chance.prototype.d12 = diceFn({
    min: 1,
    max: 12
  });
  Chance.prototype.d20 = diceFn({
    min: 1,
    max: 20
  });
  Chance.prototype.d30 = diceFn({
    min: 1,
    max: 30
  });
  Chance.prototype.d100 = diceFn({
    min: 1,
    max: 100
  });

  Chance.prototype.rpg = function(thrown, options) {
    options = initOptions(options);
    if (!thrown) {
      throw new RangeError("Chance: A type of die roll must be included");
    } else {
      var bits = thrown.toLowerCase().split("d")
        , rolls = [];

      if (bits.length !== 2 || !parseInt(bits[0], 10) || !parseInt(bits[1], 10)) {
        throw new Error("Chance: Invalid format provided. Please provide #d# where the first # is the number of dice to roll, the second # is the max of each die");
      }
      for (var i = bits[0]; i > 0; i--) {
        rolls[i - 1] = this.natural({
          min: 1,
          max: bits[1]
        });
      }
      return (typeof options.sum !== 'undefined' && options.sum) ? rolls.reduce(function(p, c) {
        return p + c;
      }) : rolls;
    }
  }
  ;

  Chance.prototype.sumDice = function(dice) {
    let[d,b=0] = dice.split("+")
    return Number(b) + this.rpg(d, {
      sum: true
    })
  }

  //roll pool of dice and cound success 
  Chance.prototype.dicePool = function(dice,success) {
    let roll = this.rpg(dice)
    let ns = roll.reduce((s,val)=>success.includes(val) ? s+1 : s,0)
    return {roll,ns}
  }

  //random card from basic deck 
  Chance.prototype.card = function() {
    let suit = this.pickone(["♠","♣","♥","♦"])
    let value = this.pickone(["A",2,3,4,5,6,7,8,9,10,"J","Q","K"])
    return {value,suit,text:value+suit} 
  }

  // Hash
  Chance.prototype.hash = function(options) {
    options = initOptions(options, {
      length: 40,
      casing: 'lower'
    });
    var pool = options.casing === 'upper' ? HEX_POOL.toUpperCase() : HEX_POOL;
    return this.string({
      pool: pool,
      length: options.length
    });
  }
  ;

  Chance.prototype.luhn_check = function(num) {
    var str = num.toString();
    var checkDigit = +str.substring(str.length - 1);
    return checkDigit === this.luhn_calculate(+str.substring(0, str.length - 1));
  }
  ;

  Chance.prototype.luhn_calculate = function(num) {
    var digits = num.toString().split("").reverse();
    var sum = 0;
    var digit;

    for (var i = 0, l = digits.length; l > i; ++i) {
      digit = +digits[i];
      if (i % 2 === 0) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      sum += digit;
    }
    return (sum * 9) % 10;
  }
  ;

  // MD5 Hash
  Chance.prototype.md5 = function(options) {
    var opts = {
      str: '',
      key: null,
      raw: false
    };

    if (!options) {
      opts.str = this.string();
      options = {};
    } else if (typeof options === 'string') {
      opts.str = options;
      options = {};
    } else if (typeof options !== 'object') {
      return null;
    } else if (options.constructor === 'Array') {
      return null;
    }

    opts = initOptions(options, opts);

    if (!opts.str) {
      throw new Error('A parameter is required to return an md5 hash.');
    }

    return this.bimd5.md5(opts.str, opts.key, opts.raw);
  }
  ;

  var data = {
    // return the names of all valide colors
    colorNames: ["AliceBlue", "Black", "Navy", "DarkBlue", "MediumBlue", "Blue", "DarkGreen", "Green", "Teal", "DarkCyan", "DeepSkyBlue", "DarkTurquoise", "MediumSpringGreen", "Lime", "SpringGreen", "Aqua", "Cyan", "MidnightBlue", "DodgerBlue", "LightSeaGreen", "ForestGreen", "SeaGreen", "DarkSlateGray", "LimeGreen", "MediumSeaGreen", "Turquoise", "RoyalBlue", "SteelBlue", "DarkSlateBlue", "MediumTurquoise", "Indigo", "DarkOliveGreen", "CadetBlue", "CornflowerBlue", "RebeccaPurple", "MediumAquaMarine", "DimGray", "SlateBlue", "OliveDrab", "SlateGray", "LightSlateGray", "MediumSlateBlue", "LawnGreen", "Chartreuse", "Aquamarine", "Maroon", "Purple", "Olive", "Gray", "SkyBlue", "LightSkyBlue", "BlueViolet", "DarkRed", "DarkMagenta", "SaddleBrown", "Ivory", "White", "DarkSeaGreen", "LightGreen", "MediumPurple", "DarkViolet", "PaleGreen", "DarkOrchid", "YellowGreen", "Sienna", "Brown", "DarkGray", "LightBlue", "GreenYellow", "PaleTurquoise", "LightSteelBlue", "PowderBlue", "FireBrick", "DarkGoldenRod", "MediumOrchid", "RosyBrown", "DarkKhaki", "Silver", "MediumVioletRed", "IndianRed", "Peru", "Chocolate", "Tan", "LightGray", "Thistle", "Orchid", "GoldenRod", "PaleVioletRed", "Crimson", "Gainsboro", "Plum", "BurlyWood", "LightCyan", "Lavender", "DarkSalmon", "Violet", "PaleGoldenRod", "LightCoral", "Khaki", "AliceBlue", "HoneyDew", "Azure", "SandyBrown", "Wheat", "Beige", "WhiteSmoke", "MintCream", "GhostWhite", "Salmon", "AntiqueWhite", "Linen", "LightGoldenRodYellow", "OldLace", "Red", "Fuchsia", "Magenta", "DeepPink", "OrangeRed", "Tomato", "HotPink", "Coral", "DarkOrange", "LightSalmon", "Orange", "LightPink", "Pink", "Gold", "PeachPuff", "NavajoWhite", "Moccasin", "Bisque", "MistyRose", "BlanchedAlmond", "PapayaWhip", "LavenderBlush", "SeaShell", "Cornsilk", "LemonChiffon", "FloralWhite", "Snow", "Yellow", "LightYellow"],
    firstNames: {
      "male": {
        "en": ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Charles", "Thomas", "Christopher", "Daniel", "Matthew", "George", "Donald", "Anthony", "Paul", "Mark", "Edward", "Steven", "Kenneth", "Andrew", "Brian", "Joshua", "Kevin", "Ronald", "Timothy", "Jason", "Jeffrey", "Frank", "Gary", "Ryan", "Nicholas", "Eric", "Stephen", "Jacob", "Larry", "Jonathan", "Scott", "Raymond", "Justin", "Brandon", "Gregory", "Samuel", "Benjamin", "Patrick", "Jack", "Henry", "Walter", "Dennis", "Jerry", "Alexander", "Peter", "Tyler", "Douglas", "Harold", "Aaron", "Jose", "Adam", "Arthur", "Zachary", "Carl", "Nathan", "Albert", "Kyle", "Lawrence", "Joe", "Willie", "Gerald", "Roger", "Keith", "Jeremy", "Terry", "Harry", "Ralph", "Sean", "Jesse", "Roy", "Louis", "Billy", "Austin", "Bruce", "Eugene", "Christian", "Bryan", "Wayne", "Russell", "Howard", "Fred", "Ethan", "Jordan", "Philip", "Alan", "Juan", "Randy", "Vincent", "Bobby", "Dylan", "Johnny", "Phillip", "Victor", "Clarence", "Ernest", "Martin", "Craig", "Stanley", "Shawn", "Travis", "Bradley", "Leonard", "Earl", "Gabriel", "Jimmy", "Francis", "Todd", "Noah", "Danny", "Dale", "Cody", "Carlos", "Allen", "Frederick", "Logan", "Curtis", "Alex", "Joel", "Luis", "Norman", "Marvin", "Glenn", "Tony", "Nathaniel", "Rodney", "Melvin", "Alfred", "Steve", "Cameron", "Chad", "Edwin", "Caleb", "Evan", "Antonio", "Lee", "Herbert", "Jeffery", "Isaac", "Derek", "Ricky", "Marcus", "Theodore", "Elijah", "Luke", "Jesus", "Eddie", "Troy", "Mike", "Dustin", "Ray", "Adrian", "Bernard", "Leroy", "Angel", "Randall", "Wesley", "Ian", "Jared", "Mason", "Hunter", "Calvin", "Oscar", "Clifford", "Jay", "Shane", "Ronnie", "Barry", "Lucas", "Corey", "Manuel", "Leo", "Tommy", "Warren", "Jackson", "Isaiah", "Connor", "Don", "Dean", "Jon", "Julian", "Miguel", "Bill", "Lloyd", "Charlie", "Mitchell", "Leon", "Jerome", "Darrell", "Jeremiah", "Alvin", "Brett", "Seth", "Floyd", "Jim", "Blake", "Micheal", "Gordon", "Trevor", "Lewis", "Erik", "Edgar", "Vernon", "Devin", "Gavin", "Jayden", "Chris", "Clyde", "Tom", "Derrick", "Mario", "Brent", "Marc", "Herman", "Chase", "Dominic", "Ricardo", "Franklin", "Maurice", "Max", "Aiden", "Owen", "Lester", "Gilbert", "Elmer", "Gene", "Francisco", "Glen", "Cory", "Garrett", "Clayton", "Sam", "Jorge", "Chester", "Alejandro", "Jeff", "Harvey", "Milton", "Cole", "Ivan", "Andre", "Duane", "Landon"],
        // Data taken from http://www.dati.gov.it/dataset/comune-di-firenze_0163
        "it": ["Adolfo", "Alberto", "Aldo", "Alessandro", "Alessio", "Alfredo", "Alvaro", "Andrea", "Angelo", "Angiolo", "Antonino", "Antonio", "Attilio", "Benito", "Bernardo", "Bruno", "Carlo", "Cesare", "Christian", "Claudio", "Corrado", "Cosimo", "Cristian", "Cristiano", "Daniele", "Dario", "David", "Davide", "Diego", "Dino", "Domenico", "Duccio", "Edoardo", "Elia", "Elio", "Emanuele", "Emiliano", "Emilio", "Enrico", "Enzo", "Ettore", "Fabio", "Fabrizio", "Federico", "Ferdinando", "Fernando", "Filippo", "Francesco", "Franco", "Gabriele", "Giacomo", "Giampaolo", "Giampiero", "Giancarlo", "Gianfranco", "Gianluca", "Gianmarco", "Gianni", "Gino", "Giorgio", "Giovanni", "Giuliano", "Giulio", "Giuseppe", "Graziano", "Gregorio", "Guido", "Iacopo", "Jacopo", "Lapo", "Leonardo", "Lorenzo", "Luca", "Luciano", "Luigi", "Manuel", "Marcello", "Marco", "Marino", "Mario", "Massimiliano", "Massimo", "Matteo", "Mattia", "Maurizio", "Mauro", "Michele", "Mirko", "Mohamed", "Nello", "Neri", "Niccolò", "Nicola", "Osvaldo", "Otello", "Paolo", "Pier Luigi", "Piero", "Pietro", "Raffaele", "Remo", "Renato", "Renzo", "Riccardo", "Roberto", "Rolando", "Romano", "Salvatore", "Samuele", "Sandro", "Sergio", "Silvano", "Simone", "Stefano", "Thomas", "Tommaso", "Ubaldo", "Ugo", "Umberto", "Valerio", "Valter", "Vasco", "Vincenzo", "Vittorio"],
        // Data taken from http://www.svbkindernamen.nl/int/nl/kindernamen/index.html
        "nl": ["Aaron", "Abel", "Adam", "Adriaan", "Albert", "Alexander", "Ali", "Arjen", "Arno", "Bart", "Bas", "Bastiaan", "Benjamin", "Bob", "Boris", "Bram", "Brent", "Cas", "Casper", "Chris", "Christiaan", "Cornelis", "Daan", "Daley", "Damian", "Dani", "Daniel", "Daniël", "David", "Dean", "Dirk", "Dylan", "Egbert", "Elijah", "Erik", "Erwin", "Evert", "Ezra", "Fabian", "Fedde", "Finn", "Florian", "Floris", "Frank", "Frans", "Frederik", "Freek", "Geert", "Gerard", "Gerben", "Gerrit", "Gijs", "Guus", "Hans", "Hendrik", "Henk", "Herman", "Hidde", "Hugo", "Jaap", "Jan Jaap", "Jan-Willem", "Jack", "Jacob", "Jan", "Jason", "Jasper", "Jayden", "Jelle", "Jelte", "Jens", "Jeroen", "Jesse", "Jim", "Job", "Joep", "Johannes", "John", "Jonathan", "Joris", "Joshua", "Joël", "Julian", "Kees", "Kevin", "Koen", "Lars", "Laurens", "Leendert", "Lennard", "Lodewijk", "Luc", "Luca", "Lucas", "Lukas", "Luuk", "Maarten", "Marcus", "Martijn", "Martin", "Matthijs", "Maurits", "Max", "Mees", "Melle", "Mick", "Mika", "Milan", "Mohamed", "Mohammed", "Morris", "Muhammed", "Nathan", "Nick", "Nico", "Niek", "Niels", "Noah", "Noud", "Olivier", "Oscar", "Owen", "Paul", "Pepijn", "Peter", "Pieter", "Pim", "Quinten", "Reinier", "Rens", "Robin", "Ruben", "Sam", "Samuel", "Sander", "Sebastiaan", "Sem", "Sep", "Sepp", "Siem", "Simon", "Stan", "Stef", "Steven", "Stijn", "Sven", "Teun", "Thijmen", "Thijs", "Thomas", "Tijn", "Tim", "Timo", "Tobias", "Tom", "Victor", "Vince", "Willem", "Wim", "Wouter", "Yusuf"],
        // Data taken from https://fr.wikipedia.org/wiki/Liste_de_pr%C3%A9noms_fran%C3%A7ais_et_de_la_francophonie
        "fr": ["Aaron", "Abdon", "Abel", "Abélard", "Abelin", "Abondance", "Abraham", "Absalon", "Acace", "Achaire", "Achille", "Adalard", "Adalbald", "Adalbéron", "Adalbert", "Adalric", "Adam", "Adegrin", "Adel", "Adelin", "Andelin", "Adelphe", "Adam", "Adéodat", "Adhémar", "Adjutor", "Adolphe", "Adonis", "Adon", "Adrien", "Agapet", "Agathange", "Agathon", "Agilbert", "Agénor", "Agnan", "Aignan", "Agrippin", "Aimable", "Aimé", "Alain", "Alban", "Albin", "Aubin", "Albéric", "Albert", "Albertet", "Alcibiade", "Alcide", "Alcée", "Alcime", "Aldonce", "Aldric", "Aldéric", "Aleaume", "Alexandre", "Alexis", "Alix", "Alliaume", "Aleaume", "Almine", "Almire", "Aloïs", "Alphée", "Alphonse", "Alpinien", "Alverède", "Amalric", "Amaury", "Amandin", "Amant", "Ambroise", "Amédée", "Amélien", "Amiel", "Amour", "Anaël", "Anastase", "Anatole", "Ancelin", "Andéol", "Andoche", "André", "Andoche", "Ange", "Angelin", "Angilbe", "Anglebert", "Angoustan", "Anicet", "Anne", "Annibal", "Ansbert", "Anselme", "Anthelme", "Antheaume", "Anthime", "Antide", "Antoine", "Antonius", "Antonin", "Apollinaire", "Apollon", "Aquilin", "Arcade", "Archambaud", "Archambeau", "Archange", "Archibald", "Arian", "Ariel", "Ariste", "Aristide", "Armand", "Armel", "Armin", "Arnould", "Arnaud", "Arolde", "Arsène", "Arsinoé", "Arthaud", "Arthème", "Arthur", "Ascelin", "Athanase", "Aubry", "Audebert", "Audouin", "Audran", "Audric", "Auguste", "Augustin", "Aurèle", "Aurélien", "Aurian", "Auxence", "Axel", "Aymard", "Aymeric", "Aymon", "Aymond", "Balthazar", "Baptiste", "Barnabé", "Barthélemy", "Bartimée", "Basile", "Bastien", "Baudouin", "Bénigne", "Benjamin", "Benoît", "Bérenger", "Bérard", "Bernard", "Bertrand", "Blaise", "Bon", "Boniface", "Bouchard", "Brice", "Brieuc", "Bruno", "Brunon", "Calixte", "Calliste", "Camélien", "Camille", "Camillien", "Candide", "Caribert", "Carloman", "Cassandre", "Cassien", "Cédric", "Céleste", "Célestin", "Célien", "Césaire", "César", "Charles", "Charlemagne", "Childebert", "Chilpéric", "Chrétien", "Christian", "Christodule", "Christophe", "Chrysostome", "Clarence", "Claude", "Claudien", "Cléandre", "Clément", "Clotaire", "Côme", "Constance", "Constant", "Constantin", "Corentin", "Cyprien", "Cyriaque", "Cyrille", "Cyril", "Damien", "Daniel", "David", "Delphin", "Denis", "Désiré", "Didier", "Dieudonné", "Dimitri", "Dominique", "Dorian", "Dorothée", "Edgard", "Edmond", "Édouard", "Éleuthère", "Élie", "Élisée", "Émeric", "Émile", "Émilien", "Emmanuel", "Enguerrand", "Épiphane", "Éric", "Esprit", "Ernest", "Étienne", "Eubert", "Eudes", "Eudoxe", "Eugène", "Eusèbe", "Eustache", "Évariste", "Évrard", "Fabien", "Fabrice", "Falba", "Félicité", "Félix", "Ferdinand", "Fiacre", "Fidèle", "Firmin", "Flavien", "Flodoard", "Florent", "Florentin", "Florestan", "Florian", "Fortuné", "Foulques", "Francisque", "François", "Français", "Franciscus", "Francs", "Frédéric", "Fulbert", "Fulcran", "Fulgence", "Gabin", "Gabriel", "Gaël", "Garnier", "Gaston", "Gaspard", "Gatien", "Gaud", "Gautier", "Gédéon", "Geoffroy", "Georges", "Géraud", "Gérard", "Gerbert", "Germain", "Gervais", "Ghislain", "Gilbert", "Gilles", "Girart", "Gislebert", "Gondebaud", "Gonthier", "Gontran", "Gonzague", "Grégoire", "Guérin", "Gui", "Guillaume", "Gustave", "Guy", "Guyot", "Hardouin", "Hector", "Hédelin", "Hélier", "Henri", "Herbert", "Herluin", "Hervé", "Hilaire", "Hildebert", "Hincmar", "Hippolyte", "Honoré", "Hubert", "Hugues", "Innocent", "Isabeau", "Isidore", "Jacques", "Japhet", "Jason", "Jean", "Jeannel", "Jeannot", "Jérémie", "Jérôme", "Joachim", "Joanny", "Job", "Jocelyn", "Joël", "Johan", "Jonas", "Jonathan", "Joseph", "Josse", "Josselin", "Jourdain", "Jude", "Judicaël", "Jules", "Julien", "Juste", "Justin", "Lambert", "Landry", "Laurent", "Lazare", "Léandre", "Léon", "Léonard", "Léopold", "Leu", "Loup", "Leufroy", "Libère", "Liétald", "Lionel", "Loïc", "Longin", "Lorrain", "Lorraine", "Lothaire", "Louis", "Loup", "Luc", "Lucas", "Lucien", "Ludolphe", "Ludovic", "Macaire", "Malo", "Mamert", "Manassé", "Marc", "Marceau", "Marcel", "Marcelin", "Marius", "Marseille", "Martial", "Martin", "Mathurin", "Matthias", "Mathias", "Matthieu", "Maugis", "Maurice", "Mauricet", "Maxence", "Maxime", "Maximilien", "Mayeul", "Médéric", "Melchior", "Mence", "Merlin", "Mérovée", "Michaël", "Michel", "Moïse", "Morgan", "Nathan", "Nathanaël", "Narcisse", "Néhémie", "Nestor", "Nestor", "Nicéphore", "Nicolas", "Noé", "Noël", "Norbert", "Normand", "Normands", "Octave", "Odilon", "Odon", "Oger", "Olivier", "Oury", "Pacôme", "Palémon", "Parfait", "Pascal", "Paterne", "Patrice", "Paul", "Pépin", "Perceval", "Philémon", "Philibert", "Philippe", "Philothée", "Pie", "Pierre", "Pierrick", "Prosper", "Quentin", "Raoul", "Raphaël", "Raymond", "Régis", "Réjean", "Rémi", "Renaud", "René", "Reybaud", "Richard", "Robert", "Roch", "Rodolphe", "Rodrigue", "Roger", "Roland", "Romain", "Romuald", "Roméo", "Rome", "Ronan", "Roselin", "Salomon", "Samuel", "Savin", "Savinien", "Scholastique", "Sébastien", "Séraphin", "Serge", "Séverin", "Sidoine", "Sigebert", "Sigismond", "Silvère", "Simon", "Siméon", "Sixte", "Stanislas", "Stéphane", "Stephan", "Sylvain", "Sylvestre", "Tancrède", "Tanguy", "Taurin", "Théodore", "Théodose", "Théophile", "Théophraste", "Thibault", "Thibert", "Thierry", "Thomas", "Timoléon", "Timothée", "Titien", "Tonnin", "Toussaint", "Trajan", "Tristan", "Turold", "Tim", "Ulysse", "Urbain", "Valentin", "Valère", "Valéry", "Venance", "Venant", "Venceslas", "Vianney", "Victor", "Victorien", "Victorin", "Vigile", "Vincent", "Vital", "Vitalien", "Vivien", "Waleran", "Wandrille", "Xavier", "Xénophon", "Yves", "Zacharie", "Zaché", "Zéphirin"]
      },

      "female": {
        "en": ["Mary", "Emma", "Elizabeth", "Minnie", "Margaret", "Ida", "Alice", "Bertha", "Sarah", "Annie", "Clara", "Ella", "Florence", "Cora", "Martha", "Laura", "Nellie", "Grace", "Carrie", "Maude", "Mabel", "Bessie", "Jennie", "Gertrude", "Julia", "Hattie", "Edith", "Mattie", "Rose", "Catherine", "Lillian", "Ada", "Lillie", "Helen", "Jessie", "Louise", "Ethel", "Lula", "Myrtle", "Eva", "Frances", "Lena", "Lucy", "Edna", "Maggie", "Pearl", "Daisy", "Fannie", "Josephine", "Dora", "Rosa", "Katherine", "Agnes", "Marie", "Nora", "May", "Mamie", "Blanche", "Stella", "Ellen", "Nancy", "Effie", "Sallie", "Nettie", "Della", "Lizzie", "Flora", "Susie", "Maud", "Mae", "Etta", "Harriet", "Sadie", "Caroline", "Katie", "Lydia", "Elsie", "Kate", "Susan", "Mollie", "Alma", "Addie", "Georgia", "Eliza", "Lulu", "Nannie", "Lottie", "Amanda", "Belle", "Charlotte", "Rebecca", "Ruth", "Viola", "Olive", "Amelia", "Hannah", "Jane", "Virginia", "Emily", "Matilda", "Irene", "Kathryn", "Esther", "Willie", "Henrietta", "Ollie", "Amy", "Rachel", "Sara", "Estella", "Theresa", "Augusta", "Ora", "Pauline", "Josie", "Lola", "Sophia", "Leona", "Anne", "Mildred", "Ann", "Beulah", "Callie", "Lou", "Delia", "Eleanor", "Barbara", "Iva", "Louisa", "Maria", "Mayme", "Evelyn", "Estelle", "Nina", "Betty", "Marion", "Bettie", "Dorothy", "Luella", "Inez", "Lela", "Rosie", "Allie", "Millie", "Janie", "Cornelia", "Victoria", "Ruby", "Winifred", "Alta", "Celia", "Christine", "Beatrice", "Birdie", "Harriett", "Mable", "Myra", "Sophie", "Tillie", "Isabel", "Sylvia", "Carolyn", "Isabelle", "Leila", "Sally", "Ina", "Essie", "Bertie", "Nell", "Alberta", "Katharine", "Lora", "Rena", "Mina", "Rhoda", "Mathilda", "Abbie", "Eula", "Dollie", "Hettie", "Eunice", "Fanny", "Ola", "Lenora", "Adelaide", "Christina", "Lelia", "Nelle", "Sue", "Johanna", "Lilly", "Lucinda", "Minerva", "Lettie", "Roxie", "Cynthia", "Helena", "Hilda", "Hulda", "Bernice", "Genevieve", "Jean", "Cordelia", "Marian", "Francis", "Jeanette", "Adeline", "Gussie", "Leah", "Lois", "Lura", "Mittie", "Hallie", "Isabella", "Olga", "Phoebe", "Teresa", "Hester", "Lida", "Lina", "Winnie", "Claudia", "Marguerite", "Vera", "Cecelia", "Bess", "Emilie", "Rosetta", "Verna", "Myrtie", "Cecilia", "Elva", "Olivia", "Ophelia", "Georgie", "Elnora", "Violet", "Adele", "Lily", "Linnie", "Loretta", "Madge", "Polly", "Virgie", "Eugenia", "Lucile", "Lucille", "Mabelle", "Rosalie"],
        // Data taken from http://www.dati.gov.it/dataset/comune-di-firenze_0162
        "it": ["Ada", "Adriana", "Alessandra", "Alessia", "Alice", "Angela", "Anna", "Anna Maria", "Annalisa", "Annita", "Annunziata", "Antonella", "Arianna", "Asia", "Assunta", "Aurora", "Barbara", "Beatrice", "Benedetta", "Bianca", "Bruna", "Camilla", "Carla", "Carlotta", "Carmela", "Carolina", "Caterina", "Catia", "Cecilia", "Chiara", "Cinzia", "Clara", "Claudia", "Costanza", "Cristina", "Daniela", "Debora", "Diletta", "Dina", "Donatella", "Elena", "Eleonora", "Elisa", "Elisabetta", "Emanuela", "Emma", "Eva", "Federica", "Fernanda", "Fiorella", "Fiorenza", "Flora", "Franca", "Francesca", "Gabriella", "Gaia", "Gemma", "Giada", "Gianna", "Gina", "Ginevra", "Giorgia", "Giovanna", "Giulia", "Giuliana", "Giuseppa", "Giuseppina", "Grazia", "Graziella", "Greta", "Ida", "Ilaria", "Ines", "Iolanda", "Irene", "Irma", "Isabella", "Jessica", "Laura", "Lea", "Letizia", "Licia", "Lidia", "Liliana", "Lina", "Linda", "Lisa", "Livia", "Loretta", "Luana", "Lucia", "Luciana", "Lucrezia", "Luisa", "Manuela", "Mara", "Marcella", "Margherita", "Maria", "Maria Cristina", "Maria Grazia", "Maria Luisa", "Maria Pia", "Maria Teresa", "Marina", "Marisa", "Marta", "Martina", "Marzia", "Matilde", "Melissa", "Michela", "Milena", "Mirella", "Monica", "Natalina", "Nella", "Nicoletta", "Noemi", "Olga", "Paola", "Patrizia", "Piera", "Pierina", "Raffaella", "Rebecca", "Renata", "Rina", "Rita", "Roberta", "Rosa", "Rosanna", "Rossana", "Rossella", "Sabrina", "Sandra", "Sara", "Serena", "Silvana", "Silvia", "Simona", "Simonetta", "Sofia", "Sonia", "Stefania", "Susanna", "Teresa", "Tina", "Tiziana", "Tosca", "Valentina", "Valeria", "Vanda", "Vanessa", "Vanna", "Vera", "Veronica", "Vilma", "Viola", "Virginia", "Vittoria"],
        // Data taken from http://www.svbkindernamen.nl/int/nl/kindernamen/index.html
        "nl": ["Ada", "Arianne", "Afke", "Amanda", "Amber", "Amy", "Aniek", "Anita", "Anja", "Anna", "Anne", "Annelies", "Annemarie", "Annette", "Anouk", "Astrid", "Aukje", "Barbara", "Bianca", "Carla", "Carlijn", "Carolien", "Chantal", "Charlotte", "Claudia", "Daniëlle", "Debora", "Diane", "Dora", "Eline", "Elise", "Ella", "Ellen", "Emma", "Esmee", "Evelien", "Esther", "Erica", "Eva", "Femke", "Fleur", "Floor", "Froukje", "Gea", "Gerda", "Hanna", "Hanneke", "Heleen", "Hilde", "Ilona", "Ina", "Inge", "Ingrid", "Iris", "Isabel", "Isabelle", "Janneke", "Jasmijn", "Jeanine", "Jennifer", "Jessica", "Johanna", "Joke", "Julia", "Julie", "Karen", "Karin", "Katja", "Kim", "Lara", "Laura", "Lena", "Lianne", "Lieke", "Lilian", "Linda", "Lisa", "Lisanne", "Lotte", "Louise", "Maaike", "Manon", "Marga", "Maria", "Marissa", "Marit", "Marjolein", "Martine", "Marleen", "Melissa", "Merel", "Miranda", "Michelle", "Mirjam", "Mirthe", "Naomi", "Natalie", 'Nienke', "Nina", "Noortje", "Olivia", "Patricia", "Paula", "Paulien", "Ramona", "Ria", "Rianne", "Roos", "Rosanne", "Ruth", "Sabrina", "Sandra", "Sanne", "Sara", "Saskia", "Silvia", "Sofia", "Sophie", "Sonja", "Suzanne", "Tamara", "Tess", "Tessa", "Tineke", "Valerie", "Vanessa", "Veerle", "Vera", "Victoria", "Wendy", "Willeke", "Yvonne", "Zoë"],
        // Data taken from https://fr.wikipedia.org/wiki/Liste_de_pr%C3%A9noms_fran%C3%A7ais_et_de_la_francophonie
        "fr": ["Abdon", "Abel", "Abigaëlle", "Abigaïl", "Acacius", "Acanthe", "Adalbert", "Adalsinde", "Adegrine", "Adélaïde", "Adèle", "Adélie", "Adeline", "Adeltrude", "Adolphe", "Adonis", "Adrastée", "Adrehilde", "Adrienne", "Agathe", "Agilbert", "Aglaé", "Aignan", "Agneflète", "Agnès", "Agrippine", "Aimé", "Alaine", "Alaïs", "Albane", "Albérade", "Alberte", "Alcide", "Alcine", "Alcyone", "Aldegonde", "Aleth", "Alexandrine", "Alexine", "Alice", "Aliénor", "Aliette", "Aline", "Alix", "Alizé", "Aloïse", "Aloyse", "Alphonsine", "Althée", "Amaliane", "Amalthée", "Amande", "Amandine", "Amant", "Amarande", "Amaranthe", "Amaryllis", "Ambre", "Ambroisie", "Amélie", "Améthyste", "Aminte", "Anaël", "Anaïs", "Anastasie", "Anatole", "Ancelin", "Andrée", "Anémone", "Angadrême", "Angèle", "Angeline", "Angélique", "Angilbert", "Anicet", "Annabelle", "Anne", "Annette", "Annick", "Annie", "Annonciade", "Ansbert", "Anstrudie", "Anthelme", "Antigone", "Antoinette", "Antonine", "Aphélie", "Apolline", "Apollonie", "Aquiline", "Arabelle", "Arcadie", "Archange", "Argine", "Ariane", "Aricie", "Ariel", "Arielle", "Arlette", "Armance", "Armande", "Armandine", "Armelle", "Armide", "Armelle", "Armin", "Arnaud", "Arsène", "Arsinoé", "Artémis", "Arthur", "Ascelin", "Ascension", "Assomption", "Astarté", "Astérie", "Astrée", "Astrid", "Athalie", "Athanasie", "Athina", "Aube", "Albert", "Aude", "Audrey", "Augustine", "Aure", "Aurélie", "Aurélien", "Aurèle", "Aurore", "Auxence", "Aveline", "Abigaëlle", "Avoye", "Axelle", "Aymard", "Azalée", "Adèle", "Adeline", "Barbe", "Basilisse", "Bathilde", "Béatrice", "Béatrix", "Bénédicte", "Bérengère", "Bernadette", "Berthe", "Bertille", "Beuve", "Blanche", "Blanc", "Blandine", "Brigitte", "Brune", "Brunehilde", "Callista", "Camille", "Capucine", "Carine", "Caroline", "Cassandre", "Catherine", "Cécile", "Céleste", "Célestine", "Céline", "Chantal", "Charlène", "Charline", "Charlotte", "Chloé", "Christelle", "Christiane", "Christine", "Claire", "Clara", "Claude", "Claudine", "Clarisse", "Clémence", "Clémentine", "Cléo", "Clio", "Clotilde", "Coline", "Conception", "Constance", "Coralie", "Coraline", "Corentine", "Corinne", "Cyrielle", "Daniel", "Daniel", "Daphné", "Débora", "Delphine", "Denise", "Diane", "Dieudonné", "Dominique", "Doriane", "Dorothée", "Douce", "Édith", "Edmée", "Éléonore", "Éliane", "Élia", "Éliette", "Élisabeth", "Élise", "Ella", "Élodie", "Éloïse", "Elsa", "Émeline", "Émérance", "Émérentienne", "Émérencie", "Émilie", "Emma", "Emmanuelle", "Emmelie", "Ernestine", "Esther", "Estelle", "Eudoxie", "Eugénie", "Eulalie", "Euphrasie", "Eusébie", "Évangéline", "Eva", "Ève", "Évelyne", "Fanny", "Fantine", "Faustine", "Félicie", "Fernande", "Flavie", "Fleur", "Flore", "Florence", "Florie", "Fortuné", "France", "Francia", "Françoise", "Francine", "Gabrielle", "Gaëlle", "Garance", "Geneviève", "Georgette", "Gerberge", "Germaine", "Gertrude", "Gisèle", "Guenièvre", "Guilhemine", "Guillemette", "Gustave", "Gwenael", "Hélène", "Héloïse", "Henriette", "Hermine", "Hermione", "Hippolyte", "Honorine", "Hortense", "Huguette", "Ines", "Irène", "Irina", "Iris", "Isabeau", "Isabelle", "Iseult", "Isolde", "Ismérie", "Jacinthe", "Jacqueline", "Jade", "Janine", "Jeanne", "Jocelyne", "Joëlle", "Joséphine", "Judith", "Julia", "Julie", "Jules", "Juliette", "Justine", "Katy", "Kathy", "Katie", "Laura", "Laure", "Laureline", "Laurence", "Laurene", "Lauriane", "Laurianne", "Laurine", "Léa", "Léna", "Léonie", "Léon", "Léontine", "Lorraine", "Lucie", "Lucienne", "Lucille", "Ludivine", "Lydie", "Lydie", "Megane", "Madeleine", "Magali", "Maguelone", "Mallaury", "Manon", "Marceline", "Margot", "Marguerite", "Marianne", "Marie", "Myriam", "Marie", "Marine", "Marion", "Marlène", "Marthe", "Martine", "Mathilde", "Maud", "Maureen", "Mauricette", "Maxime", "Mélanie", "Melissa", "Mélissandre", "Mélisande", "Mélodie", "Michel", "Micheline", "Mireille", "Miriam", "Moïse", "Monique", "Morgane", "Muriel", "Mylène", "Nadège", "Nadine", "Nathalie", "Nicole", "Nicolette", "Nine", "Noël", "Noémie", "Océane", "Odette", "Odile", "Olive", "Olivia", "Olympe", "Ombline", "Ombeline", "Ophélie", "Oriande", "Oriane", "Ozanne", "Pascale", "Pascaline", "Paule", "Paulette", "Pauline", "Priscille", "Prisca", "Prisque", "Pécine", "Pélagie", "Pénélope", "Perrine", "Pétronille", "Philippine", "Philomène", "Philothée", "Primerose", "Prudence", "Pulchérie", "Quentine", "Quiéta", "Quintia", "Quintilla", "Rachel", "Raphaëlle", "Raymonde", "Rebecca", "Régine", "Réjeanne", "René", "Rita", "Rita", "Rolande", "Romane", "Rosalie", "Rose", "Roseline", "Sabine", "Salomé", "Sandra", "Sandrine", "Sarah", "Ségolène", "Séverine", "Sibylle", "Simone", "Sixt", "Solange", "Soline", "Solène", "Sophie", "Stéphanie", "Suzanne", "Sylvain", "Sylvie", "Tatiana", "Thaïs", "Théodora", "Thérèse", "Tiphaine", "Ursule", "Valentine", "Valérie", "Véronique", "Victoire", "Victorine", "Vinciane", "Violette", "Virginie", "Viviane", "Xavière", "Yolande", "Ysaline", "Yvette", "Yvonne", "Zélie", "Zita", "Zoé"]
      }
    },

  };

  var o_hasOwnProperty = Object.prototype.hasOwnProperty;
  var o_keys = (Object.keys || function(obj) {
    var result = [];
    for (var key in obj) {
      if (o_hasOwnProperty.call(obj, key)) {
        result.push(key);
      }
    }

    return result;
  }
  );

  function _copyObject(source, target) {
    var keys = o_keys(source);
    var key;

    for (var i = 0, l = keys.length; i < l; i++) {
      key = keys[i];
      target[key] = source[key] || target[key];
    }
  }

  function _copyArray(source, target) {
    for (var i = 0, l = source.length; i < l; i++) {
      target[i] = source[i];
    }
  }

  function copyObject(source, _target) {
    var isArray = Array.isArray(source);
    var target = _target || (isArray ? new Array(source.length) : {});

    if (isArray) {
      _copyArray(source, target);
    } else {
      _copyObject(source, target);
    }

    return target;
  }

  /** Get the data based on key**/
  Chance.prototype.get = function(name) {
    return copyObject(data[name]);
  }
  ;

  Chance.prototype.normal = function(options) {
    options = initOptions(options, {
      mean: 0,
      dev: 1,
      pool: []
    });

    testRange(options.pool.constructor !== Array, "Chance: The pool option must be a valid array.");
    testRange(typeof options.mean !== 'number', "Chance: Mean (mean) must be a number");
    testRange(typeof options.dev !== 'number', "Chance: Standard deviation (dev) must be a number");

    // If a pool has been passed, then we are returning an item from that pool,
    // using the normal distribution settings that were passed in
    if (options.pool.length > 0) {
      return this.normal_pool(options);
    }

    // The Marsaglia Polar method
    var s, u, v, norm, mean = options.mean, dev = options.dev;

    do {
      // U and V are from the uniform distribution on (-1, 1)
      u = this.random() * 2 - 1;
      v = this.random() * 2 - 1;

      s = u * u + v * v;
    } while (s >= 1);

    // Compute the standard normal variate
    norm = u * Math.sqrt(-2 * Math.log(s) / s);

    // Shape and scale
    return dev * norm + mean;
  }
  ;

  Chance.prototype.normal_pool = function(options) {
    var performanceCounter = 0;
    do {
      var idx = Math.round(this.normal({
        mean: options.mean,
        dev: options.dev
      }));
      if (idx < options.pool.length && idx >= 0) {
        return options.pool[idx];
      } else {
        performanceCounter++;
      }
    } while (performanceCounter < 100);

    throw new RangeError("Chance: Your pool is too small for the given mean and standard deviation. Please adjust.");
  }
  ;

  // Set the data as key and data or the data map
  Chance.prototype.set = function(name, values) {
    if (typeof name === "string") {
      data[name] = values;
    } else {
      data = copyObject(name, data);
    }
  }
  ;

  // -- End Miscellaneous --

  Chance.prototype.mersenne_twister = function(seed) {
    return new MersenneTwister(seed);
  }
  ;

  Chance.prototype.blueimp_md5 = function() {
    return new BlueImpMD5();
  }
  ;

  // Mersenne Twister from https://gist.github.com/banksean/300494
  /*
       A C-program for MT19937, with initialization improved 2002/1/26.
       Coded by Takuji Nishimura and Makoto Matsumoto.

       Before using, initialize the state by using init_genrand(seed)
       or init_by_array(init_key, key_length).

       Copyright (C) 1997 - 2002, Makoto Matsumoto and Takuji Nishimura,
       All rights reserved.

       Redistribution and use in source and binary forms, with or without
       modification, are permitted provided that the following conditions
       are met:

       1. Redistributions of source code must retain the above copyright
       notice, this list of conditions and the following disclaimer.

       2. Redistributions in binary form must reproduce the above copyright
       notice, this list of conditions and the following disclaimer in the
       documentation and/or other materials provided with the distribution.

       3. The names of its contributors may not be used to endorse or promote
       products derived from this software without specific prior written
       permission.

       THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
       "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
       LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
       A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
       CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
       EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
       PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
       PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
       LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
       NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
       SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


       Any feedback is very welcome.
       http://www.math.sci.hiroshima-u.ac.jp/~m-mat/MT/emt.html
       email: m-mat @ math.sci.hiroshima-u.ac.jp (remove space)
     */
  var MersenneTwister = function(seed) {
    if (seed === undefined) {
      // kept random number same size as time used previously to ensure no unexpected results downstream
      seed = Math.floor(Math.random() * Math.pow(10, 13));
    }
    /* Period parameters */
    this.N = 624;
    this.M = 397;
    this.MATRIX_A = 0x9908b0df;
    /* constant vector a */
    this.UPPER_MASK = 0x80000000;
    /* most significant w-r bits */
    this.LOWER_MASK = 0x7fffffff;
    /* least significant r bits */

    this.mt = new Array(this.N);
    /* the array for the state vector */
    this.mti = this.N + 1;
    /* mti==N + 1 means mt[N] is not initialized */

    this.init_genrand(seed);
  };

  /* initializes mt[N] with a seed */
  MersenneTwister.prototype.init_genrand = function(s) {
    this.mt[0] = s >>> 0;
    for (this.mti = 1; this.mti < this.N; this.mti++) {
      s = this.mt[this.mti - 1] ^ (this.mt[this.mti - 1] >>> 30);
      this.mt[this.mti] = (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) + (s & 0x0000ffff) * 1812433253) + this.mti;
      /* See Knuth TAOCP Vol2. 3rd Ed. P.106 for multiplier. */
      /* In the previous versions, MSBs of the seed affect   */
      /* only MSBs of the array mt[].                        */
      /* 2002/01/09 modified by Makoto Matsumoto             */
      this.mt[this.mti] >>>= 0;
      /* for >32 bit machines */
    }
  }
  ;

  /* initialize by an array with array-length */
  /* init_key is the array for initializing keys */
  /* key_length is its length */
  /* slight change for C++, 2004/2/26 */
  MersenneTwister.prototype.init_by_array = function(init_key, key_length) {
    var i = 1, j = 0, k, s;
    this.init_genrand(19650218);
    k = (this.N > key_length ? this.N : key_length);
    for (; k; k--) {
      s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1664525) << 16) + ((s & 0x0000ffff) * 1664525))) + init_key[j] + j;
      /* non linear */
      this.mt[i] >>>= 0;
      /* for WORDSIZE > 32 machines */
      i++;
      j++;
      if (i >= this.N) {
        this.mt[0] = this.mt[this.N - 1];
        i = 1;
      }
      if (j >= key_length) {
        j = 0;
      }
    }
    for (k = this.N - 1; k; k--) {
      s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1566083941) << 16) + (s & 0x0000ffff) * 1566083941)) - i;
      /* non linear */
      this.mt[i] >>>= 0;
      /* for WORDSIZE > 32 machines */
      i++;
      if (i >= this.N) {
        this.mt[0] = this.mt[this.N - 1];
        i = 1;
      }
    }

    this.mt[0] = 0x80000000;
    /* MSB is 1; assuring non-zero initial array */
  }
  ;

  /* generates a random number on [0,0xffffffff]-interval */
  MersenneTwister.prototype.genrand_int32 = function() {
    var y;
    var mag01 = new Array(0x0,this.MATRIX_A);
    /* mag01[x] = x * MATRIX_A  for x=0,1 */

    if (this.mti >= this.N) {
      /* generate N words at one time */
      var kk;

      if (this.mti === this.N + 1) {
        /* if init_genrand() has not been called, */
        this.init_genrand(5489);
        /* a default initial seed is used */
      }
      for (kk = 0; kk < this.N - this.M; kk++) {
        y = (this.mt[kk] & this.UPPER_MASK) | (this.mt[kk + 1] & this.LOWER_MASK);
        this.mt[kk] = this.mt[kk + this.M] ^ (y >>> 1) ^ mag01[y & 0x1];
      }
      for (; kk < this.N - 1; kk++) {
        y = (this.mt[kk] & this.UPPER_MASK) | (this.mt[kk + 1] & this.LOWER_MASK);
        this.mt[kk] = this.mt[kk + (this.M - this.N)] ^ (y >>> 1) ^ mag01[y & 0x1];
      }
      y = (this.mt[this.N - 1] & this.UPPER_MASK) | (this.mt[0] & this.LOWER_MASK);
      this.mt[this.N - 1] = this.mt[this.M - 1] ^ (y >>> 1) ^ mag01[y & 0x1];

      this.mti = 0;
    }

    y = this.mt[this.mti++];

    /* Tempering */
    y ^= (y >>> 11);
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= (y >>> 18);

    return y >>> 0;
  }
  ;

  /* generates a random number on [0,0x7fffffff]-interval */
  MersenneTwister.prototype.genrand_int31 = function() {
    return (this.genrand_int32() >>> 1);
  }
  ;

  /* generates a random number on [0,1]-real-interval */
  MersenneTwister.prototype.genrand_real1 = function() {
    return this.genrand_int32() * (1.0 / 4294967295.0);
    /* divided by 2^32-1 */
  }
  ;

  /* generates a random number on [0,1)-real-interval */
  MersenneTwister.prototype.random = function() {
    return this.genrand_int32() * (1.0 / 4294967296.0);
    /* divided by 2^32 */
  }
  ;

  /* generates a random number on (0,1)-real-interval */
  MersenneTwister.prototype.genrand_real3 = function() {
    return (this.genrand_int32() + 0.5) * (1.0 / 4294967296.0);
    /* divided by 2^32 */
  }
  ;

  /* generates a random number on [0,1) with 53-bit resolution*/
  MersenneTwister.prototype.genrand_res53 = function() {
    var a = this.genrand_int32() >>> 5
      , b = this.genrand_int32() >>> 6;
    return (a * 67108864.0 + b) * (1.0 / 9007199254740992.0);
  }
  ;

  // BlueImp MD5 hashing algorithm from https://github.com/blueimp/JavaScript-MD5
  var BlueImpMD5 = function() {};

  BlueImpMD5.prototype.VERSION = '1.0.1';

  /*
    * Add integers, wrapping at 2^32. This uses 16-bit operations internally
    * to work around bugs in some JS interpreters.
    */
  BlueImpMD5.prototype.safe_add = function safe_add(x, y) {
    var lsw = (x & 0xFFFF) + (y & 0xFFFF)
      , msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }
  ;

  /*
    * Bitwise rotate a 32-bit number to the left.
    */
  BlueImpMD5.prototype.bit_roll = function(num, cnt) {
    return (num << cnt) | (num >>> (32 - cnt));
  }
  ;

  /*
    * These functions implement the five basic operations the algorithm uses.
    */
  BlueImpMD5.prototype.md5_cmn = function(q, a, b, x, s, t) {
    return this.safe_add(this.bit_roll(this.safe_add(this.safe_add(a, q), this.safe_add(x, t)), s), b);
  }
  ;
  BlueImpMD5.prototype.md5_ff = function(a, b, c, d, x, s, t) {
    return this.md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
  }
  ;
  BlueImpMD5.prototype.md5_gg = function(a, b, c, d, x, s, t) {
    return this.md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
  }
  ;
  BlueImpMD5.prototype.md5_hh = function(a, b, c, d, x, s, t) {
    return this.md5_cmn(b ^ c ^ d, a, b, x, s, t);
  }
  ;
  BlueImpMD5.prototype.md5_ii = function(a, b, c, d, x, s, t) {
    return this.md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
  }
  ;

  /*
    * Calculate the MD5 of an array of little-endian words, and a bit length.
    */
  BlueImpMD5.prototype.binl_md5 = function(x, len) {
    /* append padding */
    x[len >> 5] |= 0x80 << (len % 32);
    x[(((len + 64) >>> 9) << 4) + 14] = len;

    var i, olda, oldb, oldc, oldd, a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;

    for (i = 0; i < x.length; i += 16) {
      olda = a;
      oldb = b;
      oldc = c;
      oldd = d;

      a = this.md5_ff(a, b, c, d, x[i], 7, -680876936);
      d = this.md5_ff(d, a, b, c, x[i + 1], 12, -389564586);
      c = this.md5_ff(c, d, a, b, x[i + 2], 17, 606105819);
      b = this.md5_ff(b, c, d, a, x[i + 3], 22, -1044525330);
      a = this.md5_ff(a, b, c, d, x[i + 4], 7, -176418897);
      d = this.md5_ff(d, a, b, c, x[i + 5], 12, 1200080426);
      c = this.md5_ff(c, d, a, b, x[i + 6], 17, -1473231341);
      b = this.md5_ff(b, c, d, a, x[i + 7], 22, -45705983);
      a = this.md5_ff(a, b, c, d, x[i + 8], 7, 1770035416);
      d = this.md5_ff(d, a, b, c, x[i + 9], 12, -1958414417);
      c = this.md5_ff(c, d, a, b, x[i + 10], 17, -42063);
      b = this.md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
      a = this.md5_ff(a, b, c, d, x[i + 12], 7, 1804603682);
      d = this.md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
      c = this.md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
      b = this.md5_ff(b, c, d, a, x[i + 15], 22, 1236535329);

      a = this.md5_gg(a, b, c, d, x[i + 1], 5, -165796510);
      d = this.md5_gg(d, a, b, c, x[i + 6], 9, -1069501632);
      c = this.md5_gg(c, d, a, b, x[i + 11], 14, 643717713);
      b = this.md5_gg(b, c, d, a, x[i], 20, -373897302);
      a = this.md5_gg(a, b, c, d, x[i + 5], 5, -701558691);
      d = this.md5_gg(d, a, b, c, x[i + 10], 9, 38016083);
      c = this.md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
      b = this.md5_gg(b, c, d, a, x[i + 4], 20, -405537848);
      a = this.md5_gg(a, b, c, d, x[i + 9], 5, 568446438);
      d = this.md5_gg(d, a, b, c, x[i + 14], 9, -1019803690);
      c = this.md5_gg(c, d, a, b, x[i + 3], 14, -187363961);
      b = this.md5_gg(b, c, d, a, x[i + 8], 20, 1163531501);
      a = this.md5_gg(a, b, c, d, x[i + 13], 5, -1444681467);
      d = this.md5_gg(d, a, b, c, x[i + 2], 9, -51403784);
      c = this.md5_gg(c, d, a, b, x[i + 7], 14, 1735328473);
      b = this.md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);

      a = this.md5_hh(a, b, c, d, x[i + 5], 4, -378558);
      d = this.md5_hh(d, a, b, c, x[i + 8], 11, -2022574463);
      c = this.md5_hh(c, d, a, b, x[i + 11], 16, 1839030562);
      b = this.md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
      a = this.md5_hh(a, b, c, d, x[i + 1], 4, -1530992060);
      d = this.md5_hh(d, a, b, c, x[i + 4], 11, 1272893353);
      c = this.md5_hh(c, d, a, b, x[i + 7], 16, -155497632);
      b = this.md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
      a = this.md5_hh(a, b, c, d, x[i + 13], 4, 681279174);
      d = this.md5_hh(d, a, b, c, x[i], 11, -358537222);
      c = this.md5_hh(c, d, a, b, x[i + 3], 16, -722521979);
      b = this.md5_hh(b, c, d, a, x[i + 6], 23, 76029189);
      a = this.md5_hh(a, b, c, d, x[i + 9], 4, -640364487);
      d = this.md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
      c = this.md5_hh(c, d, a, b, x[i + 15], 16, 530742520);
      b = this.md5_hh(b, c, d, a, x[i + 2], 23, -995338651);

      a = this.md5_ii(a, b, c, d, x[i], 6, -198630844);
      d = this.md5_ii(d, a, b, c, x[i + 7], 10, 1126891415);
      c = this.md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
      b = this.md5_ii(b, c, d, a, x[i + 5], 21, -57434055);
      a = this.md5_ii(a, b, c, d, x[i + 12], 6, 1700485571);
      d = this.md5_ii(d, a, b, c, x[i + 3], 10, -1894986606);
      c = this.md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
      b = this.md5_ii(b, c, d, a, x[i + 1], 21, -2054922799);
      a = this.md5_ii(a, b, c, d, x[i + 8], 6, 1873313359);
      d = this.md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
      c = this.md5_ii(c, d, a, b, x[i + 6], 15, -1560198380);
      b = this.md5_ii(b, c, d, a, x[i + 13], 21, 1309151649);
      a = this.md5_ii(a, b, c, d, x[i + 4], 6, -145523070);
      d = this.md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
      c = this.md5_ii(c, d, a, b, x[i + 2], 15, 718787259);
      b = this.md5_ii(b, c, d, a, x[i + 9], 21, -343485551);

      a = this.safe_add(a, olda);
      b = this.safe_add(b, oldb);
      c = this.safe_add(c, oldc);
      d = this.safe_add(d, oldd);
    }
    return [a, b, c, d];
  }
  ;

  /*
    * Convert an array of little-endian words to a string
    */
  BlueImpMD5.prototype.binl2rstr = function(input) {
    var i, output = '';
    for (i = 0; i < input.length * 32; i += 8) {
      output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xFF);
    }
    return output;
  }
  ;

  /*
    * Convert a raw string to an array of little-endian words
    * Characters >255 have their high-byte silently ignored.
    */
  BlueImpMD5.prototype.rstr2binl = function(input) {
    var i, output = [];
    output[(input.length >> 2) - 1] = undefined;
    for (i = 0; i < output.length; i += 1) {
      output[i] = 0;
    }
    for (i = 0; i < input.length * 8; i += 8) {
      output[i >> 5] |= (input.charCodeAt(i / 8) & 0xFF) << (i % 32);
    }
    return output;
  }
  ;

  /*
    * Calculate the MD5 of a raw string
    */
  BlueImpMD5.prototype.rstr_md5 = function(s) {
    return this.binl2rstr(this.binl_md5(this.rstr2binl(s), s.length * 8));
  }
  ;

  /*
    * Calculate the HMAC-MD5, of a key and some data (raw strings)
    */
  BlueImpMD5.prototype.rstr_hmac_md5 = function(key, data) {
    var i, bkey = this.rstr2binl(key), ipad = [], opad = [], hash;
    ipad[15] = opad[15] = undefined;
    if (bkey.length > 16) {
      bkey = this.binl_md5(bkey, key.length * 8);
    }
    for (i = 0; i < 16; i += 1) {
      ipad[i] = bkey[i] ^ 0x36363636;
      opad[i] = bkey[i] ^ 0x5C5C5C5C;
    }
    hash = this.binl_md5(ipad.concat(this.rstr2binl(data)), 512 + data.length * 8);
    return this.binl2rstr(this.binl_md5(opad.concat(hash), 512 + 128));
  }
  ;

  /*
    * Convert a raw string to a hex string
    */
  BlueImpMD5.prototype.rstr2hex = function(input) {
    var hex_tab = '0123456789abcdef', output = '', x, i;
    for (i = 0; i < input.length; i += 1) {
      x = input.charCodeAt(i);
      output += hex_tab.charAt((x >>> 4) & 0x0F) + hex_tab.charAt(x & 0x0F);
    }
    return output;
  }
  ;

  /*
    * Encode a string as utf-8
    */
  BlueImpMD5.prototype.str2rstr_utf8 = function(input) {
    return unescape(encodeURIComponent(input));
  }
  ;

  /*
    * Take string arguments and return either raw or hex encoded strings
    */
  BlueImpMD5.prototype.raw_md5 = function(s) {
    return this.rstr_md5(this.str2rstr_utf8(s));
  }
  ;
  BlueImpMD5.prototype.hex_md5 = function(s) {
    return this.rstr2hex(this.raw_md5(s));
  }
  ;
  BlueImpMD5.prototype.raw_hmac_md5 = function(k, d) {
    return this.rstr_hmac_md5(this.str2rstr_utf8(k), this.str2rstr_utf8(d));
  }
  ;
  BlueImpMD5.prototype.hex_hmac_md5 = function(k, d) {
    return this.rstr2hex(this.raw_hmac_md5(k, d));
  }
  ;

  BlueImpMD5.prototype.md5 = function(string, key, raw) {
    if (!key) {
      if (!raw) {
        return this.hex_md5(string);
      }

      return this.raw_md5(string);
    }

    if (!raw) {
      return this.hex_hmac_md5(key, string);
    }

    return this.raw_hmac_md5(key, string);
  }
  ;

  // CommonJS module
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = Chance;
    }
    exports.Chance = Chance;
  }

  // Register as an anonymous AMD module
  if (typeof define === 'function' && define.amd) {
    define([], function() {
      return Chance;
    });
  }

  // if there is a importsScrips object define chance for worker
  // allows worker to use full Chance functionality with seed
  if (typeof importScripts !== 'undefined') {
    chance = new Chance();
    self.Chance = Chance;
  }

  // If there is a window object, that at least has a document property,
  // instantiate and define chance on the window
  if (typeof window === "object" && typeof window.document === "object") {
    window.Chance = Chance;
    window.chance = new Chance();
  }
}
)();
