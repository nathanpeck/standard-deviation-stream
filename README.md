standard-deviation-stream
=========================

[![Build Status](https://travis-ci.org/nathanpeck/standard-deviation-stream.svg?branch=master)](https://travis-ci.org/nathanpeck/standard-deviation-stream)

A Node.js method for finding the standard deviation of numbers arriving in a stream. Based on Donald Knuth's
solution in Art of Computer Programming as [described by John D. Cook](http://www.johndcook.com/standard_deviation.html).

Basic Example
-------------

Just get the standard deviation on some numbers.

```javascript
var DeviationStream = require('standard-deviation-stream');

var numbers = new DeviationStream();

numbers.push(10);
numbers.push(15);
numbers.push(20);
numbers.push(25);

console.log('Count: '+numbers.count());
console.log('Mean: '+numbers.mean());
console.log('Variance: '+numbers.variance());
console.log('Standard Deviation: '+numbers.standardDeviation());

numbers.clear();
```

Redis Enhanced Example
----------------------

If you are fetching a stream of numbers in batches it can be useful to save the state of the standard deviation stream
between batches.

For example lets say you have a web endpoint that returns results from a database collection in pages of
100 at a time, and needs to calculate standard deviation on the results. With the redis enhanced style you can fetch 100 items,
calculate standard deviation on that page of 100 results, and cache the stream data.

Now the next time the web endpoint is called to fetch the next page of 100 results you can restore from
cache and continue calculating the standard deviation on the next 100 items, taking into account the mean and variance
of the first 100 items that you fetched in the previous request.

```javascript
var async = require('async');
var DeviationStream = require('standard-deviation-stream');

var numbers = new DeviationStream('someResults', redisConnection);

async.series(
	[
		function (done) {
			numbers.restore(done);
		},

		function (done) {
			numbers.push(10);
			numbers.push(15);
			numbers.push(20);
			numbers.push(25);
			numbers.save(done);
		}
	],
	function () {
		console.log('Done');
	}
);

```

By default the save function stores the standard deviation stream data in a Redis key with an expiration of one hour.
This allows you to continue adding more items to a stream based on that key at any time within an hour.

Installation & Testing
----------------------

```
npm install standard-deviation-stream
npm test
```

To run the tests on the Redis enhanced capability you'll need to be running Redis locally on port 6379
