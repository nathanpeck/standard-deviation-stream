module.exports = function (key, redisClient) {
  this.saveKey = key;
  this.newMean = 0;
  this.newVariance = 0;
  this.oldMean = 0;
  this.oldVariance = 0;
  this.currentMin = 0;
  this.currentMax = 0;

  this.valueCount = 0;

  //Push a new value into the stream.
  this.push = function (incomingNumber) {
    this.valueCount++;
    if (this.valueCount == 1)
    {
      this.oldMean =
      this.newMean =
      this.currentMin =
      this.currentMax = incomingNumber;
      this.oldVariance = 0;
    }
    else
    {
      this.newMean = this.oldMean + (incomingNumber - this.oldMean) / this.valueCount;
      this.newVariance = this.oldVariance + (incomingNumber - this.oldMean) * (incomingNumber - this.newMean);
      this.oldMean = this.newMean;
      this.oldVariance = this.newVariance;
      this.currentMin = Math.min(this.currentMin, incomingNumber);
      this.currentMax = Math.max(this.currentMax, incomingNumber);
    }
  };

  //Clear the stream's state.
  this.clear = function (done) {
    this.valueCount = 0;
    this.newMean = 0;
    this.oldMean = 0;
    this.newVariance = 0;
    this.oldVariance = 0;
    this.currentMin = 0;
    this.currentMax = 0;
    if (redisClient)
      redisClient.del(this.saveKey, done);
    else
      done('No redis client was specified when creating this standard deviation stream');
  };

  //How many items have we pushed in?
  this.count = function () {
    return this.valueCount;
  };

  //What is the average of the items we've put in?
  this.mean = function () {
    return (this.valueCount > 0) ? this.newMean : 0;
  };

  //What is the variance of the items?
  this.variance = function () {
    return ((this.valueCount > 1) ? this.newVariance / (this.valueCount - 1) : 0.0);
  };

  //What is the standard deviation of the items?s
  this.standardDeviation = function () {
    return Math.sqrt(this.variance());
  };

  // Get the minimum value
  this.min = function () {
    return this.currentMin;
  };

  // Get the maximum value
  this.max = function () {
    return this.currentMax;
  };

  //Restore the state of the deviation stream from cache
  this.restore = function (done) {
    if (redisClient) {
      var self = this;
      redisClient.get(
        self.saveKey,
        function (err, result) {
          if (err)
            done(err);
          else
          {
            if (result !== null)
            {
              result = JSON.parse(result);
              self.valueCount = result.count;
              self.newMean = result.newMean;
              self.newVariance = result.newVariance;
              self.oldMean = result.oldMean;
              self.oldVariance = result.oldVariance;
              self.currentMin = result.currentMin === undefined ? // so we can restore with backwards compatability
                Number.MAX_SAFE_INTEGER : result.currentMin;
              self.currentMax = result.currentMax === undefined ? // so we can restore with backwards compatability
                Number.MIN_SAFE_INTEGER : result.currentMax;
            }
            done();
          }
        }
      );
    }
    else
    {
      done('No redis client was specified when creating this standard deviation stream');
    }
  };

  //Cache the state of the deviation stream in Redis.
  this.save = function (done) {
    if (redisClient) {
      var self = this;

      var saveState = {
        newMean: self.newMean,
        newVariance: self.newVariance,
        oldMean: self.oldMean,
        oldVariance: self.oldVariance,
        count: self.valueCount,
        currentMin: self.currentMin,
        currentMax: self.currentMax,
      };

      redisClient.multi()
        .set(this.saveKey, JSON.stringify(saveState))
        .expire(this.saveKey, 3600)
        .exec(done);
    }
    else
    {
      done('No redis client was specified when creating this standard deviation stream');
    }
  };
};
