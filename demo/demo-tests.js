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
            this.skipIf(!assert().ofType, "ofType has not been implemented yet");
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
    tests.module("Failing assertions (these should all fail)", function () {
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
        this.test("Demonstrating the variable logging: Number, String", function (assert) {
            assert(3)("a string")();
        });
        this.test("Demonstrating the variable logging: Array, Object", function (assert) {
            assert(['a', 'b', 'c'])({a : 'A', b : ['b'], c : {see : 'C'}})();
        });
        this.test("Demonstrating the variable logging: DOM Element", function (assert) {
            this.skipIf(!document || !document.createElement, "This test can only run in a browser");
            var d = document.createElement('div');
            d.setAttribute('id', 'someId');
            d.className = 'classA classB';
            assert(d).not(d)();
        });
        this.test("Demonstrating the variable logging: Null, Undefined", function (assert) {
            var x;
            assert(null)(x)();
        });
        this.test("Demonstrating the variable logging: Function, Date", function (assert) {
            function f(a, b) {
                return a + b;
            }
            assert(f)(new Date())();
        });
        this.test("Demonstrating the variable logging: RegExp", function (assert) {
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
