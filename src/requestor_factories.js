// Jonathan Reimer
// 2026-04-28

/*
This file is a wrapper for pronto.js to curry the factories as well as providing
several derivative factories.

New versions of pronto.js may be used as long as the factory parameters
remain unchanged.

pronto.requestorize is not exported as it is included in requestors.js
as unary_requestor

The objectify function is not exported, but is instead used to provide
parallel_object and race_object factories. Objects are not relevant for the
other factories.
*/

/*jslint
    unordered, node
*/

//MD # Requestor Factories/p
//MD This project exports curried factory functions based on Douglas Crockford's
//MD [Pronto](https://github.com/douglascrockford/Pronto). (Pronto is the
//MD successor to Crockford's Parseq.)/p

//MD ## Overview/p

//MD ### Requestors/p
//MD A curried requestor function is any function that takes a callback and a
//MD value./p
//MD /p
//MD     my_little_requestor(callback)(value)/p

//MD A requestor will do some work or send a message to another process or
//MD system. When the work is done, the requestor signals the result by passing
//MD a value to its callback. The callback could be called in a future turn,
//MD so the requestor does not need to block, nor should it ever block./p
//MD /p
//MD The `value` may be of any type, including objects, arrays, and
//MD `undefined`. A requestor should not throw an exception. It should
//MD communicate all failures through its callback./p

//MD ### Requestor Factory/p
//MD A requestor factory is any function that returns a requestor function.
//MD A factory function may throw an exception if it finds problems
//MD in its arguments./p

//MD ### Requestor Processor/p
//MD A requestor processor is a requestor factory that acts on a requestor or
//MD a collection of requestors./p

//MD ### Callback/p
//MD A callback function takes two arguments, `value` and `reason`, and is not
//MD curried./p
//MD /p
//MD     my_little_callback(value, reason)/p

//MD If `value` is `undefined`, then failure is being signalled. `reason` may
//MD contain information explaining the failure. If `value` is not `undefined`,
//MD then success is being signalled and `value` contains the result.
//MD Reasons are debugging clues./p

//MD ### Cancel/p
//MD A requestor function may return a cancel function. A cancel function takes
//MD a reason argument that might be propagated and logged as the reason a
//MD requestor failed./p
//MD /p
//MD     my_little_cancel(reason)/p

//MD A cancel function attempts to stop the operation of the requestor. If a
//MD program decides that it no longer needs the result of a requestor, it can
//MD call the cancel function that the requestor returned. This is not an undo
//MD operation. It is just a way of stopping unneeded work. There is no
//MD guarantee that the work actually stops. The cancel mechanism is totally
//MD optional and advisory. It is provided to give you the opportunity to
//MD prevent the wasting of resources./p

import {
//test     constant,
//test     identity,
//test     compose,
    pipe
} from "@jlrwi/combinators";
import {
//test     log,
//test     add,
    is_object,
    array_map,
//test     array_reduce,
//test     array_insert,
//test     object_reduce,
//test     object_append,
    object_map,
    prop,
    type_check,
    minimal_object,
//test     multiply,
//test     gt,
//test     lt,
//test     or,
//test     remainder,
//test     and,
    functional_if,
    equals,
    not
} from "@jlrwi/esfunctions";
import {
    set_timeout,
    set_interval
} from "@jlrwi/functional-timers";
//test /*
import pronto from "./modules/pronto.js";
//test */

//test import pronto from "../modules/pronto.js";
//test import test_requestors from "./test_requestors.js";
//test import jsCheck from "@jlrwi/jscheck";
//test let jsc = jsCheck();

const pronto_parallel_object = pronto.objectify(pronto.parallel);
const pronto_race_object = pronto.objectify(pronto.race);

// Take a requestor and input value, and return a requestor that takes a
// callback but ignores the normal initial_value parameter
const preloaded_requestor = function (requestor) {
    return function (input) {
        return function preload_requestor(callback) {
            return function (ignore) {
                return requestor(callback)(input);
            };
        };
    };
};

const constant_requestor = function (constant_value) {
    return function constant_requestor(callback) {
        return function (ignore) {
            callback(constant_value);
        };
    };
};

// Take a curried requestor and allow it to be called in the original format
const uncurried_requestor = function (requestor) {
    return function uncurried_requestor(callback, initial_value) {
        return requestor(callback)(initial_value);
    };
};

// Take a list or object of curried requestors and un-curry them for pronto.js
const uncurry_requestors = function (requestor_list) {
    if (Array.isArray(requestor_list)) {
        return requestor_list.map(uncurried_requestor);
    }

    if (is_object(requestor_list)) {
        return Object.fromEntries(
            Object.entries(requestor_list).map(
                function ([key, curried_requestor]) {
                    return [
                        key,
                        uncurried_requestor(curried_requestor)
                    ];
                }
            )
        );
    }

    return requestor_list;
};

//MD ## Pronto bulk processors/p

//MD These are curried forms of the original processors from `pronto.js`
//MD that operate on collections of requestors. Options are passed to these
//MD functions in an initial object. (Some factories do not take any
//MD options but retain the calling pattern for consistency.)/p

//MD ### Fallback/p
//MD     fallback(/p
//MD     )(/p
//MD         requestor_array/p
//MD     )/p

//MD Fallback takes no options and returns a requestor function. When
//MD the requestor is called, it will call the first requestor in
//MD `requestor_array`. If that is ultimately successful, its value will be
//MD passed to the callback. But if that requestor fails, the next requestor
//MD will be called, and so on. If none of the requestors is successful, then
//MD the fallback fails. If any succeeds, then the fallback succeeds./p
//MD /p
//MD The fallback requestor will return a cancel function that can be called
//MD when the result is no longer needed./p

const fallback = function (ignore) {
    return function (requestor_array) {
        return function fallback_requestor(callback) {
            return function (initial_value) {
                return pronto.fallback(
                    uncurry_requestors(requestor_array)
                )(
                    callback,
                    initial_value
                );
            };
        };
    };
};

//test jsc.claim({
//test     name: "fallback",
//test     predicate: function (verdict) {
//test         return function (list) {
//test             const callback = function (value, ignore) {
//test                 verdict(
//test                     (value === undefined)
//test                     ? list.every(equals(false))
//test                     : (value === list.findIndex(equals(true)))
//test                 );
//test             };
//test
//test             fallback()(
//test                 list.map(
//test                     function (to_succeed, index) {
//test                         return test_requestors.random_delay({
//test                             fail_rate: (
//test                                 (to_succeed)
//test                                 ? 0
//test                                 : 1
//test                             ),
//test                             delay_min: 500,
//test                             delay_max: 2000
//test                         })(
//test                             constant(index)
//test                         );
//test                     }
//test                 )
//test             )(
//test                 callback
//test             )(
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.array(
//test             jsc.integer(5, 15),
//test             jsc.one_of([true, false], [1, 6])
//test         )
//test     ],
//test     classifier: function (list) {
//test         return (
//test             (list.some(equals(true)))
//test             ? "Success"
//test             : "Failure"
//test         );
//test     }
//test });

//MD ### Parallel/p
//MD     parallel({/p
//MD         throttle,/p
//MD         need/p
//MD     })(/p
//MD         requestor_array/p
//MD     )/p

//MD Parallel returns a requestor that processes the `requestor_array` in
//MD parallel, producing an array of all of the successful results. The value
//MD produced by the first element of the requestor_array provides the first
//MD element of the result. If any requestor fails, the pending requestors are
//MD cancelled and this operation fails./p
//MD /p
//MD By default, it starts all of the requestors in the `requestor_array` at
//MD once, each in its own turn so that they do not interfere with each other.
//MD This can shock some systems by unleashing a lot of demand at once. To
//MD mitigate the shock, the optional `throttle` argument sets the maximum
//MD number of requestors running at a time. As requestors succeed or fail,
//MD waiting requestors can be started./p
//MD /p
//MD By default, all of the requestors in the requestor_array must succeed.
//MD Optionally, a smaller number of needed results can be specified. If the
//MD number of successes is greater than or equal to `need`, then the whole
//MD operation succeeds. The `need` argument must be between 0 and
//MD requestor_array.length./p

const parallel = function (options = {}) {
    return function (requestor_array) {

        if (!is_object(options)) {
            throw "Invalid options object";
        }

        const {
            throttle,
            need
        } = options;

        return function parallel_requestor(callback) {
            return function (initial_value) {
                return pronto.parallel(
                    uncurry_requestors(requestor_array),
                    throttle,
                    need
                )(
                    callback,
                    initial_value
                );
            };
        };
    };
};

//test jsc.claim({
//test     name: "parallel",
//test     predicate: function (verdict) {
//test         return function (list, factor) {
//test             const callback = function (value, ignore) {
//test                 verdict(
//test                     (value === undefined)
//test                     ? (list.some(equals(1)))
//test                     : equals(
//test                         array_reduce(add)(0)(value)
//test                     )(
//test                         multiply(array_reduce(add)(0)(list))(factor)
//test                     )
//test                 );
//test             };
//test
//test             parallel()(
//test                 array_map(
//test                     function (value) {
//test                         return test_requestors.random_delay({
//test                             fail_rate: (
//test                                 (value === 1)
//test                                 ? 1
//test                                 : 0
//test                             ),
//test                             delay_min: 500,
//test                             delay_max: 2000
//test                         })(
//test                             multiply(value)
//test                         );
//test                     }
//test                 )(
//test                     list
//test                 )
//test             )(
//test                 callback
//test             )(
//test                 factor
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.array(
//test             jsc.integer(5, 15),
//test             jsc.integer(20)
//test         ),
//test         jsc.integer(1000)
//test     ],
//test     classifier: function (list, ignore) {
//test         return (
//test             (list.some(equals(1)))
//test             ? "Failure"
//test             : "Success"
//test         );
//test     }
//test });
//test jsc.claim({
//test     name: "parallel need",
//test     predicate: function (verdict) {
//test         return function (list, factor, need) {
//test             const callback = function (value, ignore) {
//test                 verdict(
//test                     (value === undefined)
//test                     ? (list.filter(gt(1)).length < need)
//test                     : (value.filter(gt(factor)).length >= need)
//test                 );
//test             };
//test
//test             parallel({
//test                 need
//test             })(
//test                 array_map(
//test                     function (value) {
//test                         return test_requestors.random_delay({
//test                             fail_rate: (
//test                                 (value === 1)
//test                                 ? 1
//test                                 : 0
//test                             ),
//test                             delay_min: 500,
//test                             delay_max: 2000
//test                         })(
//test                             multiply(value)
//test                         );
//test                     }
//test                 )(
//test                     list
//test                 )
//test             )(
//test                 callback
//test             )(
//test                 factor
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.array(
//test             jsc.integer(8, 12),
//test             jsc.integer(5)
//test         ),
//test         jsc.integer(100),
//test         jsc.integer(4, 7)
//test     ],
//test     classifier: function (list, ignore, need) {
//test         return (
//test             (list.filter(gt(1)).length < need)
//test             ? "Failure"
//test             : "Success"
//test         );
//test     }
//test });

//MD ### Race/p
//MD     race({/p
//MD         throttle,/p
//MD         need/p
//MD     })(/p
//MD         requestor_array/p
//MD     )/p

//MD Race returns a requestor that starts all of the requestors in
//MD `requestor_array` in parallel. Its result is the result of the first of
//MD those requestors to successfully finish. All of the other requestors will
//MD be cancelled. If all of those requestors fail, then the race fails./p
//MD /p
//MD By default, it starts all of the requestors in the `requestor_array` at
//MD once, each in its own turn so that they do not interfere with each other.
//MD This can shock some systems by unleashing a lot of demand at once. To
//MD mitigate the shock, the optional `throttle` argument sets the maximum
//MD number of requestors running at a time. As requestors succeed or fail,
//MD waiting requestors can be started./p
//MD /p
//MD By default, a single result is produced. If an array of results is needed,
//MD specify the needed number of results in the `need` parameter. When the
//MD needed number of successful results is obtained, the operation ends. The
//MD results go into a sparce array, and unfinished requestors are cancelled.
//MD The `need` argument must be between 1 and requestor_array.length./p

const race = function (options = {}) {
    return function (requestor_array) {

        if (!is_object(options)) {
            throw "Invalid options object";
        }

        const {
            throttle,
            need
        } = options;

        return function race_requestor(callback) {
            return function (initial_value) {
                return pronto.race(
                    uncurry_requestors(requestor_array),
                    throttle,
                    need
                )(
                    callback,
                    initial_value
                );
            };
        };
    };
};

//test jsc.claim({
//test     name: "race",
//test     predicate: function (verdict) {
//test         return function (list, win_position) {
//test             const callback = function (value, ignore) {
//test                 verdict(
//test                     (value === undefined)
//test                     ? list.every(equals(0))
//test                     : (value === (list.length - win_position))
//test                 );
//test             };
//test
//test             const winner_list = array_insert(
//test                 list.length - win_position
//test             )(
//test                 [-1]
//test             )(
//test                 list
//test             );
//test
//test             race()(
//test                 winner_list.map(
//test                     function (value, index) {
//test                         return test_requestors.random_delay({
//test                             fail_rate: (
//test                                 (value === 0)
//test                                 ? 1
//test                                 : 0
//test                             ),
//test                             delay_min: (
//test                                 (value === -1)
//test                                 ? 50
//test                                 : 500
//test                             ),
//test                             delay_max: (
//test                                 (value === -1)
//test                                 ? 100
//test                                 : 2000
//test                             )
//test                         })(
//test                             constant(index)
//test                         );
//test                     }
//test                 )
//test             )(
//test                 callback
//test             )(
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.array(
//test             jsc.integer(4, 8),
//test             jsc.one_of([0, 1, 2, 3, 4, 5], [15, 1, 1, 1, 1, 1])
//test         ),
//test         jsc.integer(4)
//test     ],
//test     classifier: function (list, ignore) {
//test         return (
//test             (list.some(gt(0)))
//test             ? "Success"
//test             : "Failure"
//test         );
//test     }
//test });
//test jsc.claim({
//test     name: "race need",
//test     predicate: function (verdict) {
//test         return function (list, need) {
//test             const callback = function (value, ignore) {
//test                 verdict(
//test                     (value === undefined)
//test                     ? (list.filter(gt(0)).length < need)
//test                     : (array_reduce(add)(0)(value) >= need)
//test                 );
//test             };
//test
//test             race({
//test                 need
//test             })(
//test                 array_map(
//test                     function (value) {
//test                         return test_requestors.random_delay({
//test                             fail_rate: (
//test                                 (value === 0)
//test                                 ? 1
//test                                 : 0
//test                             ),
//test                             delay_min: 500,
//test                             delay_max: 2000
//test                         })(
//test                             constant(value)
//test                         );
//test                     }
//test                 )(
//test                     list
//test                 )
//test             )(
//test                 callback
//test             )(
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.array(
//test             jsc.integer(5, 12),
//test             jsc.one_of([0, 1], [2, 1])
//test         ),
//test         jsc.integer(4)
//test     ],
//test     classifier: function (list, need) {
//test         return (
//test             (list.filter(gt(0)).length >= need)
//test             ? "Success"
//test             : "Failure"
//test         );
//test     }
//test });

//MD ### Sequence/p
//MD     sequence(/p
//MD     )(/p
//MD         requestor_array/p
//MD     )/p

//MD Sequence takes no options and returns a requestor that processes each
//MD requestor in `requestor_array` one at a time. Each of those requestors
//MD will be passed the result of the previous requestor as its `value`
//MD argument. If all succeed, then the sequence succeeds, giving the result
//MD of the last of the requestors. If any fail, then the sequence fails./p

const sequence = function (ignore) {
    return function (requestor_array) {
        return function sequence_requestor(callback) {
            return function (initial_value) {
                return pronto.sequence(
                    uncurry_requestors(requestor_array)
                )(
                    callback,
                    initial_value
                );
            };
        };
    };
};

//test jsc.claim({
//test     name: "sequence",
//test     predicate: function (verdict) {
//test         return function (list, addend) {
//test             const callback = function (value, ignore) {
//test                 verdict(
//test                     (value === undefined)
//test                     ? list.some(equals(false))
//test                     : (value === (list.length * addend))
//test                 );
//test             };
//test
//test             sequence()(
//test                 list.map(
//test                     function (to_succeed) {
//test                         return test_requestors.random_delay({
//test                             fail_rate: (
//test                                 (to_succeed)
//test                                 ? 0
//test                                 : 1
//test                             ),
//test                             delay_min: 500,
//test                             delay_max: 2000
//test                         })(
//test                             add(addend)
//test                         );
//test                     }
//test                 )
//test             )(
//test                 callback
//test             )(
//test                 0
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.array(
//test             jsc.integer(5, 15),
//test             jsc.one_of([true, false], [20, 1])
//test         ),
//test         jsc.integer(100)
//test     ],
//test     classifier: function (list, ignore) {
//test         return (
//test             (list.some(equals(false)))
//test             ? "Failure"
//test             : "Success"
//test         );
//test     }
//test });

//MD ## Objectified bulk processors/p

//MD Each of these bulk processors takes an object of requestors rather than
//MD arrays of requestors./p
//MD /p
//MD     parallel_object({/p
//MD         throttle,/p
//MD         need/p
//MD     })(/p
//MD         requestor_object/p
//MD     )/p
//MD /p

const parallel_object = function (options = {}) {
    return function (requestor_object) {

        if (!is_object(options)) {
            throw "Invalid options object";
        }

        const {
            throttle,
            need
        } = options;

        return function parallel_object_requestor(callback) {
            return function (initial_value) {
                return pronto_parallel_object(
                    uncurry_requestors(requestor_object),
                    throttle,
                    need
                )(
                    callback,
                    initial_value
                );
            };
        };
    };
};

//test jsc.claim({
//test     name: "parallel object",
//test     predicate: function (verdict) {
//test         return function (obj, factor) {
//test             const callback = function (value, ignore) {
//test                 verdict(
//test                     (value === undefined)
//test                     ? (Object.values(obj).some(equals(1)))
//test                     : equals(
//test                         object_reduce(add)(0)(value)
//test                     )(
//test                         multiply(object_reduce(add)(0)(obj))(factor)
//test                     )
//test                 );
//test             };
//test
//test             parallel_object()(
//test                 object_map(
//test                     function (value) {
//test                         return test_requestors.random_delay({
//test                             fail_rate: (
//test                                 (value === 1)
//test                                 ? 1
//test                                 : 0
//test                             ),
//test                             delay_min: 500,
//test                             delay_max: 2000
//test                         })(
//test                             multiply(value)
//test                         );
//test                     }
//test                 )(
//test                     obj
//test                 )
//test             )(
//test                 callback
//test             )(
//test                 factor
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.object(
//test             jsc.array(
//test                 jsc.integer(5, 15),
//test                 jsc.string(4, jsc.character("a", "z"))
//test             ),
//test             jsc.integer(30)
//test         ),
//test         jsc.integer(100)
//test     ],
//test     classifier: function (obj, ignore) {
//test         return (
//test             (Object.values(obj).some(equals(1)))
//test             ? "Failure"
//test             : "Success"
//test         );
//test     }
//test });

//MD     race_object({/p
//MD         throttle,/p
//MD         need/p
//MD     })(/p
//MD         requestor_object/p
//MD     )/p

const race_object = function (options = {}) {
    return function (requestor_object) {

        if (!is_object(options)) {
            throw "Invalid options object";
        }

        const {
            throttle,
            need
        } = options;

        return function race_object_requestor(callback) {
            return function (initial_value) {
                return pronto_race_object(
                    uncurry_requestors(requestor_object),
                    throttle,
                    need
                )(
                    callback,
                    initial_value
                );
            };
        };
    };
};

//test jsc.claim({
//test     name: "race object",
//test     predicate: function (verdict) {
//test
//test         return function (obj, factor) {
//test             const callback = function (value, ignore) {
//test                 verdict(
//test                     (value === undefined)
//test                     ? Object.values(obj).every(equals(0))
//test                     : (value === -1)
//test                 );
//test             };
//test
//test             race_object()(
//test                 object_map(
//test                     function (value) {
//test                         return test_requestors.random_delay({
//test                             fail_rate: (
//test                                 (value === 0)
//test                                 ? 1
//test                                 : 0
//test                             ),
//test                             delay_min: (
//test                                 (value === -1)
//test                                 ? 50
//test                                 : 500
//test                             ),
//test                             delay_max: (
//test                                 (value === -1)
//test                                 ? 100
//test                                 : 2000
//test                             )
//test                         })(
//test                             (value === -1)
//test                             ? constant(-1)
//test                             : identity
//test                         );
//test                     }
//test                 )(
//test                     object_append("winner")(-1)(obj)
//test                 )
//test             )(
//test                 callback
//test             )(
//test                 factor
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.object(
//test             jsc.array(
//test                 jsc.integer(4, 8),
//test                 jsc.string(4, jsc.character("a", "z"))
//test             ),
//test             jsc.one_of([0, 1, 2, 3, 4, 5], [15, 1, 1, 1, 1, 1])
//test         ),
//test         jsc.integer(100)
//test     ],
//test     classifier: function (obj, ignore) {
//test         return (
//test             (Object.values(obj).some(gt(0)))
//test             ? "Success"
//test             : "Failure"
//test         );
//test     }
//test });

//MD ## Other bulk processors/p

//MD ### Indexed processor/p
//MD     indexed_requestor({/p
//MD         throttle,/p
//MD         need/p
//MD     })(/p
//MD         requestors_array/p
//MD     )/p
//MD /p
//MD Send each requestor in an array of requestors the corresponding value from
//MD the same index in the input array, running all the requestors in
//MD parallel./p

const indexed = function (options = {}) {
    return function (requestors) {

        if (!Array.isArray(requestors)) {
            throw "Invalid requestors array";
        }

// Make each requestor in the list use value at corresponding index of input
        const index_mapper = function (requestor, index) {
            return function index_requestor(callback) {
                return pipe(
                    prop(index)
                )(
                    functional_if(
                        equals(undefined)
                    )(
// When the input is missing an index, return {}
                        constant_requestor(minimal_object())(callback)
                    )(
// Otherwise call the requestor
                        requestor(callback)
                    )
                );
            };
        };

        return parallel(
            options
        )(
            requestors.map(index_mapper)
        );
    };
};

//test jsc.claim({
//test     name: "indexed",
//test     predicate: function (verdict) {
//test         return function (list) {
//test
//test             const callback = function (value, ignore) {
//test                 verdict(
//test                     (value === undefined)
//test                     ? (list.some(compose(equals(1))(prop(0))))
//test                     : equals(
//test                         array_reduce(add)(0)(value)
//test                     )(
//test                         list.reduce(
//test                             function (acc, val_pair) {
//test                                 return acc + val_pair[0] + val_pair[1];
//test                             },
//test                             0
//test                         )
//test                     )
//test                 );
//test             };
//test
//test             indexed()(
//test                 array_map(
//test                     function (value_pair) {
//test                         return test_requestors.random_delay({
//test                             fail_rate: (
//test                                 (value_pair[0] === 1)
//test                                 ? 1
//test                                 : 0
//test                             ),
//test                             delay_min: 500,
//test                             delay_max: 2000
//test                         })(
//test                             add(value_pair[0])
//test                         );
//test                     }
//test                 )(
//test                     list
//test                 )
//test             )(
//test                 callback
//test             )(
//test                 array_map(prop(1))(list)
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.array(
//test             jsc.integer(5, 15),
//test             jsc.array([
//test                 jsc.integer(20),
//test                 jsc.integer(100)
//test             ])
//test         )
//test     ],
//test     classifier: function (list) {
//test         return (
//test             (list.some(compose(equals(1))(prop(0))))
//test             ? "Failure"
//test             : "Success"
//test         );
//test     }
//test });

//MD ### Record processor/p
//MD     record_requestor({/p
//MD         throttle,/p
//MD         need/p
//MD     })(/p
//MD         requestors_object/p
//MD     )/p
//MD /p
//MD Send each requestor in an object of requestors the corresponding
//MD property value from the input object, running all the requestors in
//MD parallel./p

const record = function (options = {}) {
    return function (requestors) {

        if (!is_object(requestors)) {
            throw "Invalid requestors object";
        }

// Turn each key/requestor in the object of requestors into [key, requestor]
// With the corresponding val from input piped into each requestor
        const property_mapper = function (key_val_pair) {
            const [key, requestor] = key_val_pair;

            return [
                key,
                function property_requestor(callback) {
                    return pipe(
                        prop(key)
                    )(
                        functional_if(
                            equals(undefined)
                        )(
// When the input is missing a key, return {}
                            constant_requestor(minimal_object())(callback)
                        )(
// Otherwise call the requestor
                            requestor(callback)
                        )
                    );
                }
            ];
        };

        return parallel_object(
            options
        )(
            Object.fromEntries(Object.entries(requestors).map(property_mapper))
        );
    };
};

//test jsc.claim({
//test     name: "record",
//test     predicate: function (verdict) {
//test         return function (obj) {
//test             const callback = function (value, ignore) {
//test                 verdict(
//test                     (value === undefined)
//test                     ? (Object.values(obj).some(
//test                         compose(equals(1))(prop("fst"))
//test                     ))
//test                     : equals(
//test                         object_reduce(add)(0)(value)
//test                     )(
//test                         Object.values(obj).reduce(
//test                             function (acc, val_pair) {
//test                                 return acc + val_pair.fst + val_pair.snd;
//test                             },
//test                             0
//test                         )
//test                     )
//test                 );
//test             };
//test
//test             record()(
//test                 object_map(
//test                     function (val_pair) {
//test                         return test_requestors.random_delay({
//test                             fail_rate: (
//test                                 (val_pair.fst === 1)
//test                                 ? 1
//test                                 : 0
//test                             ),
//test                             delay_min: 500,
//test                             delay_max: 2000
//test                         })(
//test                             add(val_pair.fst)
//test                         );
//test                     }
//test                 )(
//test                     obj
//test                 )
//test             )(
//test                 callback
//test             )(
//test                 object_map(prop("snd"))(obj)
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.object(
//test             jsc.array(
//test                 jsc.integer(5, 15),
//test                 jsc.string(4, jsc.character("a", "z"))
//test             ),
//test             jsc.object({
//test                 fst: jsc.integer(30),
//test                 snd: jsc.integer(100)
//test             })
//test         )
//test     ],
//test     classifier: function (obj) {
//test         return (
//test             (Object.values(obj).some(compose(equals(1))(prop("fst"))))
//test             ? "Failure"
//test             : "Success"
//test         );
//test     }
//test });

//MD ## Applied processors/p
//MD Each of these processors corresponds to an original variant, except
//MD that instead of applying a single value to a list of requestors, each
//MD value in a list is applied to a single requestor./p
//MD /p

// Take one of the original (curried) factories and return the applied version
// Produces: <a -> b> -> [a] -> [<a -> b>] -> [b]
const applied_requestor = function (processor) {
    return function (options = {}) {
        return function (requestor) {
            return function applied_requestor(final_callback) {
                return function (input_list) {

                    if (!Array.isArray(input_list)) {
                        final_callback(undefined, "Input is not an array");
                    }

                    return processor(
                        options
                    )(
                        array_map(preloaded_requestor(requestor))(input_list)
                    )(
                        final_callback
                    )(
                        0
                    );
                };
            };
        };
    };
};

//MD     fallback_applied(/p
//MD     )(/p
//MD         requestor/p
//MD     )/p
//MD /p
const fallback_applied = applied_requestor(fallback);

//test jsc.claim({
//test     name: "fallback applied",
//test     predicate: function (verdict) {
//test         return function (list) {
//test             const callback = function (value, ignore) {
//test                 verdict(
//test                     (value === undefined)
//test                     ? list.every(equals(false))
//test                     : (value === list.findIndex(equals(true)))
//test                 );
//test             };
//test
//test             fallback_applied()(
//test                 test_requestors.applied_delay
//test             )(
//test                 callback
//test             )(
//test                 list.map(
//test                     function (to_succeed, index) {
//test                         return {
//test                             fail_rate: (
//test                                 (to_succeed)
//test                                 ? 0
//test                                 : 1
//test                             ),
//test                             delay_min: 500,
//test                             delay_max: 2000,
//test                             value: index
//test                         };
//test                     }
//test                 )
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.array(
//test             jsc.integer(5, 15),
//test             jsc.one_of([true, false], [1, 6])
//test         )
//test     ],
//test     classifier: function (list) {
//test         return (
//test             (list.some(equals(true)))
//test             ? "Success"
//test             : "Failure"
//test         );
//test     }
//test });

//MD     parallel_applied({/p
//MD         throttle,/p
//MD         need/p
//MD     })(/p
//MD         requestor/p
//MD     )/p
//MD /p
const parallel_applied = applied_requestor(parallel);

//test jsc.claim({
//test     name: "parallel applied",
//test     predicate: function (verdict) {
//test         return function (list, factor) {
//test             const callback = function (value, ignore) {
//test                 verdict(
//test                     (value === undefined)
//test                     ? (list.some(equals(1)))
//test                     : equals(
//test                         array_reduce(add)(0)(value)
//test                     )(
//test                         multiply(array_reduce(add)(0)(list))(factor)
//test                     )
//test                 );
//test             };
//test
//test             parallel_applied()(
//test                 test_requestors.applied_delay
//test             )(
//test                 callback
//test             )(
//test                 list.map(
//test                     function (value) {
//test                         return {
//test                             fail_rate: (
//test                                 (value === 1)
//test                                 ? 1
//test                                 : 0
//test                             ),
//test                             delay_min: 500,
//test                             delay_max: 2000,
//test                             value: value * factor
//test                         };
//test                     }
//test                 )
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.array(
//test             jsc.integer(5, 15),
//test             jsc.integer(20)
//test         ),
//test         jsc.integer(1000)
//test     ],
//test     classifier: function (list, ignore) {
//test         return (
//test             (list.some(equals(1)))
//test             ? "Failure"
//test             : "Success"
//test         );
//test     }
//test });

//MD     parallel_applied_object({/p
//MD         throttle,/p
//MD         need/p
//MD     })(/p
//MD         requestor/p
//MD     )/p
//MD /p

// Result: <a -> b> -> {a} -> {<a -> b>} -> {b}
const parallel_applied_object = function (options = {}) {
    return function (requestor) {
        return function applied_requestor(final_callback) {
            return function (input_object) {

                if (!is_object(input_object)) {
                    final_callback(undefined, "Invalid input object");
                }

                const requestor_obj = object_map(
                    preloaded_requestor(requestor)
                )(
                    input_object
                );

                return parallel_object(
                    options
                )(
                    requestor_obj
                )(
                    final_callback
                )(
                    0
                );
            };
        };
    };
};

//test jsc.claim({
//test     name: "parallel applied object",
//test     predicate: function (verdict) {
//test         return function (obj, factor) {
//test             const callback = function (value, ignore) {
//test                 verdict(
//test                     (value === undefined)
//test                     ? (Object.values(obj).some(equals(1)))
//test                     : equals(
//test                         object_reduce(add)(0)(value)
//test                     )(
//test                         multiply(object_reduce(add)(0)(obj))(factor)
//test                     )
//test                 );
//test             };
//test
//test             parallel_applied_object()(
//test                 test_requestors.applied_delay
//test             )(
//test                 callback
//test             )(
//test                 object_map(
//test                     function (value) {
//test                         return {
//test                             fail_rate: (
//test                                 (value === 1)
//test                                 ? 1
//test                                 : 0
//test                             ),
//test                             delay_min: 500,
//test                             delay_max: 2000,
//test                             value: multiply(value)(factor)
//test                         };
//test                     }
//test                 )(
//test                     obj
//test                 )
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.object(
//test             jsc.array(
//test                 jsc.integer(5, 15),
//test                 jsc.string(4, jsc.character("a", "z"))
//test             ),
//test             jsc.integer(30)
//test         ),
//test         jsc.integer(100)
//test     ],
//test     classifier: function (obj, ignore) {
//test         return (
//test             (Object.values(obj).some(equals(1)))
//test             ? "Failure"
//test             : "Success"
//test         );
//test     }
//test });

//MD     race_applied({/p
//MD         throttle,/p
//MD         need/p
//MD     })(/p
//MD         requestor/p
//MD     )/p
//MD /p
const race_applied = applied_requestor(race);

//test jsc.claim({
//test     name: "race applied",
//test     predicate: function (verdict) {
//test         return function (list, win_position) {
//test
//test             const winner_list = array_insert(
//test                 list.length - win_position
//test             )(
//test                 [-1]
//test             )(
//test                 list
//test             );
//test
//test             const callback = function (value, ignore) {
//test                 verdict(
//test                     (value === undefined)
//test                     ? list.every(equals(0))
//test                     : (value === (list.length - win_position))
//test                 );
//test             };
//test
//test             race_applied()(
//test                 test_requestors.applied_delay
//test             )(
//test                 callback
//test             )(
//test                 winner_list.map(
//test                     function (value, index) {
//test                         return {
//test                             fail_rate: (
//test                                 (value === 0)
//test                                 ? 1
//test                                 : 0
//test                             ),
//test                             delay_min: (
//test                                 (value === -1)
//test                                 ? 50
//test                                 : 500
//test                             ),
//test                             delay_max: (
//test                                 (value === -1)
//test                                 ? 100
//test                                 : 2000
//test                             ),
//test                             value: index
//test                         };
//test                     }
//test                 )
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.array(
//test             jsc.integer(4, 8),
//test             jsc.one_of([0, 1, 2, 3, 4, 5], [15, 1, 1, 1, 1, 1])
//test         ),
//test         jsc.integer(4)
//test     ],
//test     classifier: function (list, ignore) {
//test         return (
//test             (list.some(gt(0)))
//test             ? "Success"
//test             : "Failure"
//test         );
//test     }
//test });

//MD ## Other Processors/p

//MD ### Repeat processor/p
//MD     repeat({/p
//MD         continuer,/p
//MD         aggregator/p
//MD     })(/p
//MD         requestor/p
//MD     )/p
//MD /p
//MD Repetitively run a requestor, aggregating its return values with a
//MD curried aggregator function taking two arguments. The aggregator is
//MD similar to a reducer function. Repetition continues until the aggregate
//MD value satisfies a unary continuer function./p

const repeat = function ({continuer, aggregator}) {

    if (continuer === undefined) {
        throw "Continuer function missing";
    }

    if (not(type_check("function")(continuer))) {
        throw "Invalid Continuer function";
    }

    if (aggregator === undefined) {
        throw "Aggregator function missing";
    }

    if (not(type_check("function")(aggregator))) {
        throw "Invalid Aggregator function";
    }

    return function (requestor) {
        return function repeater_requestor(callback) {
            return function (initial_value) {
                let cancel_function;

                const cancel = function () {
                    if (type_check("function")(cancel_function)) {
                        cancel_function();
                    }
                };

                const chained_callback = function (value, reason) {

                    if (value === undefined) {
                        callback(value, reason);
                        return;
                    }

// Aggregate the values (do we want to do this before checking continuer?)
                    const result = aggregator(initial_value)(value);

// If result passes continuer, time to stop
                    if (continuer(result)) {
                        callback(result);
                    } else {
                        cancel_function = repeat(
                            {continuer, aggregator}
                        )(
                            requestor
                        )(
                            callback
                        )(
                            result
                        );
                    }
                };

                cancel_function = requestor(chained_callback)(initial_value);
                return cancel;
            };
        };
    };
};

//test jsc.claim({
//test     name: "repeat",
//test     predicate: function (verdict) {
//test         return function (to_fail, step_value, max_value) {
//test
//test             const callback = function (value, ignore) {
//test                 verdict(
//test                     (value === undefined)
//test                     ? (to_fail)
//test                     : (and(
//test                         remainder(step_value)(value) === 0
//test                     )(
//test                         gt(max_value)(value)
//test                     ))
//test                 );
//test             };
//test
//test             repeat({
//test                 continuer: gt(max_value),
//test                 aggregator: add
//test             })(
//test                 test_requestors.random_delay({
//test                     fail_rate: (
//test                         (to_fail)
//test                         ? 1
//test                         : 0
//test                     ),
//test                     delay_min: 500,
//test                     delay_max: 1500
//test                 })(
//test                     identity
//test                 )
//test             )(
//test                 callback
//test             )(
//test                 step_value
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.boolean(0.3),
//test         jsc.integer(5),
//test         jsc.integer(10, 100)
//test     ],
//test     classifier: function (to_fail) {
//test         return (
//test             (to_fail)
//test             ? "Failure"
//test             : "Success"
//test         );
//test     }
//test });

//MD ### Time Limit/p
//MD     time_limit(/p
//MD         milliseconds/p
//MD     )(/p
//MD         requestor/p
//MD     )/p

//MD `time_limit` returns a requestor that acts like the `requestor` argument
//MD except that it will cancel itself after `milliseconds` elapse. Note
//MD that if any version of the `parallel` factory has satisfied its `need` but
//MD has not completed yet, the time expiring will cancel the unfinished
//MD requestors resulting in success./p
//MD /p
//MD The `cancel` returned by the time limited requestor does not cancel the
//MD time limit. It cancels the `requestor`./p

const time_limit_requestor = function (milliseconds) {
    return function (requestor) {
        return function time_limit_requestor(callback) {
            return function (initial_value) {
                return pronto.time_limit(
                    uncurried_requestor(requestor),
                    milliseconds
                )(
                    callback,
                    initial_value
                );
            };
        };
    };
};

//test jsc.claim({
//test     name: "time limit parallel need",
//test     predicate: function (verdict) {
//test         return function (list, factor, need, min_delay) {
//test             const callback = function (value, ignore) {
//test                 verdict(
//test                     (value === undefined)
//test                     ? (or(
//test                         list.filter(gt(1)).length < need
//test                     )(
//test                         min_delay < 1000
//test                     ))
//test                     : (value.filter(gt(factor)).length >= need)
//test                 );
//test             };
//test
//test             time_limit_requestor(
//test                 min_delay
//test             )(
//test                 parallel({
//test                     need
//test                 })(
//test                     array_map(
//test                         function (value) {
//test                             return test_requestors.random_delay({
//test                                 fail_rate: (
//test                                     (value === 1)
//test                                     ? 1
//test                                     : 0
//test                                 ),
//test                                 delay_min: 1000,
//test                                 delay_max: 1000
//test                             })(
//test                                 multiply(value)
//test                             );
//test                         }
//test                     )(
//test                         list
//test                     )
//test                 )
//test             )(
//test                 callback
//test             )(
//test                 factor
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.array(
//test             jsc.integer(8, 12),
//test             jsc.integer(5)
//test         ),
//test         jsc.integer(100),
//test         jsc.integer(4, 7),
//test         jsc.integer(500, 1500)
//test     ],
//test     classifier: function (list, ignore, need, min_delay) {
//test         return (
//test             ((list.filter(gt(1)).length < need) || (min_delay < 1000))
//test             ? "Failure"
//test             : "Success"
//test         );
//test     }
//test });

//MD ## Other factories/p

//MD ### Conditional requestor/p
//MD     conditional_requestor(error_message)(predicate)/p
//MD /p
//MD Take an error message, then a predicate and return a requestor that will
//MD test the value passed into it.
//MD If the predicate returns truthy, send the value to the callback.
//MD If the predicate fails, call the callback with the error message./p

const conditional_requestor = function (error_message = "") {
    return function (predicate) {
        return function conditional_requestor(callback) {
            return function (value) {
                if (predicate(value)) {
                    callback(value);
                } else {
                    callback(
                        undefined,
                        (
                            (error_message.length > 0)
                            ? error_message
                            : "conditional_requestor: value failed predicate"
                        )
                    );
                }
            };
        };
    };
};

//test jsc.claim({
//test     name: "conditional requestor",
//test     predicate: function (verdict) {
//test         return function (threshold, test_value) {
//test             const callback = function (value, ignore) {
//test                 verdict(
//test                     (value === undefined)
//test                     ? (not(gt(threshold)(test_value)))
//test                     : (gt(threshold)(test_value))
//test                 );
//test             };
//test
//test             conditional_requestor(
//test                 "Failed threshold " + threshold + " with " + test_value
//test             )(
//test                 gt(threshold)
//test             )(
//test                 callback
//test             )(
//test                 test_value
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.integer(100),
//test         jsc.integer(100)
//test     ],
//test     classifier: function (threshold, test_value) {
//test         return (
//test             (gt(threshold)(test_value))
//test             ? "Success"
//test             : "Failure"
//test         );
//test     }
//test });

//MD ### Constant requestor/p
//MD     constant_requestor(/p
//MD         return_value/p
//MD     )/p
//MD /p
//MD Make a requestor that always returns the same value. This can be useful for
//MD inserting a value into a sequence of requestors./p

// Code at top of file so that it is in scope for applied processors

//test jsc.claim({
//test     name: "constant requestor",
//test     predicate: function (verdict) {
//test         return function (test_value) {
//test             const callback = function (value, ignore) {
//test                 verdict(value === test_value);
//test             };
//test
//test             constant_requestor(
//test                 test_value
//test             )(
//test                 callback
//test             )(
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.string()
//test     ]
//test });

//MD ### Promise requestor/p
//MD     promise_requestor(/p
//MD         promise/p
//MD     )/p
//MD /p
//MD Convert a Javascript promise to a requestor/p

const promise_requestor = function (promise_object) {
    return function promise_requestor(callback) {
        const on_err = function (err) {
            return callback(undefined, err.message);
        };

        return function (ignore) {
            promise_object().then(callback).catch(on_err);
        };
    };
};

//test jsc.claim({
//test     name: "promise requestor",
//test     predicate: function (verdict) {
//test         return function (to_fail, duration, test_value) {
//test             test_requestors.delay_promise({
//test                 fail_rate: (
//test                     (to_fail)
//test                     ? 1
//test                     : 0
//test                 ),
//test                 delay_min: 500,
//test                 delay_max: 500 + duration,
//test                 value: test_value
//test             }).then(
//test                 compose(verdict)(type_check("number"))
//test             ).catch(
//test                 compose(verdict)(type_check("string"))
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.boolean(),
//test         jsc.integer(1000),
//test         jsc.integer()
//test     ],
//test     classifier: function (to_fail) {
//test         return (
//test             (to_fail)
//test             ? "Failure"
//test             : "Success"
//test         );
//test     }
//test });

//MD ### Unary requestor/p
//MD     unary_requestor(/p
//MD         function/p
//MD     )/p
//MD /p
//MD Turn a non-blocking unary function into a requestor./p

const unary_requestor = function (unary_fx) {
    return function unary_requestor(callback) {
        return function (value) {
            try {
                callback(unary_fx(value));
            } catch (exception) {
                callback(undefined, exception.message);
            }
        };
    };
};

//test jsc.claim({
//test     name: "unary requestor",
//test     predicate: function (verdict) {
//test         return function (test_object) {
//test             const callback = function (value, ignore) {
//test                 verdict(
//test                     (value === undefined)
//test                     ? (type_check("number")(test_object))
//test                     : (type_check("number")(test_object.prime_key))
//test                 );
//test             };
//test
//test             unary_requestor(
//test                 prop("prime_key")
//test             )(
//test                 callback
//test             )(
//test                 test_object
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.one_of([
//test             jsc.object({
//test                 prime_key: jsc.integer()
//test             }),
//test             jsc.integer()
//test         ])
//test     ],
//test     classifier: function (test_object) {
//test         return (
//test             (type_check("number")(test_object))
//test             ? "Failure"
//test             : "Success"
//test         );
//test     }
//test });

//MD ### Wait requestor/p
//MD     wait_requestor({/p
//MD         predicate,/p
//MD         args,/p
//MD         interval,/p
//MD         timeout/p
//MD     })(/p
//MD         value/p
//MD     )/p
//MD /p
//MD Poll a predicate function at a specified interval until it returns true./p
//MD Parameters:/p
//MD - predicate: a unary function/p
//MD - args: value or array of arguments to apply to predicate (optional)/p
//MD - interval: the interval at which to poll the predicate/p
//MD - timeout: elapsed time at which to stop polling and fail (optional)/p
//MD - value: the value to return or function to invoke when the predicate
//MD succeeds/p

const wait_requestor = function ({predicate, args, interval, timeout}) {

    if (!type_check("function")(predicate)) {
        throw "Invalid predicate function";
    }

    if (interval === undefined) {
        throw "No interval value specified";
    }

    return function (callback) {
        return function (value) {
            let cancel_timer;
            let cancel_limit;

// Can't return an undefined value from a requestor - use a timestamp
            if (value === undefined) {
                value = Date.now;
            }

// Check the predicate
            const tester = function () {
                const result = (
                    (Array.isArray(args))
                    ? predicate(...args)
                    : predicate(args)
                );

                if (result === true) {

// Shut down any timeout timer
                    if (cancel_limit !== undefined) {
                        cancel_limit();
                    }

// Shut down the interval timer
                    cancel_timer();

// Return the value to the callback
                    callback(
                        (type_check("function")(value))
                        ? value()
                        : value
                    );
                }
            };

// Shutdown the requestor if timed out
            const timeout_callback = function () {

                if (cancel_timer !== undefined) {
                    cancel_timer();
                }

                callback(undefined, "Timeout exceeded");
            };

// Start the timer(s)
            try {
                cancel_timer = set_interval(interval)(tester);

                if (type_check("number")(timeout)) {
                    cancel_limit = set_timeout(timeout)(timeout_callback);
                }
            } catch (exception) {
                callback(undefined, exception.message);
                return;
            }

// If user cancels, clear the timeout and interval timers
            return function cancel() {
                if (cancel_limit !== undefined) {
                    cancel_limit();
                }

                if (cancel_timer !== undefined) {
                    cancel_timer();
                }
            };
        };
    };
};

//test const countdown = function (from) {
//test     return function () {
//test
//test         if (from > 0) {
//test             from = from - 1;
//test         }
//test
//test         return from;
//test     };
//test };
//test
//test const wait_interval = 200;
//test
//test jsc.claim({
//test     name: "wait requestor",
//test     predicate: function (verdict) {
//test         return function (ticks, time_out, test_value) {
//test             const callback = function (value, ignore) {
//test                 verdict(
//test                     (value === undefined)
//test                     ? (time_out < (ticks + 1) * wait_interval)
//test                     : (type_check("string")(value))
//test                 );
//test             };
//test
//test             wait_requestor({
//test                 predicate: compose(lt(1))(countdown(ticks)),
//test                 interval: wait_interval,
//test                 timeout: time_out
//test             })(
//test                 callback
//test             )(
//test                 test_value
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.integer(10),
//test         jsc.integer(1000, 1800),
//test         jsc.string()
//test     ],
//test     classifier: function (ticks, time_out, ignore) {
//test         return (
//test             (time_out < (ticks + 1) * wait_interval)
//test             ? "Failure"
//test             : "Success"
//test         );
//test     }
//test });

//MD ## Tools/p

//MD ### Functional callback/p
//MD     functional_callback(/p
//MD         failure_function/p
//MD     )(/p
//MD         success_function/p
//MD     )/p
//MD /p
//MD Create a requestor callback from functions to be invoked in the failure or
//MD success cases. The fail case will be called with the failure reason, while
//MD the success case will be called with the returned value./p

const functional_callback = function (on_fail) {
    return function (on_success) {
        return function callback(value, reason) {
            if (value === undefined) {
                on_fail(reason);
            } else {
                on_success(value);
            }
        };
    };
};

//test jsc.claim({
//test     name: "functional callback",
//test     predicate: function (verdict) {
//test         return function (test_value) {
//test             conditional_requestor(
//test                 "Failed test with " + test_value
//test             )(
//test                 gt(0)
//test             )(
//test                 functional_callback(
//test                     compose(verdict)(constant(true))
//test                 )(
//test                     compose(verdict)(constant(true))
//test                 )
//test             )(
//test                 test_value
//test             );
//test         };
//test     },
//test     signature: [
//test         jsc.integer(-100, 100)
//test     ],
//test     classifier: function (test_value) {
//test         return (
//test             (gt(0)(test_value))
//test             ? "Success"
//test             : "Failure"
//test         );
//test     }
//test });

//test jsc.check({
//test     on_report: log,
//test     nr_trials: 20
//test });

export default Object.freeze({
    fallback,
    fallback_applied,
    indexed,
    parallel,
    parallel_applied,
    parallel_applied_object,
    parallel_object,
    race,
    race_applied,
    race_object,
    record,
    repeat,
    sequence,
    time_limit_requestor,
    conditional_requestor,
    constant_requestor,
    promise_requestor,
    unary_requestor,
    wait_requestor,
    functional_callback
});