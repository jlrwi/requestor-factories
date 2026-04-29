# Requestor Factories   
This project exports curried factory functions based on Douglas Crockford's [Pronto](https://github.com/douglascrockford/Pronto). (Pronto is the successor to Crockford's Parseq.)   
## Overview   
### Requestors   
A curried requestor function is any function that takes a callback and a value.   
   
    my_little_requestor(callback)(value)   
A requestor will do some work or send a message to another process or system. When the work is done, the requestor signals the result by passing a value to its callback. The callback could be called in a future turn, so the requestor does not need to block, nor should it ever block.   
   
The `value` may be of any type, including objects, arrays, and `undefined`. A requestor should not throw an exception. It should communicate all failures through its callback.   
### Requestor Factory   
A requestor factory is any function that returns a requestor function. A factory function may throw an exception if it finds problems in its arguments.   
### Requestor Processor   
A requestor processor is a requestor factory that acts on a requestor or a collection of requestors.   
### Callback   
A callback function takes two arguments, `value` and `reason`, and is not curried.   
   
    my_little_callback(value, reason)   
If `value` is `undefined`, then failure is being signalled. `reason` may contain information explaining the failure. If `value` is not `undefined`, then success is being signalled and `value` contains the result. Reasons are debugging clues.   
### Cancel   
A requestor function may return a cancel function. A cancel function takes a reason argument that might be propagated and logged as the reason a requestor failed.   
   
    my_little_cancel(reason)   
A cancel function attempts to stop the operation of the requestor. If a program decides that it no longer needs the result of a requestor, it can call the cancel function that the requestor returned. This is not an undo operation. It is just a way of stopping unneeded work. There is no guarantee that the work actually stops. The cancel mechanism is totally optional and advisory. It is provided to give you the opportunity to prevent the wasting of resources.   
## Pronto bulk processors   
These are curried forms of the original processors from `pronto.js` that operate on collections of requestors. Options are passed to these functions in an initial object. (Some factories do not take any options but retain the calling pattern for consistency.)   
### Fallback   
    fallback(   
    )(   
        requestor_array   
    )   
Fallback takes no options and returns a requestor function. When the requestor is called, it will call the first requestor in `requestor_array`. If that is ultimately successful, its value will be passed to the callback. But if that requestor fails, the next requestor will be called, and so on. If none of the requestors is successful, then the fallback fails. If any succeeds, then the fallback succeeds.   
   
The fallback requestor will return a cancel function that can be called when the result is no longer needed.   
### Parallel   
    parallel({   
        throttle,   
        need   
    })(   
        requestor_array   
    )   
Parallel returns a requestor that processes the `requestor_array` in parallel, producing an array of all of the successful results. The value produced by the first element of the requestor_array provides the first element of the result. If any requestor fails, the pending requestors are cancelled and this operation fails.   
   
By default, it starts all of the requestors in the `requestor_array` at once, each in its own turn so that they do not interfere with each other. This can shock some systems by unleashing a lot of demand at once. To mitigate the shock, the optional `throttle` argument sets the maximum number of requestors running at a time. As requestors succeed or fail, waiting requestors can be started.   
   
By default, all of the requestors in the requestor_array must succeed. Optionally, a smaller number of needed results can be specified. If the number of successes is greater than or equal to `need`, then the whole operation succeeds. The `need` argument must be between 0 and requestor_array.length.   
### Race   
    race({   
        throttle,   
        need   
    })(   
        requestor_array   
    )   
Race returns a requestor that starts all of the requestors in `requestor_array` in parallel. Its result is the result of the first of those requestors to successfully finish. All of the other requestors will be cancelled. If all of those requestors fail, then the race fails.   
   
By default, it starts all of the requestors in the `requestor_array` at once, each in its own turn so that they do not interfere with each other. This can shock some systems by unleashing a lot of demand at once. To mitigate the shock, the optional `throttle` argument sets the maximum number of requestors running at a time. As requestors succeed or fail, waiting requestors can be started.   
   
By default, a single result is produced. If an array of results is needed, specify the needed number of results in the `need` parameter. When the needed number of successful results is obtained, the operation ends. The results go into a sparce array, and unfinished requestors are cancelled. The `need` argument must be between 1 and requestor_array.length.   
### Sequence   
    sequence(   
    )(   
        requestor_array   
    )   
Sequence takes no options and returns a requestor that processes each requestor in `requestor_array` one at a time. Each of those requestors will be passed the result of the previous requestor as its `value` argument. If all succeed, then the sequence succeeds, giving the result of the last of the requestors. If any fail, then the sequence fails.   
## Objectified bulk processors   
Each of these bulk processors takes an object of requestors rather than arrays of requestors.   
   
    parallel_object({   
        throttle,   
        need   
    })(   
        requestor_object   
    )   
   
    race_object({   
        throttle,   
        need   
    })(   
        requestor_object   
    )   
## Other bulk processors   
### Indexed processor   
    indexed_requestor({   
        throttle,   
        need   
    })(   
        requestors_array   
    )   
   
Send each requestor in an array of requestors the corresponding value from the same index in the input array, running all the requestors in parallel.   
### Record processor   
    record_requestor({   
        throttle,   
        need   
    })(   
        requestors_object   
    )   
   
Send each requestor in an object of requestors the corresponding property value from the input object, running all the requestors in parallel.   
## Applied processors   
Each of these processors corresponds to an original variant, except that instead of applying a single value to a list of requestors, each value in a list is applied to a single requestor.   
   
    fallback_applied(   
    )(   
        requestor   
    )   
   
    parallel_applied({   
        throttle,   
        need   
    })(   
        requestor   
    )   
   
    parallel_applied_object({   
        throttle,   
        need   
    })(   
        requestor   
    )   
   
    race_applied({   
        throttle,   
        need   
    })(   
        requestor   
    )   
   
## Other Processors   
### Repeat processor   
    repeat({   
        continuer,   
        aggregator   
    })(   
        requestor   
    )   
   
Repetitively run a requestor, aggregating its return values with a curried aggregator function taking two arguments. The aggregator is similar to a reducer function. Repetition continues until the aggregate value satisfies a unary continuer function.   
### Time Limit   
    time_limit(   
        milliseconds   
    )(   
        requestor   
    )   
`time_limit` returns a requestor that acts like the `requestor` argument except that it will cancel itself after `milliseconds` elapse. Note that if any version of the `parallel` factory has satisfied its `need` but has not completed yet, the time expiring will cancel the unfinished requestors resulting in success.   
   
The `cancel` returned by the time limited requestor does not cancel the time limit. It cancels the `requestor`.   
## Other factories   
### Conditional requestor   
    conditional_requestor(error_message)(predicate)   
   
Take an error message, then a predicate and return a requestor that will test the value passed into it. If the predicate returns truthy, send the value to the callback. If the predicate fails, call the callback with the error message.   
### Constant requestor   
    constant_requestor(   
        return_value   
    )   
   
Make a requestor that always returns the same value. This can be useful for inserting a value into a sequence of requestors.   
### Promise requestor   
    promise_requestor(   
        promise   
    )   
   
Convert a Javascript promise to a requestor   
### Unary requestor   
    unary_requestor(   
        function   
    )   
   
Turn a non-blocking unary function into a requestor.   
### Wait requestor   
    wait_requestor({   
        predicate,   
        args,   
        interval,   
        timeout   
    })(   
        value   
    )   
   
Poll a predicate function at a specified interval until it returns true.   
Parameters:   
- predicate: a unary function   
- args: value or array of arguments to apply to predicate (optional)   
- interval: the interval at which to poll the predicate   
- timeout: elapsed time at which to stop polling and fail (optional)   
- value: the value to return or function to invoke when the predicate succeeds   
## Tools   
### Functional callback   
    functional_callback(   
        failure_function   
    )(   
        success_function   
    )   
   
Create a requestor callback from functions to be invoked in the failure or success cases. The fail case will be called with the failure reason, while the success case will be called with the returned value.   
