(function (root, Tyrtle) {
//#JSCOVERAGE_IF
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Tyrtle;
  } else {
    root.Tyrtle = Tyrtle;
  }
}(this, function () {

/**
 * almond 0.2.5 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */
//#JSCOVERAGE_IF 0
var requirejs, require, define;
(function(undef) {
  var main, req, makeMap, handlers, defined = {},
    waiting = {},
    config = {},
    defining = {},
    hasOwn = Object.prototype.hasOwnProperty,
    aps = [].slice;

  function hasProp(obj, prop) {
    return hasOwn.call(obj, prop);
  }

  /**
   * Given a relative module name, like ./something, normalize it to
   * a real name that can be mapped to a path.
   * @param {String} name the relative name
   * @param {String} baseName a real name that the name arg is relative
   * to.
   * @returns {String} normalized name
   */
  function normalize(name, baseName) {
    var nameParts, nameSegment, mapValue, foundMap, foundI, foundStarMap, starI, i, j, part, baseParts = baseName && baseName.split("/"),
      map = config.map,
      starMap = (map && map['*']) || {};

    //Adjust any relative paths.
    if (name && name.charAt(0) === ".") {
      //If have a base name, try to normalize against it,
      //otherwise, assume it is a top-level require that will
      //be relative to baseUrl in the end.
      if (baseName) {
        //Convert baseName to array, and lop off the last part,
        //so that . matches that "directory" and not name of the baseName's
        //module. For instance, baseName of "one/two/three", maps to
        //"one/two/three.js", but we want the directory, "one/two" for
        //this normalization.
        baseParts = baseParts.slice(0, baseParts.length - 1);

        name = baseParts.concat(name.split("/"));

        //start trimDots
        for (i = 0; i < name.length; i += 1) {
          part = name[i];
          if (part === ".") {
            name.splice(i, 1);
            i -= 1;
          } else if (part === "..") {
            if (i === 1 && (name[2] === '..' || name[0] === '..')) {
              //End of the line. Keep at least one non-dot
              //path segment at the front so it can be mapped
              //correctly to disk. Otherwise, there is likely
              //no path mapping for a path starting with '..'.
              //This can still fail, but catches the most reasonable
              //uses of ..
              break;
            } else if (i > 0) {
              name.splice(i - 1, 2);
              i -= 2;
            }
          }
        }
        //end trimDots
        name = name.join("/");
      } else if (name.indexOf('./') === 0) {
        // No baseName, so this is ID is resolved relative
        // to baseUrl, pull off the leading dot.
        name = name.substring(2);
      }
    }

    //Apply map config if available.
    if ((baseParts || starMap) && map) {
      nameParts = name.split('/');

      for (i = nameParts.length; i > 0; i -= 1) {
        nameSegment = nameParts.slice(0, i).join("/");

        if (baseParts) {
          //Find the longest baseName segment match in the config.
          //So, do joins on the biggest to smallest lengths of baseParts.
          for (j = baseParts.length; j > 0; j -= 1) {
            mapValue = map[baseParts.slice(0, j).join('/')];

            //baseName segment has  config, find if it has one for
            //this name.
            if (mapValue) {
              mapValue = mapValue[nameSegment];
              if (mapValue) {
                //Match, update name to the new value.
                foundMap = mapValue;
                foundI = i;
                break;
              }
            }
          }
        }

        if (foundMap) {
          break;
        }

        //Check for a star map match, but just hold on to it,
        //if there is a shorter segment match later in a matching
        //config, then favor over this star map.
        if (!foundStarMap && starMap && starMap[nameSegment]) {
          foundStarMap = starMap[nameSegment];
          starI = i;
        }
      }

      if (!foundMap && foundStarMap) {
        foundMap = foundStarMap;
        foundI = starI;
      }

      if (foundMap) {
        nameParts.splice(0, foundI, foundMap);
        name = nameParts.join('/');
      }
    }

    return name;
  }

  function makeRequire(relName, forceSync) {
    return function() {
      //A version of a require function that passes a moduleName
      //value for items that may need to
      //look up paths relative to the moduleName
      return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
    };
  }

  function makeNormalize(relName) {
    return function(name) {
      return normalize(name, relName);
    };
  }

  function makeLoad(depName) {
    return function(value) {
      defined[depName] = value;
    };
  }

  function callDep(name) {
    if (hasProp(waiting, name)) {
      var args = waiting[name];
      delete waiting[name];
      defining[name] = true;
      main.apply(undef, args);
    }

    if (!hasProp(defined, name) && !hasProp(defining, name)) {
      throw new Error('No ' + name);
    }
    return defined[name];
  }

  //Turns a plugin!resource to [plugin, resource]
  //with the plugin being undefined if the name
  //did not have a plugin prefix.
  function splitPrefix(name) {
    var prefix, index = name ? name.indexOf('!') : -1;
    if (index > -1) {
      prefix = name.substring(0, index);
      name = name.substring(index + 1, name.length);
    }
    return [prefix, name];
  }

  /**
   * Makes a name map, normalizing the name, and using a plugin
   * for normalization if necessary. Grabs a ref to plugin
   * too, as an optimization.
   */
  makeMap = function(name, relName) {
    var plugin, parts = splitPrefix(name),
      prefix = parts[0];

    name = parts[1];

    if (prefix) {
      prefix = normalize(prefix, relName);
      plugin = callDep(prefix);
    }

    //Normalize according
    if (prefix) {
      if (plugin && plugin.normalize) {
        name = plugin.normalize(name, makeNormalize(relName));
      } else {
        name = normalize(name, relName);
      }
    } else {
      name = normalize(name, relName);
      parts = splitPrefix(name);
      prefix = parts[0];
      name = parts[1];
      if (prefix) {
        plugin = callDep(prefix);
      }
    }

    //Using ridiculous property names for space reasons
    return {
      f: prefix ? prefix + '!' + name : name,
      //fullName
      n: name,
      pr: prefix,
      p: plugin
    };
  };

  function makeConfig(name) {
    return function() {
      return (config && config.config && config.config[name]) || {};
    };
  }

  handlers = {
    require: function(name) {
      return makeRequire(name);
    },
    exports: function(name) {
      var e = defined[name];
      if (typeof e !== 'undefined') {
        return e;
      } else {
        return (defined[name] = {});
      }
    },
    module: function(name) {
      return {
        id: name,
        uri: '',
        exports: defined[name],
        config: makeConfig(name)
      };
    }
  };

  main = function(name, deps, callback, relName) {
    var cjsModule, depName, ret, map, i, args = [],
      usingExports;

    //Use name if no relName
    relName = relName || name;

    //Call the callback to define the module, if necessary.
    if (typeof callback === 'function') {

      //Pull out the defined dependencies and pass the ordered
      //values to the callback.
      //Default to [require, exports, module] if no deps
      deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
      for (i = 0; i < deps.length; i += 1) {
        map = makeMap(deps[i], relName);
        depName = map.f;

        //Fast path CommonJS standard dependencies.
        if (depName === "require") {
          args[i] = handlers.require(name);
        } else if (depName === "exports") {
          //CommonJS module spec 1.1
          args[i] = handlers.exports(name);
          usingExports = true;
        } else if (depName === "module") {
          //CommonJS module spec 1.1
          cjsModule = args[i] = handlers.module(name);
        } else if (hasProp(defined, depName) || hasProp(waiting, depName) || hasProp(defining, depName)) {
          args[i] = callDep(depName);
        } else if (map.p) {
          map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
          args[i] = defined[depName];
        } else {
          throw new Error(name + ' missing ' + depName);
        }
      }

      ret = callback.apply(defined[name], args);

      if (name) {
        //If setting exports via "module" is in play,
        //favor that over return value and exports. After that,
        //favor a non-undefined return value over exports use.
        if (cjsModule && cjsModule.exports !== undef && cjsModule.exports !== defined[name]) {
          defined[name] = cjsModule.exports;
        } else if (ret !== undef || !usingExports) {
          //Use the return value from the function.
          defined[name] = ret;
        }
      }
    } else if (name) {
      //May just be an object definition for the module. Only
      //worry about defining if have a module name.
      defined[name] = callback;
    }
  };

  requirejs = require = req = function(deps, callback, relName, forceSync, alt) {
    if (typeof deps === "string") {
      if (handlers[deps]) {
        //callback in this case is really relName
        return handlers[deps](callback);
      }
      //Just return the module wanted. In this scenario, the
      //deps arg is the module name, and second arg (if passed)
      //is just the relName.
      //Normalize module name, if it contains . or ..
      return callDep(makeMap(deps, callback).f);
    } else if (!deps.splice) {
      //deps is a config object, not an array.
      config = deps;
      if (callback.splice) {
        //callback is an array, which means it is a dependency list.
        //Adjust args if there are dependencies
        deps = callback;
        callback = relName;
        relName = null;
      } else {
        deps = undef;
      }
    }

    //Support require(['a'])
    callback = callback ||
    function() {};

    //If relName is a function, it is an errback handler,
    //so remove it.
    if (typeof relName === 'function') {
      relName = forceSync;
      forceSync = alt;
    }

    //Simulate async callback;
    if (forceSync) {
      main(undef, deps, callback, relName);
    } else {
      //Using a non-zero value because of concern for what old browsers
      //do, and latest browsers "upgrade" to 4 if lower value is used:
      //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
      //If want a value immediately, use require('id') instead -- something
      //that works in almond on the global level, but not guaranteed and
      //unlikely to work in other AMD implementations.
      setTimeout(function() {
        main(undef, deps, callback, relName);
      }, 4);
    }

    return req;
  };

  /**
   * Just drops the config on the floor, but returns req in case
   * the config return value is used.
   */
  req.config = function(cfg) {
    config = cfg;
    if (config.deps) {
      req(config.deps, config.callback);
    }
    return req;
  };

  define = function(name, deps, callback) {

    //This module may not have dependencies
    if (!deps.splice) {
      //deps is not an array, so probably means
      //an object literal or factory function for
      //the value. Adjust args.
      callback = deps;
      deps = [];
    }

    if (!hasProp(defined, name) && !hasProp(waiting, name)) {
      waiting[name] = [name, deps, callback];
    }
  };

  define.amd = {
    jQuery: true
  };
}());
//#JSCOVERAGE_ENDIF
;
define("../vendor/almond", function(){});

define('renderer',['require','exports','module'],function (require, exports, module) {var renderer;

module.exports = {
  get: function () {
    return renderer;
  },
  set: function (r) {
    renderer = r;
  }
};

});

define('root',['require','exports','module'],function (require, exports, module) {/**
 * Gets the global object
 */
module.exports = (function () {
  return this || (0 || eval)('this');
}());

});

define('util',['require','exports','module','root'],function (require, exports, module) {/**
 * Helper methods for Tyrtle. These are also exported on Tyrtle.util
 */
//#JSCOVERAGE_IF 0
var util,
    root = require('root'),
    nativeBind = Function.prototype.bind,
    slice = Array.prototype.slice;

function Ctor() {}

module.exports = util = {
  extend: function (target, source) {
    var i;
    for (i in source) {
      if (source.hasOwnProperty(i)) {
        target[i] = source[i];
      }
    }
    return target;
  },

  timeout: function (fn /*, time, context*/) {
    var args = slice.call(arguments, 1),
        timeoutId,
        timeoutObj;

    args.unshift(function () {
      timeoutObj.clear();
      timeoutObj.executed = true;
      fn.apply(this, arguments);
    });
    timeoutId = root.setTimeout.apply(root, args);
    timeoutObj = {
      clear: util.bind(root.clearTimeout, root, timeoutId),
      executed: false
    };
    return timeoutObj;
  },
  defer: !root.postMessage
        /**
         * The regular defer method using a 0ms setTimeout. In reality, this will be executed in 4-10ms.
         */
        ? function (fn) {
          setTimeout(fn, 0);
        }
        /**
         * The postMessage defer method which will get executed as soon as the call stack has cleared.
         * Credit to David Baron: http://dbaron.org/log/20100309-faster-timeouts
         */
        : (function () {
          var timeouts = [], messageName = "zero-timeout-message", setZeroTimeout, handleMessage;

          setZeroTimeout = function (fn) {
            timeouts.push(fn);
            root.postMessage(messageName, "*");
          };

          handleMessage = function (event) {
            if (event.source === root && event.data === messageName) {
              event.stopPropagation();
              if (timeouts.length > 0) {
                var fn = timeouts.shift();
                fn();
              }
            }
          };

          root.addEventListener("message", handleMessage, true);

          return function (func) {
            setZeroTimeout(func);
          };
        }()),
  noop: function () {},
  each: function (obj, iterator, context) {
    if (obj !== null && typeof obj !== 'undefined') {
      if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
        obj.forEach(iterator, context);
      } else {
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            iterator.call(context, obj[key], key, obj);
          }
        }
      }
    }
  },
  /**
   * PhantomJS's Object.keys implementation is buggy. It gives the following results:
   *    window.hasOwnProperty('setTimeout') === true
   *    Object.keys(window).indexOf('setTimeout') === -1
   * So, we're always falling back to the manual method
   */
  getKeys: function (obj) {
    /*jslint newcap : false */
    if (obj !== Object(obj)) {
      throw new TypeError('Invalid object');
    }
    /*jslint newcap : true */

    var keys = [], key;
    for (key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        keys[keys.length] = key;
      }
    }
    return keys;
  },
  isRegExp: function (obj) {
    return !!(obj && obj.test && obj.exec && (obj.ignoreCase || obj.ignoreCase === false));
  },
  isFunction: function(obj) {
    return Object.prototype.toString.call(obj) === '[object Function]';
  },
  /**
   * This function is taken from Underscore.js 1.1.6
   * (c) 2011 Jeremy Ashkenas, DocumentCloud Inc.
   * http://documentcloud.github.com/underscore
   */
  isEqual: function (a, b) {
    /*jslint eqeqeq: false */
    var aKeys, atype, bKeys, btype, key;
    // Check object identity.
    if (a === b) {
      return true;
    }
    // Different types?
    atype = typeof(a);
    btype = typeof(b);

    if (atype !== btype) {
      return false;
    }
    // One is falsy and the other truthy.
    if ((!a && b) || (a && !b)) {
      return false;
    }
    // One of them implements an isEqual()?
    if (a.isEqual) {
      return a.isEqual(b);
    }
    if (b.isEqual) {
      return b.isEqual(a);
    }
    // Check dates' integer values.
    if (util.isDate(a) && util.isDate(b)) {
      return a.getTime() === b.getTime();
    }
    // Both are NaN?
    if (a !== a && b !== b) {
      return false;
    }
    // Compare regular expressions.
    if (util.isRegExp(a) && util.isRegExp(b)) {
      return a.source     === b.source
          && a.global     === b.global
          && a.ignoreCase === b.ignoreCase
          && a.multiline  === b.multiline
      ;
    }
    // If a is not an object by this point, we can't handle it.
    if (atype !== 'object') {
      return false;
    }
    // Check for different array lengths before comparing contents.
    if (a.length && (a.length !== b.length)) {
      return false;
    }
    // Nothing else worked, deep compare the contents.
    aKeys = util.getKeys(a);
    bKeys = util.getKeys(b);
    // Different object sizes?
    if (aKeys.length !== bKeys.length) {
      return false;
    }
    // Recursive comparison of contents.
    for (key in a) {
      if (!(key in b) || !util.isEqual(a[key], b[key])) {
        return false;
      }
    }
    /*jslint eqeqeq: true */
    return true;
  },
  isDate: function isDate (obj) {
    return !!(obj && obj.getTimezoneOffset && obj.setUTCFullYear);
  },
  isArray: Array.isArray || function isArray (obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  },
  // This method stolen from Underscore
  bind: function bind(func, context) {
    var bound, args;
    if (func.bind === nativeBind && nativeBind) {
      return nativeBind.apply(func, slice.call(arguments, 1));
    }
    if (!util.isFunction(func)) {
      throw new TypeError;
    }
    args = slice.call(arguments, 2);
    bound = function() {
      if (!(this instanceof bound)) {
        return func.apply(context, args.concat(slice.call(arguments)));
      }
      Ctor.prototype = func.prototype;
      var self = new Ctor;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) {
        return result;
      }
      return self;
    };
    return bound;
  }
};

//#JSCOVERAGE_ENDIF

});

define('AssertionError',['require','exports','module','renderer','util'],function (require, exports, module) {/**
 * AssertionError exception class. An instance of this class is thrown whenever an assertion fails.
 * @class
 * @param {String} msg A message for the failed assertion, this is defined by the assertion itself.
 * @param {Array} args Arguments passed to the assertion, these are used to substitute into the error message.
 * @param {String} userMessage An error message as defined by the user.
 */
var AssertionError,
    renderer = require('renderer'),
    util = require('util');

module.exports = AssertionError = function (msg, args, userMessage) {
  var newError = new Error(),
      re_stack = /([^(\s]+\.js):(\d+):(\d+)/g
  ;
  this.message = renderer.get().templateString.apply(
    renderer.get(),
    [(msg || "") + (msg && userMessage ? ": " : "") + (userMessage || "")].concat(args)
  );
  if (newError.stack) { // TODO: cross-browser implementation
    this.stack = [];
    util.each(newError.stack.match(re_stack), function (str) {
      re_stack.lastIndex = 0;
      var parts = re_stack.exec(str);
      if (parts) {
        this.stack.push(parts.slice(1));
      }
    }, this);

    this.stack = this.stack.slice(3);
  }
};
AssertionError.prototype.name = "AssertionError";

});

define('Assert',['require','exports','module','AssertionError','util','root'],function (require, exports, module) {var Assert,
    AssertionError = require('AssertionError'),
    assertions,
    currentTestAssertions = 0,
    internalAssertionCount = 0,
    unexecutedAssertions = 0,
    originalUnexecutedAssertions,
    bodies,
    oldGlobals,
    temporaryAssertions = {},
    temporaryAssertionsNegated = {},
    assertionsNegated = {},
    slice = Array.prototype.slice,
    util = require('util'),
    root = require('root');

module.exports = Assert = {
  // this is the actual function passed to the tests
  assert: assert,

  /**
   * Reset counters so that we can test for the expected number of assertions, leaking globals and unexecuted assertions
   */
  startTest: function () {
    currentTestAssertions = 0;
    originalUnexecutedAssertions = unexecutedAssertions;
    oldGlobals = util.getKeys(root);
  },

  /**
   * Run post-test assertions: expected # of assertions, unexecuted assertions and leaking globals.
   * @param  {Test} test
   */
  endTest: function (test) {
    if (test.expectedAssertions !== -1) {
      assert
        .that(currentTestAssertions)
        .is(test.expectedAssertions)
        .since('This test should have executed the expected number of assertions');
    }
    test.assertionCount = currentTestAssertions;

    if (unexecutedAssertions !== originalUnexecutedAssertions) {
      throw new AssertionError('This test defines assertions which are never executed');
    }

    util.each(util.getKeys(root), function (newGlobal) {
      if (oldGlobals.indexOf(newGlobal) < 0) {
        throw new AssertionError('Test introduced new global variable "{0}"', [newGlobal]);
      }
    });
  },

  /**
   *  Global assertions, added to all modules of all instances of Tyrtle
   *  @param {Object} newAssertions A map of AssertionName => AssertionFunction
   */
  addAssertions : function (newAssertions) {
    util.each(newAssertions, function (fn, name) {
      assertions[name] = function () {
        return build.apply(null, [fn, "", this.subject].concat(slice.apply(arguments)));
      };
      assertionsNegated[name] = function () {
        return invert(assertions[name].apply(this, arguments));
      };
    });
  },
  /**
   * Check whether an assertion exists.
   * @param  {String} assertionName The name of an assertion to check
   * @return {Boolean}
   */
  hasAssertion : function (assertionName) {
    return assertions.hasOwnProperty(assertionName);
  },
  /**
   * Remove an assertion.
   * @param  {String} assertionName The name of an assertions to remove
   */
  removeAssertion : function (assertionName) {
    delete assertions[assertionName];
    delete assertionsNegated[assertionName];
  },

  setTemporaryAssertions: function (newAssertions) {
    Assert.clearTemporaryAssertions();

    util.each(newAssertions, function (fn, key) {
      temporaryAssertions[key] = function () {
        return build.apply(null, [fn, "", this.subject].concat(slice.apply(arguments)));
      };
      temporaryAssertionsNegated[key] = function () {
        return invert(build.apply(null, [fn, "", this.subject].concat(slice.apply(arguments))));
      };
    });
  },

  clearTemporaryAssertions: function () {
    var key;
    for (key in temporaryAssertions) {
      if (temporaryAssertions.hasOwnProperty(key)) {
        delete temporaryAssertions[key];
      }
    }
  }
};


bodies = {
  ok: function (a) {
    return !!a;
  },
  ofType: function (a, e) {
    var type = typeof a;
//#JSCOVERAGE_IF typeof /a/ === 'function'
    // webkit (incorrectly?) reports regexes as functions. Normalize this to 'object'.
    if (type === 'function' && a.constructor === RegExp) {
      type = 'object';
    }
//#JSCOVERAGE_ENDIF
    switch (e.toLowerCase()) {
    case 'array' :
      return util.isArray(a);
    case 'date' :
      return util.isDate(a);
    case 'regexp' :
      return util.isRegExp(a);
    default :
      return type === e;
    }
  },
  matches: function (a, m) {
    return m.test(a);
  },
  startsWith: function (a, n) {
    if (typeof a !== 'string') {
      return [
        "Actual value {0} is of type {2}, therefore it can not start with {1} as expected",
        typeof a
      ];
    }
    return a.length >= n.length && n === a.substr(0, n.length);
  },
  endsWith: function (a, n) {
    if (typeof a !== 'string') {
      return [
        "Actual value {0} is of type {2}, therefore it can not end with {1} as expected",
        typeof a
      ];
    }
    return a.length >= n.length && n === a.substr(-n.length);
  },
  contains: function (a, n) {
    return a.indexOf(n) !== -1 || (typeof a === 'string' ? "%1 substring {1}" : "%1 element {1}");
  },
  willThrow: function (f, expectedError) {
    try {
      f();
      return "The function unexpectedly threw no errors";
    } catch (e) {
      if (expectedError) {
        var noMatch = [
          "An error {2} was thrown, but it did not match the expected error {1}",
          e.message || e
        ];
        if (typeof expectedError === 'string') {
          if (expectedError !== (e.message || e)) {
            return noMatch;
          }
        } else if (util.isRegExp(expectedError)) {
          if (!expectedError.test(e.message || e)) {
            return [
              "An error {2} was thrown, but it did not match the expected error {1}",
              e.message || e
            ];
          }
        } else if (typeof expectedError === 'function' && !(e instanceof expectedError)) {
          return [
            "An error {2} was thrown, but it was not an instance of {1} as expected",
            e
          ];
        }
        return true;
      } else {
        return true;
      }
    }
  },
  wontThrow: function (f) {
    try {
      f();
      return true;
    } catch (e) {
      return ["%1 {1}", e];
    }
  },
  called: function (subject, numTimes) {
    var cc;
    if (subject && typeof subject.callCount === 'function') {
      cc = subject.callCount();
      if (numTimes != null) {
        return cc === numTimes || ["%1", cc];
      } else {
        return cc > 0 || "Function was not called";
      }
    } else {
      return "Object is not a Myrtle handle";
    }
  },
  is: function (a, e) {
    if (a !== a) { // NaN
      return e !== e;
    } else {
      return a === e;
    }
  },
  not: function (a, un) {
    if (a !== a && un !== un) {
      return false;
    } else {
      return a !== un;
    }
  },
  nullish: function (a) {
    return a == null;
  }
};
assertions = {
  /**
   * Assert that a value is truthy, (`subject == true`)
   */
  ok: function () {
    return build(
      bodies.ok,
      "Actual value {0} was not truthy as expected",
      this.subject
    );
  },

  nullish: function () {
    return build(
      bodies.nullish,
      "Actual value {0} was not null or undefined as expected",
      this.subject
    );
  },
  /**
   * Assert the type of a variable.
   *
   * Allows some types additional to the built-in native types to simplify tests:
   *
   * - 'array'
   * - 'date'
   * - 'regexp'
   *
   *      assert.that(/foo/).is.ofType('regexp')();
   *
   * It is important to note however that asserting type 'object' will pass for all of these types
   *
   *     assert.that([]).is.ofType('object')();  // } these both
   *     assert.that([]).is.ofType('array')();   // } work
   *
   * @param  {String} expectedType
   */
  ofType : function (expectedType) {
    return build(
      bodies.ofType,
      "Type of value {0} was not {1} as expected",
      this.subject,
      expectedType
    );
  },
  /**
   * Assert that a String matches a given regex
   *
   * @param  {RegExp} match The regular expression to match against
   */
  matches : function (match) {
    return build(
      bodies.matches,
      "{0} does not match the expected {1}",
      this.subject,
      match
    );
  },
  /**
   * Assert that the subject string starts with the given substring.
   *
   * @param  {String} needle The value which should be at the start of subject.
   */
  startsWith : function (needle) {
    return build(
      bodies.startsWith,
      "Actual value {0} does not begin with {1} as expected",
      this.subject,
      needle
    );
  },
  /**
   * Assert that the subject string ends with the given substring.
   *
   * @param  {String} needle
   */
  endsWith : function (needle) {
    return build(
      bodies.endsWith,
      "Actual value {0} does not end with {1} as expected",
      this.subject,
      needle
    );
  },
  /**
   * Assert that a String or Array contains a substring or element. The test is performed using the `.indexOf`
   * method of the subject, so it can actually apply to any object which implements this method.
   *
   * @param  {*} needle
   */
  contains : function (needle) {
    return build(
      bodies.contains,
      "Actual value {0} does not contain the expected",
      this.subject,
      needle
    );
  },
  /**
   * Assert that a function will throw an error when executed. Additionally, a specific type of error or error
   * message can be expected. If this is specified and an error is thrown which does not match the
   * expectation, the assertion will fail.
   *
   * Though the expected error type/message is optional, it is highly recommended to use it, otherwise if your
   * function is failing in a way which you did not expect, that error will be swallowed and your tests will
   * still pass.
   *
   * The `expectedError` argument can be a string or a regex (in which case these are compared against the
   * error's `.message` property), or a constructor (in which case, the thrown error should be an instance of
   * this function).
   *
   *      assert.that(function () {
   *          (0)();
   *      }).willThrow(TypeError);
   *
   * @param  {String|RegExp|Function} expectedError
   */
  willThrow : function (expectedError) {
    return build(
      bodies.willThrow,
      "",
      this.subject, // a function
      expectedError
    );
  },
  /**
   * Assert that a function will not throw any errors when executed.
   *
   * The given function will be executed with no arguments or context. If you require arguments, then a
   * closure should be used. This assertion only be applied to subjects of type `function`.
   */
  wontThrow : function () {
    return build(
      bodies.wontThrow,
      "Function unexpectedly raised an error",
      this.subject
    );
  },
  /**
   * Assert that two objects have the same values (deep equality).
   *
   * This assertion should be used when you want to compare two objects to see that they contain the same
   * values. If you are asserting with primitives such as strings or numbers, then it is faster to use `.is`
   *
   *     assert({a : 'bar', b : 'baz'}).equals({b : 'baz', a : 'bar'})(); // PASS, same keys and values.
   *
   * @param  {Object} object
   */
  equals : function (object) {
    return build(
      util.isEqual,
      "Actual value {0} did not match expected value {1} with object comparison.",
      this.subject,
      object
    );
  },
  /**
   * Assert that a function which has been spied upon by Myrtle has been called a exactly this many times.
   * If no value is passed to this assertion, then it will assert that the function has been called *at least
   * once*.
   *
   * @example
   *  Myrtle.spy(obj, 'myFunc').and(function () {
   *      // `this` is the Myrtle handle
   *      doSomething();
   *      assert.that(this).is.called(3).since("obj.myFunc should have been called 3 times");
   *  });
   *
   * @example
   *  assert.that(handle).is.called()("The function should have been called at least once");
   *
   * @param {Number=} numTimes The number of times which the function should have been called.
   */
  called : function (numTimes) {
    return build(
      bodies.called,
      "Function call count is {2} when a value of {1} was expected",
      this.subject,
      numTimes
    );
  }
};
/**
 * The assertion starting point. This is the actual function passed in to each test. The value passed as an
 * argument to this function is used as the *subject* of the assertion.
 *
 * @param  {*} actual A value which is the subject of this assertion
 * @return {Function} A function which initiates an `is` assertion. Other types of assertion are stored as
 *                    properties of this function.
 */
function assert (actual) {
  /**
   * Assert that the subject is identical (`===`, same value and type) to another value.
   *
   * For comparing the members of objects (including Arrays, Dates, etc), the `equals` assertion usually more
   * appropriate. For example,
   *
   *     assert.that([1, 2, 3]).is([1, 2, 3])(); // FAIL, they are not the same object
   *     assert.that([1, 2, 3]).equals([1, 2, 3])(); // PASS, each of their members have the same value.
   *
   * @param {*} expected
   */
  function is(expected) {
    return build(
      bodies.is,
      "Actual value {0} did not match expected value {1}",
      is.subject,
      expected
    );
  }

  /**
   * Assert that two values are not identical. Uses strict equality checking: `!==`.
   *
   * @param {*} unexpected The value which should be different
   */
  is.not = function (unexpected) {
    return build(
      bodies.not,
      "Actual value was the same as the unexpected value {0}",
      this.subject,
      unexpected
    );
  };
  is.__proto__ = temporaryAssertions; // is -> temporaryAssertions -> globalAssertions -> Function prototype
  is.not.__proto__ = temporaryAssertionsNegated;

  // Store the subject onto the `is` and `is.not` so `this.subject` works in both cases
  is.subject = is.not.subject = actual;
  is.is = is; // head hurts.
  return is;
}
assert.that = assert;

temporaryAssertions.__proto__ = assertions;
assertions.__proto__ = Function.prototype;

temporaryAssertionsNegated.__proto__ = assertionsNegated;
assertionsNegated.__proto__ = Function.prototype;


util.each(assertions, function (fn, key) {
  assertionsNegated[key] = function () {
    return invert(assertions[key].apply(this, arguments));
  };
});

/**
 * Handle the result of running an assertion.
 * @param  {Boolean|String|Array} result The result of the assertion. True or undefined for "pass", any other
 *                                       value for failure. A string is used as the error message, and an array
 *                                       should contain an error message in the first position, followed by
 *                                       additional arguments to be substituted into the message.
 * @param  {Array} args The arguments passed to the assertion function
 * @param  {String} message The default assertion error message
 * @param  {String} userMessage The user-supplied error message
 * @throws {AssertionError} If the assertion failed.
 */
function handleAssertionResult(result, args, message, userMessage) {
  var isArr;
  // success can be signalled by returning true, or returning nothing.
  if (result !== true && typeof result !== 'undefined') {
    isArr = util.isArray(result);

    // if we have an array
    if (isArr) {
      // grab all but the first element and add that to the arguments
      args = args.concat(result.slice(1));
      // grab the first element and make that the error message
      result = result[0];
    }
    // if the result is a string, use that instead of the default
    if (typeof result === 'string') {
      // the default message can be inserted by using '%1' in the error
      message = result.replace(/%1/, message || '');
    }
    throw new AssertionError(message, args, userMessage);
  }
}

/**
 *  Builds the actual assertion function.
 *  @param {Function} condition The function which tests the assertion
 *  @param {String} message A default assertions message.
 *  @param {*...} Additional arguments which are to be passed to the condition function
 *  @return {Function} The assertion, ready to run.
 */
function build (condition, message/*, args */) {
  var args = Array.prototype.slice.call(arguments, 2),
      since;
  ++unexecutedAssertions;
  since = function (userMessage) {
    try {
      if (internalAssertionCount++ === 0) {
        ++currentTestAssertions;
      }
      // if this is the first time we've executed this assertion, then decrease the counter, and don't count this
      // one again
      if (!since.executed) {
        --unexecutedAssertions;
        since.executed = true;
      }
      handleAssertionResult(condition.apply(assert, args), args, message, userMessage);
    } finally {
      --internalAssertionCount;
    }
  };
  since.executed = false;
  since.since = since;
  return since;
}

function invert (normalSince) {
  var since = function (userMessage) {
    var ok = false,
        message;
    try {
      normalSince(userMessage);
      message = 'The assertion passed when it was not supposed to';
    } catch (e) {
      if (!(e instanceof AssertionError)) {
        throw e;
      } else {
        message = e.message;
        ok = true;
      }
    }
    handleAssertionResult(ok, [], message, userMessage);
  };
  since.since = since;
  return since;
}

});

define('SkipMe',['require','exports','module'],function (require, exports, module) {/**
 * SkipMe exception. This is thrown by tests when `this.skip()` or `this.skipIf(true)` is called.
 * @class
 * @param {String} reason A reason for this test to be skipped.
 */
var SkipMe;
module.exports = SkipMe = function (reason) {
  this.message = reason;
};
SkipMe.prototype.name = 'SkipMe';

});

define('testStatuses',['require','exports','module'],function (require, exports, module) {module.exports = {
  PASS: 0,
  FAIL: 1,
  SKIP: 2
};

});

define('Test',['require','exports','module','Assert','AssertionError','root','SkipMe','testStatuses','util'],function (require, exports, module) {
var Test,
    Assert         = require('Assert'),
    AssertionError = require('AssertionError'),
    root           = require('root'),
    SkipMe         = require('SkipMe'),
    testStatuses   = require('testStatuses'),
    util           = require('util'),
    PASS = testStatuses.PASS,
    SKIP = testStatuses.SKIP,
    FAIL = testStatuses.FAIL;

module.exports = Test = function Test (name, expectedAssertions, body, asyncFn) {
  if (typeof expectedAssertions !== 'number') {
    asyncFn = body;
    body = expectedAssertions;
  } else {
    this.expect(expectedAssertions);
  }
  if (typeof name !== 'string') {
    throw new Error('Test instantiated without a name.');
  }
  this.name = name;
  this.body = body;
  this.asyncFn = asyncFn;
};

util.extend(Test.prototype, {
  /** @type {Status} one of PASS, FAIL, SKIP or null */
  status : null,
  statusMessage: '',
  runTime : -1,
  error : null,       // If an error (not an AssertionError is thrown it is stored here)
  exception : null,   // Any thrown error is stored here (including AssertionErrors)
  asyncFn : null,
  expectedAssertions : -1,
  assertionCount: 0,
  module: null,
  ///////////////
  /**
   *  Skip this test.
   *  @param {String=} reason A reason why this test is being skipped.
   */
  skip : function (reason) {
    throw new SkipMe(reason);
  },
  /**
   *  Conditionally skip this test.
   *  @example
   *  this.skipIf(typeof window === 'undefined', "Test only applies to browsers")
   *  @param {Boolean} condition
   *  @param {String=} reason A reason why this test is being skipped.
   */
  skipIf : function (condition, reason) {
    if (condition) {
      this.skip(reason);
    }
  },
  /**
   *  Expect an exact number of assertions that should be run by this test.
   *  @param {Number} numAssertions
   */
  expect : function (numAssertions) {
    this.expectedAssertions = numAssertions;
  },

  getTimeout: function () {
    return this.timeout || this.module.getTimeout();
  },

  setTimeout: function (time) {
    this.timeout = Math.max(time, 0);
  },

  run : function (callback) {
    var start, success, handleError,
        asyncTestCallback,
        timeout,
        callbackExecuted = false, test = this;

    success = function () {
      test.runTime = new Date() - start;
      test.status = PASS;
      test.statusMessage = 'Passed';
      callback(test);
    };
    handleError = function (e) {
      var message = (e && e.message) || String(e);
      if (e instanceof SkipMe) {
        test.status = SKIP;
        test.statusMessage = "Skipped" + (e.message ? " because " + e.message : "");
      } else {
        test.status = FAIL;
        test.statusMessage = "Failed" + (message ? ": " + message : "");
        test.exception = e;
        if (!(e instanceof AssertionError)) {
          test.error = e;
        }
      }
      callback(test);
    };
    try {
      Assert.startTest();
      start = new Date();
      if (this.asyncFn) {
        // actually executes the asyncTest here.
        asyncTestCallback = function (variables) {
          if (!callbackExecuted) {
            callbackExecuted = true;
            if (timeout) {
              timeout.clear();
            }
            if (timeout && timeout.executed) {
              handleError(new Error('Timeout'));
            } else {
              runAssertions(test, {
                assertions: function () {
                  test.asyncFn.call(variables || {}, Assert.assert);
                },
                success: success,
                failure: handleError
              });
            }
          }
        };
        this.body(asyncTestCallback);
        if (!callbackExecuted && this.getTimeout()) {
          timeout = util.timeout(asyncTestCallback, this.getTimeout());
        }
      } else {
        runAssertions(test, {
          assertions: function () {
            test.body(Assert.assert);
          },
          success: success,
          failure: handleError
        });
      }
    } catch (e) {
      handleError(e);
    }
  },
  /**
   * In order to serialize module we need to remove circular references
   * the module object
   */
  toJSON: function () {
    var copy = {};
    util.extend(copy, this);
    delete copy.module;
    return copy;
  }
});

function runAssertions (test, options) {
  var assertionsFn = options.assertions,
      successFn    = options.success,
      onError      = options.failure;

  try {
    assertionsFn();
    Assert.endTest(test);
    successFn();
  } catch (e) {
    onError(e);
  }
}


});

define('Module',['require','exports','module','Assert','renderer','Test','testStatuses','util'],function (require, exports, module) {
var Module,
    Assert = require('Assert'),
    renderer = require('renderer'),
    Test = require('Test'),
    testStatuses = require('testStatuses'),
    util = require('util'),
    PASS = testStatuses.PASS,
    FAIL = testStatuses.FAIL,
    SKIP = testStatuses.SKIP;

/**
 * A testing module. Represents a logical grouping of tests. A Module can have custom **helpers** to assist in
 * setting up and cleaning up the tests, as well as custom assertions which streamline writing the tests.
 *
 * @class
 * @param {String} name The name of this module
 * @param {Function} body The body of this function.
 */
module.exports = Module = function (name, body) {
  if (!body && util.isFunction(name)) {
    throw new Error("Module instantiated without a name.");
  }
  this.name = name;
  this.tests = [];
  this.helpers = {};
  this.amdName = null;
  body.call(this);
};

function addHelper(name, fn) {
  if (!this.helpers[name]) {
    this.helpers[name] = [];
  }
  this.helpers[name].push(fn);
}
function runHelper(mod, helpers, callback, catchBlock) {
  if (helpers && helpers.length) {
    var helper = helpers[0],
        timeout;
    try {
      if (helper.length) { // async function
        if (mod.getTimeout()) {
          timeout = util.timeout(function () {
            catchBlock(new Error('Timeout exceeded'));
          }, mod.getTimeout());
        }
        helper(function () {
          if (timeout) {
            timeout.clear();
          }
          if (!timeout || !timeout.executed) {
            runHelper(mod, helpers.slice(1), callback, catchBlock);
          }
        });
      } else {
        helper();
        runHelper(mod, helpers.slice(1), callback, catchBlock);
      }
    } catch (e) {
      catchBlock(e);
    }
  } else {
    callback();
  }
}

util.extend(Module.prototype, {
  tests : null,           // array of tests
  tyrtle : null,          // reference to the owner Tyrtle instance
  helpers : null,         // object containing the (before|after)(All)? functions
  extraAssertions : null, // object holding custom assertions. Only populated if required.
  skipAll: false,         // whether all tests in this module should be skipped
  skipMessage: null,      // The skip message for all tests if they should all be skipped.
  passes : 0,             // }
  fails : 0,              // } counts of the test results
  skips : 0,              // }
  errors : 0,             // }
  //////////////////////////
  /**
   * Create a new Test and add it to this Module
   * @param  {String} name A name for this test.
   * @param  {Number=} expectedAssertions The number of assertions this test is expected to run. Optional.
   * @param  {Function} bodyFn The body function for this test.
   * @param  {Function=} assertionsFn If writing an asynchronous test, this is the function where assertions
   *                                  can be executed. For synchronous tests, *do not supply this parameter*.
   * @return {Test} The newly created test.
   */
  test : function (name, expectedAssertions, bodyFn, assertionsFn) {
    var test = new Test(name, expectedAssertions, bodyFn, assertionsFn);
    test.module = this;
    this.tests.push(test);
    return test;
  },
  /**
   * Add a `before` helper which is executed *before each test* is started.
   * @param  {Function} fn The body of the helper
   */
  before : function (fn) {
    addHelper.call(this, 'before', fn);
  },
  /**
   * Add an `after` helper which is executed *after each test* has finished.
   * @param  {Function} fn The body of the helper
   */
  after : function (fn) {
    addHelper.call(this, 'after', fn);
  },
  /**
   * Add a `beforeAll` helper which is executed *before any tests* have started.
   * @param  {Function} fn The body of the helper
   */
  beforeAll : function (fn) {
    addHelper.call(this, 'beforeAll', fn);
  },
  /**
   * Add an `afterAll` helper which is executed *after all tests* have finished.
   * @param  {Function} fn The body of the helper
   */
  afterAll : function (fn) {
    addHelper.call(this, 'afterAll', fn);
  },
  /**
   * Add per-module (local) assertions to this module. These *may override built-in assertions*. Assertions
   * defined here are not accessible or visible to any other modules.
   *
   * The assertion body should return `true` or `undefined` to indicate a pass. A string will be used as the
   * default error message, and an array allows the assertion to add additional arguments to be substituted
   * into the error message.
   *
   * @example
   * this.addAssertions({
   *    bigNumber : function (subject) {
   *        // returns true or false. No error message for failing assertions.
   *        return subject > 9000;
   *    },
   *    answer : function (subject) {
   *        // returns true or a string. `subject` will be substituted for "{0}"
   *        return subject === 42 || "The supplied value {0} is not the answer to life, & etc.";
   *    }
   *    biggerThan : function (subject, expected) {
   *        // returns true or an array. `expected - subject` is added to the substitution list.
   *        // assert(5).is.biggerThan(7)(); --> "5 is not bigger than 7. It is off by 2"
   *        return subject > expected || ["{0} is not bigger than {1}. It is off by {2}", expected - subject];
   *    }
   * });
   *
   * @param {Object} fnMap A map of {String} AssertionName => {Function} AssertionBody.
   */
  addAssertions : function (fnMap) {
    if (!this.extraAssertions) {
      this.extraAssertions = fnMap;
    } else {
      util.extend(this.extraAssertions, fnMap);
    }
  },
  setAMDName : function (amdName, index) {
    this.amdName = amdName + (typeof index === 'number' ? ':' + index : '');
  },

  skip: function (message) {
    this.skipIf(true, message);
  },

  skipIf: function (condition, message) {
    this.skipAll = !!condition;
    this.skipMessage = condition ? message : null;
  },

  getTimeout: function () {
    return this.timeout || this.tyrtle.getTimeout();
  },

  setTimeout: function (time) {
    this.timeout = Math.max(time, 0);
  },

  run : function (callback) {
    var runNext,
      i = -1,
      l = this.tests.length,
      j, jl,
      mod = this
    ;
    runNext = function () {
      var test;
      if (++i >= l) { // we've done all the tests, break the loop.
        Assert.clearTemporaryAssertions();
        runHelper(mod, mod.helpers.afterAll, callback, function (e) {
          test = mod.tests[mod.tests.length - 1];
          if (test) {
            switch (test.status) {
              case PASS :
                --mod.passes;
                break;
              case SKIP :
                --mod.skips;
                break;
              case FAIL :
                --mod.fails;
            }
            ++mod.fails;
            if (!test.error) {
              ++mod.errors;
              test.error = e;
            }
          }
          callback();
        });
      } else {
        test = mod.tests[i];
        if (mod.tyrtle.testFilter && test.name !== mod.tyrtle.testFilter) {
          runNext();
        } else {
          mod.runTest(test, function () {
            switch (test.status) {
            case PASS :
              ++mod.passes;
              break;
            case FAIL :
              ++mod.fails;
              if (test.error) {
                ++mod.errors;
              }
              break;
            case SKIP :
              ++mod.skips;
              break;
            }
            renderer.get().afterTest(test, mod, mod.tyrtle);
            util.defer(runNext);
          });
        }
      }
    };

    if (this.skipAll) {
      for (j = 0, jl = mod.tests.length; j < jl; ++j) {
        mod.tests[j].status = SKIP;
        mod.tests[j].statusMessage = "Skipped" + (this.skipMessage ? " because " + this.skipMessage : "");
      }
      mod.skips = jl;
      callback();
    } else {
      Assert.setTemporaryAssertions(this.extraAssertions);
      runHelper(this, this.helpers.beforeAll, runNext, function (e) {
        // mark all the tests as failed.
        for (j = 0, jl = mod.tests.length; j < jl; ++j) {
          renderer.get().beforeTest(mod.tests[j], mod, mod.tyrtle);
          mod.tests[j].status = FAIL;
          mod.tests[j].error = e;
          renderer.get().afterTest(mod.tests[j], mod, mod.tyrtle);
        }
        // set the group statistics
        mod.passes = mod.skips = 0;
        mod.fails = mod.errors = jl;
        i = l; // <-- so the 'runNext' function thinks it's done all the tests & will call the afterAll.
        runNext();
      });
    }
  },
  /**
   * @protected
   */
  runTest : function (test, callback) {
    var mod = this,
        tyrtle = this.tyrtle,
        go,
        done;
    renderer.get().beforeTest(test, mod, tyrtle);
    go = function () {
      test.run(done);
    };
    done = function () {
      runHelper(mod, mod.helpers.after, callback, function (e) {
        test.status = FAIL;
        if (!test.error) {
          test.statusMessage = "Error in the after helper. " + e.message;
          test.error = e;
        }
        callback();
      });
    };
    runHelper(this, this.helpers.before, go, function (e) {
      test.status = FAIL;
      test.statusMessage = "Error in the before helper.";
      test.error = e;
      done();
    });
  },
  /**
   * @protected
   */
  rerunTest : function (test, tyrtle, callback) {
    var mod = this, run, complete;
    switch (test.status) {
    case PASS :
      --this.passes;
      --tyrtle.passes;
      break;
    case FAIL :
      --this.fails;
      --tyrtle.fails;
      if (test.error) {
        delete test.error;
        --this.errors;
        --tyrtle.errors;
      }
      break;
    case SKIP :
      --this.skips;
      --tyrtle.skips;
    }
    run = function () {
      Assert.setTemporaryAssertions(mod.extraAssertions);
      mod.runTest(test, function () {
        var aftersDone = function () {
          switch (test.status) {
          case PASS :
            ++mod.passes;
            ++tyrtle.passes;
            break;
          case FAIL :
            ++mod.fails;
            ++tyrtle.fails;
            if (test.error) {
              ++mod.errors;
              ++tyrtle.errors;
            }
            break;
          case SKIP :
            ++mod.skips;
            ++tyrtle.skips;
          }
          complete();
        };
        runHelper(mod, mod.helpers.afterAll, aftersDone, function (e) {
          test.status = FAIL;
          test.error = e;
          test.statusMessage = "Error in the afterAll helper";
          aftersDone();
        });
      });
    };
    complete = function () {
      var rend = renderer.get();
      rend.afterTest(test, mod, tyrtle);
      rend.afterModule(mod, tyrtle);
      rend.afterRun(tyrtle);
      // cleanUpAssertions();
      if (callback) {
        callback();
      }
    };
    runHelper(this, this.helpers.beforeAll, run, function (e) {
      test.status = FAIL;
      test.error = e;
      test.statusMessage = "Error in the beforeAll helper";
      ++mod.fails;
      ++tyrtle.fails;
      ++mod.errors;
      ++tyrtle.errors;
      complete();
    });
  },
  /**
   * In order to serialize module we need to remove circular references
   * the module object
   */
  toJSON: function () {
    var copy = {};
    util.extend(copy, this);
    delete copy.tyrtle;
    return copy;
  }
});

});

define('Tyrtle',['require','exports','module','Assert','Module','renderer','testStatuses','util'],function (require, exports, module) {/*!
* Tyrtle - A JavaScript Unit Testing Framework
*
* Copyright (c) 2011-2012 Nick Fisher
* Distributed under the terms of the LGPL
* http://www.gnu.org/licenses/lgpl.html
*/
/*globals module, window */
var Tyrtle,
    Assert = require('Assert'),
    Module = require('Module'),
    renderer = require('renderer'),
    testStatuses = require('testStatuses'),
    util = require('util'),
    PASS = testStatuses.PASS,
    FAIL = testStatuses.FAIL,
    SKIP = testStatuses.SKIP,
    emptyRenderer,
    getParam,
    setParams,
    // root = require('root'),
    runningInNode
    // moduleAssertions = null,  // the extra assertions added by an individual module
;
runningInNode = typeof window === 'undefined';

//////////////////////////
//  RUNTIME PARAMETERS  //
//////////////////////////
//#JSCOVERAGE_IF 0
(function () {
var urlParams, loadParams;
loadParams = runningInNode
  ? function () {
    // node parameters must be set up manually and passed to the Tyrtle constructor
    // this is because a test harness may use its own command line parameters
    urlParams = {};
  }
  : function () {
    urlParams = {};
    var query, vars, i, l, pair;
    query = window.location.search.substring(1);
    vars = query.split("&");
    for (i = 0, l = vars.length; i < l; ++i) {
      pair = vars[i].split("=");
      urlParams[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
  }
;

getParam = function (name) {
  if (!urlParams) {
    loadParams();
    loadParams = null;
  }
  return urlParams.hasOwnProperty(name) ? urlParams[name] : null;
};
setParams = function (params) {
  urlParams = params || {};
};
}());
//#JSCOVERAGE_ENDIF

module.exports = Tyrtle = function (options) {
  options = options || {};
  this.modules = [];
  this.callback = options.callback || util.noop;
  this.modFilter = options.modFilter === false
    ? null
    : (typeof options.modFilter === 'string'
       ? options.modFilter
       : getParam('modFilter')
      )
  ;
  this.testFilter = options.testFilter === false
    ? null
    : (typeof options.testFilter === 'string'
       ? options.testFilter
       : getParam('testFilter')
     )
  ;
};
emptyRenderer = {
  beforeRun      : util.noop,
  beforeModule   : util.noop,
  beforeTest     : util.noop,
  afterTest      : util.noop,
  afterModule    : util.noop,
  afterRun       : util.noop,
  templateString : function (message) {
    var args = Array.prototype.slice.call(arguments, 1);
    return message.replace(
      /\{([1-9][0-9]*|0)\}/g,
      function (str, p1) {
        var v = args[p1];
        return (v === null
          ? "NULL"
          : (typeof v === "undefined"
             ? "UNDEFINED"
             : (v.toString ? v.toString() : String(v))
          )
        );
      }
    );
  }
};

renderer.set(emptyRenderer);

// Static methods and properties
util.extend(Tyrtle, {
  PASS : PASS,
  FAIL : FAIL,
  SKIP : SKIP,
  util : util,
  addAssertions  : Assert.addAssertions,
  hasAssertion   : Assert.hasAssertion,
  removeAssertion: Assert.removeAssertion,
  /**
   *  Get the current renderer
   *  @return {Object}
   */
  getRenderer : renderer.get,
  /**
   *  Set the current renderer. This is a static method because the renderer is global to all instances of
   *  Tyrtle. If one of the renderer properties is not specified, then the corresponding property from
   *  `emptyRenderer` is used.
   *  @param {Object} renderer
   */
  setRenderer : function (rend) {
    util.each(emptyRenderer, function (val, key) {
      if (!(key in rend)) {
        rend[key] = val;
      }
    });
    renderer.set(rend);
  },
  /**
   *  Set the parameters which Tyrtle uses for default values. In the browser, Tyrtle will automatically use
   *  the parameters specified in the url.
   */
  setParams : setParams,
  /**
   * Static method used when you do not have an instance of Tyrtle yet. Modules returned by this function must
   * still be added to an instance of Tyrtle using Tyrtle.module()
   *
   * @param  {String} name The name of the module
   * @param  {Function} body   The body function of the module
   *
   * @return {Module}
   */
  module : function (name, body) {
    return new Module(name, body);
  }
});

// instance methods and properties
util.extend(Tyrtle.prototype, {
  passes : 0,
  fails : 0,
  errors : 0,
  skips : 0,
  startTime: 0,
  runTime: -1,
  timeout: 0,
  ////
  /**
   * Create a new test module and add it to this instance of Tyrtle
   *
   * @param  {String} name The name for this module
   * @param  {Function} body The body of the module which can define tests, local variables and test helpers,
   *                         like before, after, beforeAll and afterAll
   * @return {Module} The newly created module
   */
  module : function (name, body) {
    var m;
    if (arguments.length === 1 && name instanceof Module) {
      m = name;
    } else if (arguments.length === 1 && typeof name === 'object') {
      util.each(name, function (body, name) {
        this.module(name, body);
      }, this);
      return;
    } else {
      m = new Module(name, body);
    }
    m.tyrtle = this;
    this.modules.push(m);
    return m;
  },
  /**
   * Execute the test suite.
   */
  run : function () {
    var runNext,
      i = -1,
      l = this.modules.length,
      tyrtle = this
    ;
    this.startTime = +(new Date());
    renderer.get().beforeRun(this);
    runNext = function () {
      var mod;
      ++i;
      if (i === l) {
        tyrtle.runTime = +(new Date()) - tyrtle.startTime;
        renderer.get().afterRun(tyrtle);
        tyrtle.callback();
      } else {
        mod = tyrtle.modules[i];
        if (tyrtle.modFilter && mod.name !== tyrtle.modFilter) {
          runNext();
        } else {
          runModule(mod, tyrtle, function () {
            util.each(['passes', 'fails', 'errors', 'skips'], function (key) {
              tyrtle[key] += mod[key];
            });
            util.defer(runNext);
          });
        }
      }
    };
    runNext();
  },

  getTimeout: function () {
    return this.timeout;
  },

  setTimeout: function (time) {
    this.timeout = Math.max(time, 0);
  }
});

function runModule (mod, tyrtle, callback) {
  renderer.get().beforeModule(mod, tyrtle);
  mod.run(function () {
    renderer.get().afterModule(mod, tyrtle);
    callback();
  });
}

});
  return require('Tyrtle');
}()));
