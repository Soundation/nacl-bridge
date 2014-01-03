(function(window) {

  'use strict';

  var nacl = window.nacl = function nacl(element, loaded) {
    return new Bridge(element, loaded);
  };

  var Bridge = function Bridge(element, loaded) {
    this.element = element;
    this.calls = {};
    this.callCounter = 0;

    var self = this;

    if(loaded) {
      this.onLoad();
    } else {
      this.element.addEventListener('load', function() { self.onLoad(); }, true);
    }
    this.element.addEventListener('message', function(message) { self.onMessage(message); }, true);
  };

  Bridge.prototype.onLoad = function() {
    this.loaded = true;
    if(this.pending) {
      var element = this.element;
      this.pending.forEach(function(arg) {
        element.postMessage.call(element, arg);
      });
      delete this.pending;
    }
  };

  Bridge.prototype.onMessage = function(msg) {
    if(msg && msg.id && msg.type) {

      // callback
      var call = this.calls[msg.id];
      if(!call) {
        return;
      }

      // handle callbacks
      if(msg.type === 'success' && 'function' === typeof call.success) {
        call.success.call(null, msg.data);
      } else if(msg.type === 'error' && 'function' === typeof call.fail) {
        call.fail.call(null, msg.data);
      } else if(msg.type === 'status' && 'function' === typeof call.status) {
        call.status.call(null, msg.data);
      }

      // remove listeners
      if((msg.type === 'success' || msg.type === 'error') && 'function' !== typeof call.status) {
        delete this.calls[msg.id];
      }
    }
  };

  Bridge.prototype.exec = function(data, success, fail, status) {

    var callObject = {
      success: success,
      fail: fail,
      status: status
    };

    var id = ++this.callCounter;
    var self = this;
    this.calls[id] = callObject;
    var op = {
      cancel: function() {
        delete self.calls[id];
        if(self.pending instanceof Array) {
          self.pending = self.pending.filter(function(arg) { return arg.id !== id; });
        }
        self.element.postMessage({ cancel: id });
      }
    };

    var arg = { id: id, data: data };
    if(!this.loaded) {
      this.pending = this.pending || [];
      this.pending.push(arg);
    } else {
      this.element.postMessage(arg);
    }

    return op;
  };

}(window));