var expect          = require('chai').expect,
    redis           = require('redis'),
    async           = require('async'),
    _               = require('lodash'),
    DeviationStream = require('../lib/standard-deviation-stream.js');

var redisConfig = {
  host: "127.0.0.1",
  port: 6379
};

function generateRandomGuid() {
  var guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
  return guid;
}

describe('Standard Deviation Stream', function () {
  var redisClient = null;

  //Make sure we can connect to Redis.
  before(function (callback) {
    redisClient = redis.createClient(redisConfig.port, redisConfig.host);

    redisClient.on('error', function (err) {
      callback('Failed to connect to Redis:' + err);
    });

    redisClient.on('ready', function () {
      console.log('Connected to Redis successfully.');
      callback(null);
    });
  });

  var testDeviation;
  var restoredDeviation;

  describe('Creating stream and restoring state from a blank key', function () {
    before(function (done) {
      var key = 'testData:' + generateRandomGuid();
      testDeviation = new DeviationStream(key, redisClient);
      restoredDeviation = new DeviationStream(key, redisClient);

      testDeviation.restore(function () {
        done();
      });
    });

    it('should restore it to a blank state', function () {
      expect(testDeviation.count()).to.equal(0);
      expect(testDeviation.mean()).to.equal(0);
      expect(testDeviation.variance()).to.equal(0);
      expect(testDeviation.standardDeviation()).to.equal(0);
    });
  });

  describe('Pushing some data into the deviation stream', function () {
    before(function () {
      _.each(
        [0, 100, 0, 100, 0, 100, 0, 100, 0, 100, 0, 100, 0, 100, 0, 100, 0, 100, 0, 100, 0, 100, 0, 100, 0, 100, 0, 100, 0, 100],
        function (item) {
          testDeviation.push(item);
        }
      );
    });

    it('should produce some reasonable values', function () {
      expect(testDeviation.count()).to.equal(30);
      expect(testDeviation.mean()).to.equal(50);
      expect(testDeviation.standardDeviation()).to.be.above(49).below(51);
      expect(testDeviation.min()).to.equal(0);
      expect(testDeviation.max()).to.equal(100);
    });
  });

  describe('Saving state in one stream and then restoring it in another stream using the same key', function () {
    before(function (done) {
      async.series(
        [
          function save(callback) {
            testDeviation.save(callback);
          },

          function restore(callback) {
            restoredDeviation.restore(callback);
          }
        ],
        function (err) {
          expect(err).to.equal(null);
          done();
        }
      );
    });

    it('should retain the same values', function () {
      expect(restoredDeviation.count()).to.equal(30);
      expect(restoredDeviation.mean()).to.equal(50);
      expect(restoredDeviation.standardDeviation()).to.be.above(49).below(51);
      expect(testDeviation.min()).to.equal(0);
      expect(testDeviation.max()).to.equal(100);
    });
  });

  describe('Restoring state after clearing state', function () {
    before(function (done) {
      async.series(
        [
          function save(callback) {
            testDeviation.clear(callback);
          },

          function restore(callback) {
            testDeviation.restore(callback);
          }
        ],
        function (err) {
          expect(err).to.equal(null);
          done();
        }
      );
    });

    it('should have the stream in a reset state', function () {
      expect(testDeviation.count()).to.equal(0);
      expect(testDeviation.mean()).to.equal(0);
      expect(testDeviation.variance()).to.equal(0);
      expect(testDeviation.standardDeviation()).to.equal(0);
      expect(testDeviation.min()).to.equal(0);
      expect(testDeviation.max()).to.equal(0);
    });
  });

  describe('Attempting to use Redis operations without specifying a Redis client', function () {
    var nonRedisDeviation = new DeviationStream('test');

    it('Attempting to save state should return an error', function () {
      nonRedisDeviation.save(function (err) {
        expect(err).to.be.a('string');
      });
    });

    it('Attempting to restore state should return an error', function () {
      nonRedisDeviation.restore(function (err) {
        expect(err).to.be.a('string');
      });
    });

    it('Attempting to clear state should return an error', function () {
      nonRedisDeviation.clear(function (err) {
        expect(err).to.be.a('string');
      });
    });
  });

  describe('Another sanity test', function () {
    before(function () {
      _.each(
        [0, 25, 50, 75, 100, 0, 25, 50, 75, 100, 0, 25, 50, 75, 100, 0, 25, 50, 75, 100, 0, 25, 50, 75, 100,
         0, 25, 50, 75, 100, 0, 25, 50, 75, 100, 0, 25, 50, 75, 100, 0, 25, 50, 75, 100, 0, 25, 50, 75, 100],
        function (item) {
          testDeviation.push(item);
        }
      );
    });

    it('should produce some reasonable values', function () {
      expect(testDeviation.count()).to.equal(50);
      expect(testDeviation.mean()).to.equal(50);
      expect(testDeviation.standardDeviation()).to.be.above(35).below(36);
      expect(testDeviation.min()).to.equal(0);
      expect(testDeviation.max()).to.equal(100);
    });
  });
});
