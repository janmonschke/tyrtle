/*globals Tyrtle, document */
(function () {
  var tests = new Tyrtle();

  tests.module("Tyrtle tests", function () {
    var skipCounter = 0;

    this.test("is and is not", function (assert) {
      var x = 3, y;
      // this demonstrates the different amounts of syntactic sugar you could use:
      // here's the most:
      assert.that(x).is(3).since("x should be three");
      // .since is optional:
      assert.that(x).is(3)("x should be three");
      // .that is optional:
      assert(x).is(3)("x should be three");
      // .is is optional:
      assert(x)(3)("x should be three");

      // and again with another assertion (.not)
      assert.that(x).is.not('3').since("x should not be a string");
      // .since removed
      assert.that(x).is.not('3')("x should not be a string");
      // .that removed
      assert(x).is.not('3')("x should not be a string");
      // .is removed
      assert(x).not('3')('x should not be a string');

      assert.that(x).not(y)("x should not be undefined");
      assert.that(x).is.not(y)("x should not be undefined when using `is`");
    });
    this.test("ofType", function (assert) {
      var x;
      assert.that(3).is.ofType('number').since('3 should be a number');
      assert('3').ofType('string')('"3" should be a string');
      assert.that({}).is.ofType('object')('{} is an object');
      assert.that([]).is.ofType('object')('arrays are objects too');
      assert.that(/a/).is.ofType('object')('regexes are objects');
      assert.that(null).is.ofType('object')('strangely, null is an object');
      assert.that(x).is.ofType('undefined')('undefined variables are undefined');
      assert.that(function () {}).is.ofType('function')();
    });
    this.test("ok", function (assert) {
      assert(true).ok()("True should be ok");
      assert.that(1).ok()("Non-zero numbers should be ok");
      assert.that({}).is.ok()("All objects (even empty) are ok");
    });
    this.test("matches", function (assert) {
      assert.that("abbbc").matches(/ab+c/)();
    });
    this.test("endsWith / startsWith / contains", function (assert) {
      var a = assert.that("abcdef");
      a.endsWith("def")();
      a.endsWith("abcdef")();
      a.startsWith("abc")();
      a.startsWith("abcdef")();
      a.contains("bcd")();
      a.contains("abc")();
      a.contains("abcdef")();
    });
    this.test("willThrow", function (assert) {
      var a = assert.that(function () {
        throw 'abc';
      });
      a.willThrow('abc')();
      a.willThrow(/c/)();

      a = assert.that(function () {
        throw new Error('abc');
      });
      a.willThrow('abc')();
      a.willThrow(/c/)();
    });
    this.test("wontThrow", function (assert) {
      assert.that(function () {}).wontThrow()();
    });
    this.test("equals", function (assert) {
      //object equality
      assert
        .that([1, 2, 3])
        .equals([1, 2, 3])
        ("Arrays did not compare")
      ;
      assert
        .that(1)
        .equals(1)
        ("Numbers")
      ;
      assert
        .that("abc")
        .equals("abc")
        ("Strings")
      ;
      assert
        .that({a : 'b', c : 'd'})
        .equals({a : 'b', c : 'd'})
        ("Basic objects")
      ;
      assert
        .that(/abc/gim)
        .equals(/abc/mig)
        ("Regular expressions")
      ;
      assert.that({a : {b : 'c'}, d : {e : [/f/]}})
        .equals({a : {b : 'c'}, d : {e : [/f/]}})
        ("Nested objects")
      ;
      assert.that(new Date(123456789)).equals(new Date(123456789))("Dates");
    });
    this.test("Skip this test", function (assert) {
      this.skip("This test should be skipped.");

      assert.that(3).is(4)("This should never be executed.");
      var x = 0;
      x(); // this should never be executed, either.
    });
    this.test("Conditionally skipping", function (assert) {
      this.skipIf(++skipCounter % 2, "This will be skipped every second time.");
    });
    this.test("This is an asynchronous test", function (callback) {
      setTimeout(function () {
        callback({
          x : 1,
          y : 2
        });
      }, 15);
    }, function (assert) {
      assert.that(this.x).is(1)("x should be one");
      assert.that(this.y).is(2)("y should be two");
    });
  });
  tests.module("Failing assertions (these should fail)", function () {
    this.test("Expectation failure", function (assert) {
      this.expect(3);
    });
    this.test("Expectation failure in asynchronous test", function (done) {
      this.expect(1);
      setTimeout(done, 10);
    }, function (assert) {
      assert(3)(3)();
      assert(4)(4)();
    });

    this.test("Equality checking is strict", function (assert) {
      var x = 3;
      assert.that(x).is("3").since("Comparing to a string should fail");
    });
    this.test("Objects are tested for identity", function (assert) {
      assert.that([]).is([]).since("Two different objects are not identical");
    });
    this.test("Not should reject identical variables", function (assert) {
      assert.that(3).not(3).since("Two identical objects should be the same");
    });
    this.test("Matches", function (assert) {
      assert.that("abbbc").matches(/^c/)();
    });
    this.test("Ok", function (assert) {
      assert.that(false).ok()();
    });
    this.test("startsWith 1", function (assert) {
      assert.that("abcdef").startsWith("bcdef")();
    });
    this.test("startsWith 2", function (assert) {
      assert.that("abcdef").startsWith("abcdefg")();
    });
    this.test("startsWith 3", function (assert) {
      assert.that(123456).startsWith('123')();
    });
    this.test("endsWith 1", function (assert) {
      assert.that("abcdef").endsWith("abcde")();
    });
    this.test("endsWith 2", function (assert) {
      assert.that("abcdef").endsWith("abcdefg")();
    });
    this.test("endsWith 3", function (assert) {
      assert.that(123456).endsWith('456')();
    });
  });
  tests.module("Demonstrating the variable logging (these should fail)", function () {
    this.test("Number, String", function (assert) {
      assert(3)("a string")();
    });
    this.test("Array, Object", function (assert) {
      assert(['a', 'b', 'c'])({a : 'A', b : ['b'], c : {see : 'C'}})();
    });
    this.test("DOM Element", function (assert) {
      this.skipIf(!document || !document.createElement, "This test can only run in a browser");
      var d = document.createElement('div');
      d.setAttribute('id', 'someId');
      d.className = 'classA classB';
      assert(d).not(d)();
    });
    this.test("Null, Undefined", function (assert) {
      var x;
      assert(null)(x)();
    });
    this.test("Function, Date", function (assert) {
      function f(a, b) {
        return a + b;
      }
      assert(f)(new Date())();
    });
    this.test("RegExp", function (assert) {
      assert(/ab+c/g)(/d*e.\.f{3,4}/im)();
    });
  });
  tests.module("Tests which have asynchronous before helpers", function () {
    var x;
    this.before(function (cb) {
      setTimeout(function () {
        x = 2;
        cb();
      }, 5);
    });
    this.test("Check that the before is executed first", function (assert) {
      assert.that(x).is(2)("The before should have finished running before this test.");
      x = -666;
    });
    this.test("And again, in between the tests", function (assert) {
      assert.that(x).is(2)("The before should have run again before this test.");
    });
  });
  tests.module("Tests which have asynchronous after helpers", function () {
    var x, y;
    this.beforeAll(function () {
      x = null;
      y = true;
    });
    this.after(function (cb) {
      setTimeout(function () {
        x = 1;
        cb();
      }, 5);
    });
    this.test("Check that the after has not run yet", function (assert) {
      assert.that(x).is(null)("The beforeAll should have set x to null.");
      x = -666;
      y = false;
    });
    this.test("Check that the after has executed now", function (assert) {
      this.skipIf(y, "This test should only be run after the first test in this module.");
      assert.that(x).is(1)("The after should have run before this test.");
    });
  });
  tests.module("Tests which have asynchronous beforeAll helpers", function () {
    var x, y;
    this.beforeAll(function (cb) {
      setTimeout(function () {
        x = 1;
        cb();
      }, 5);
    });
    this.test("Check that the beforeAll has run yet", function (assert) {
      assert.that(x).is(1)("The beforeAll should have set x to 1.");
      x = -666;
      y = false;
    });
    this.test("Check that the after has executed now", function (assert) {
      this.skipIf(y, "This test should only be run after the first test in this module.");
      assert.that(x).is(-666)("The beforeAll should not have run again.");
    });
  });
  tests.run();
}());
