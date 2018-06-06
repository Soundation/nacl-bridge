(function(window) {

  'use strict';

  var BridgeEvent = function MyEvent(bridge, element, type, canBubble, cancelable, details) {
    this.target = bridge;
    this.srcElement = element;
    this.type = type.valueOf();
    this.timeStamp = new Date().getTime();
    this.bubbles = canBubble || false;
    this.cancelBubble = !canBubble;
    this.cancelable = cancelable || false;
    this.defaultPrevented = false;
    if(details) {
      if('object' === typeof details && !(details instanceof Array)) {
        var self = this;
        Object.keys(details).forEach(function (key) {
          self[key] = details[key];
        });
      } else {
        this.details = details;
      }
    }
  };

  var nacl = window.nacl = function nacl(element, loaded) {
    return new Bridge(element, loaded);
  };

  var Bridge = function Bridge(element, loaded) {
    this.element = element;
    this.calls = {};
    this.callCounter = 0;
    this.listeners = {};

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

  Bridge.prototype.onMessage = function(event) {

    var msg = event.data;

    if(msg && msg.id && msg.type) {

      // callback
      var call = this.calls[msg.id];

      if(!call) {
        console.log("nop");
        return;
      }

      // handle callbacks
      if(msg.type == 'success' && 'function' === typeof call.success) {
        call.success.call(null, msg.data);
      } else if(msg.type == 'error' && 'function' === typeof call.fail) {
        call.fail.call(null, msg.data);
      } else if(msg.type == 'status' && 'function' === typeof call.status) {
        call.status.call(null, msg.data);
      }

      // remove listeners
      if((msg.type == 'success' || msg.type == 'error') && 'function' !== typeof call.status) {
        delete this.calls[msg.id];
      }
    } else if(msg && msg.event) {
      var target = this.element;
      var self = this;
      if(this.listeners[msg.event] instanceof Array) {
        this.listeners[msg.event].forEach(function(listener) {
          listener.call(self, new BridgeEvent(self, self.element, msg.event, true, true, msg.data));
        });
      }
    }
  };

  Bridge.prototype.exec = function(data, success, fail, status) {

    var id = ++this.callCounter;
    var self = this;

    if('function' === typeof success || 'function' === typeof fail || 'function' === typeof status) {
      this.calls[id] = {
        success: success,
        fail: fail,
        status: status
      };
    }

    var op = {
      id: id,
      cancel: function() {
        delete self.calls[id];
        if(self.pending instanceof Array) {
          self.pending = self.pending.filter(function(arg) { return arg.id !== id; });
        } else {
          self.element.postMessage({ cancel: id });
        }
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

  Bridge.prototype.addEventListener = Bridge.prototype.on = function(event, listener) {
    if(!(this.listeners[event] instanceof Array)) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  };

  Bridge.prototype.removeEventListener = Bridge.prototype.off = function(event, listener) {
    if(this.listeners[event] instanceof Array) {
      this.listeners[event] = this.listeners[event].filter(function(l) {
        return l !== listener;
      });
      if(!this.listeners[event].length) {
        delete this.listeners[event];
      }
    }
  };

  Bridge.prototype.removeAllEventListeners = function(event) {
    if('string' !== typeof event) {
      this.listeners = {};
    } else {
      delete this.listeners[event];
    }
  };


}(window));
