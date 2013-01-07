/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose the decorator function.
   */

  exports.healthchecked = healthchecked;

  /**
   * Augment a SocketNamespace object to have health check capabilities.
   *
   * @param {SocketNamespace} [namespace] the SocketNamespace object.
   * @param {Object} [options] health check related configuration values.
   * @api public
   */

  function healthchecked (namespace, options) {

    // Extend by prototype inheritance.
    // var self = Object.create(namespace, healthchecked.prototype);

    // Extend by method reference copying.
    var self = namespace;
    for (var p in healthchecked.prototype) {
      if (healthchecked.prototype.hasOwnProperty(p)) {
        self[p] = healthchecked.prototype[p];
      }
    }

    /***************************************************/

    // Setup the latency related data container for this socket namespace.
    self.resetHealthcheckData();

    // options && io.util.mixin(self.healthcheck.config, options);

    self.on('connect', self.checkup);

    self.on('disconnect', function () {
      self.healthcheck._timeout && clearTimeout(self.healthcheck._timeout);
    });

    return self;
  };

  /**
   * Setup the latency related data container for this socket namespace.
   *
   * @api private
   */

  healthchecked.prototype.resetHealthcheckData = function () {
    this.healthcheck = {
      data: {
        latency : 0,
        rtt     : 0
      },
      _timeout  : undefined,
      config: {
        interval: 2000 // milliseconds, default value.
      }
    };

    return this;
  };

  /**
   * Health checkup to the server.
   *
   * @api private
   */
  healthchecked.prototype.checkup = function () {
    var self = this;
    this.emit(
      'health check',
      {latency: this.healthcheck.data.latency, timestamp: (new Date).getTime()},
      function (timestamp) { self.ack_checkup(timestamp); }
    );
  };

  /**
   * Health checkup acknowledgement from the server.
   *
   * Exposes latency updates to application logic by emitting "latency changed" event.
   *
   * @param {Number} [timestamp] the timestamp sent to the server on the originating checkup.
   * @api private
   */
  healthchecked.prototype.ack_checkup = function (timestamp) {
    var self = this
    , prevLatency = this.healthcheck.data.latency;

    this.updateHealthcheckData(timestamp);

    // Expose the latency change to the application logic.
    if (prevLatency !== this.healthcheck.data.latency) {
      this.$emit('latency changed', {latency: this.healthcheck.data.latency});
    };

    this.healthcheck._timeout = setTimeout(
      function () { self.checkup() },
      this.healthcheck.config.interval);
  };

  /**
   * Recompute the round trip time client-server using a measured value.
   *
   * @param {Number} [delta] Round trip time between client and server in milliseconds.
   * @api private
   */

  healthchecked.prototype.computeRTT = function (delta) {
    this.healthcheck.data.rtt = delta;
    return this;
  };

  /**
   * Compute the latency using the healthcheck data collected in the socket.
   *
   * @api private
   */

  healthchecked.prototype.computeLatency = function () {
    this.healthcheck.data.latency = this.healthcheck.data.rtt;
    return this;
  };

  /**
   * Update latency related data for a namespace, using a RTT value.
   *
   * @param {Number} [timestamp] timestamp returned from a checkup.
   * @api private
   */

  healthchecked.prototype.updateHealthcheckData = function (timestamp) {
    var delta = (new Date).getTime() - timestamp;

    // Update round trip time measurements.
    this.computeRTT(delta);

    // Using the values computed, approximate latency.
    this.computeLatency();

    return this;
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);
