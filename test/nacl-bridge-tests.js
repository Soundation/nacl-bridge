describe('nacl-bridge', function() {

  var bridge, element;

  beforeEach(function() {
    element = {
      addEventListener: sinon.stub(),
      postMessage: sinon.stub()
    };
  });

  it('waits for load event if loaded is falsy', function() {
    bridge = nacl(element);
    expect(element.addEventListener.withArgs('load')).calledOnce;
  });

  it('does not wait for load event if loaded is truthy', function() {
    bridge = nacl(element, true);
    expect(element.addEventListener.withArgs('load')).not.called;
  });

  it('listens for messages', function() {
    bridge = nacl(element);
    expect(element.addEventListener.withArgs('message')).calledOnce;
  });

  it('never calls post if message is cancelled before load', function() {
    bridge = nacl(element);

    bridge.exec(1).cancel();
    bridge.exec(2);
    element.addEventListener.withArgs('load').yield();

    expect(element.postMessage.withArgs({ id: 1, data: 1 })).not.called;
    expect(element.postMessage.withArgs({ id: 2, data: 2 })).calledOnce;
  });

  describe('#exec', function() {

    beforeEach(function() {
      bridge = nacl(element, true);
    });

    it('defers execution if not yet loaded', function() {
      bridge = nacl(element);

      bridge.exec({});
      expect(element.postMessage).not.called;

      bridge.onLoad();
      expect(element.postMessage).calledOnce;
      expect(element.postMessage).calledWith({ id: 1, data: {} });
    });
    it('generates a unique id for the call if success callback is passed', function() {
      var success = sinon.spy();
      bridge.exec({}, success);
      expect(bridge.calls).to.have.key('1');
    });
    it('generates a correct message', function() {
      var success = sinon.spy();
      bridge.exec({}, success);
      expect(element.postMessage).calledOnce;
      expect(element.postMessage).calledWith({ id: 1, data: {} });
    });
    it('calls success with correct parameters', function() {
      var success = sinon.spy();
      bridge.exec({}, success);
      expect(bridge.calls).to.have.key('1');
      element.addEventListener.withArgs('message').yield({ data: { id: 1, type: 'success', data: 5 } });
      expect(success.withArgs(5)).calledOnce;
    });
    it('removes listener if success is called and no status listener is supplied', function() {
      var success = sinon.spy();
      bridge.exec({}, success);
      expect(bridge.calls).to.have.key('1');
      element.addEventListener.withArgs('message').yield({ data: { id: 1, type: 'success', data: 5 } });
      expect(bridge.calls).to.not.have.key('1');
    });
    it('calls fail with correct parameters', function() {
      var success = sinon.spy();
      var fail = sinon.spy();
      bridge.exec({}, success, fail);
      expect(bridge.calls).to.have.key('1');
      element.addEventListener.withArgs('message').yield({ data: { id: 1, type: 'error', data: 5 } });
      expect(success).not.called;
      expect(fail.withArgs(5)).calledOnce;
    });
    it('removes listener if error is called and no status listener is supplied', function() {
      var success = sinon.spy();
      bridge.exec({}, success);
      expect(bridge.calls).to.have.key('1');
      element.addEventListener.withArgs('message').yield({ data: { id: 1, type: 'error', data: 5 } });
      expect(bridge.calls).to.not.have.key('1');
    });
    it('calls status with correct parameters', function() {
      var success = sinon.spy();
      var fail = sinon.spy();
      var status = sinon.spy();
      bridge.exec({}, success, fail, status);
      expect(bridge.calls).to.have.key('1');
      element.addEventListener.withArgs('message').yield({ data: { id: 1, type: 'status', data: 5 } });
      expect(success).not.called;
      expect(fail).not.called;
      expect(status.withArgs(5)).calledOnce;
    });
    it('does not remove listener if status listener is supplied', function() {
      var success = sinon.spy();
      var status = sinon.spy();
      bridge.exec({}, success, null, status);
      expect(bridge.calls).to.have.key('1');
      element.addEventListener.withArgs('message').yield({ data: { id: 1, type: 'error', data: 5 } });
      expect(bridge.calls).to.have.key('1');
    });
    it('returns an object to cancel the operation', function() {
      var op = bridge.exec({});
      expect(op).to.be.an('object');
      expect(op.cancel).to.be.a('function');
    });
    it('removes the listeners for the call on cancel', function() {
      var success = sinon.spy();
      var op = bridge.exec({}, success);
      expect(bridge.calls).to.have.key('1');
      op.cancel();
      expect(bridge.calls).to.not.have.key('1');
    });
    it('posts a cancel message', function() {
      bridge.exec({}).cancel();
      expect(element.postMessage).calledWith({ cancel: 1 });
    });
  });

  describe('#addEventListener / #on', function() {
    beforeEach(function() {
      bridge = nacl(element);
    });
    it('adds a listener for the specified event', function() {
      var listener1 = sinon.spy();
      var listener2 = sinon.spy();

      bridge.addEventListener('foo', listener1);
      expect(bridge.listeners['foo']).to.eql([listener1]);

      bridge.on('foo', listener2);
      expect(bridge.listeners['foo']).to.eql([listener1, listener2]);
    });
    it('calls all handlers when an event is recieved from NaCl', function() {
      var listener = sinon.spy();
      bridge.addEventListener('foo', listener);
      element.addEventListener.withArgs('message').yield({ data: { event: 'foo', data: { bar: 1 }}});
      expect(listener).calledOnce;
      expect(listener).calledWith({ bar: 1 });
    });
    it('can handle String object values', function() {
      var listener = sinon.spy();
      bridge.addEventListener('foo', listener);
      element.addEventListener.withArgs('message').yield({ data: { event: new String('foo'), data: { bar: 1 }}});
      expect(listener).calledOnce;
      expect(listener).calledWith({ bar: 1 });
    });
  });

  describe('#removeEventListener / #off', function() {
    beforeEach(function() {
      bridge = nacl(element);
    });
    it('adds a listener for the specified event', function() {
      var listener1 = sinon.spy();
      var listener2 = sinon.spy();

      bridge.addEventListener('foo', listener1);
      bridge.on('foo', listener2);
      expect(bridge.listeners['foo']).to.eql([listener1, listener2]);

      bridge.removeEventListener('foo', listener1);
      expect(bridge.listeners['foo']).to.eql([listener2]);

      bridge.off('foo', listener2);
      expect(bridge.listeners['foo']).to.be.undefined;
    });
    it('calls all handlers when an event is recieved from NaCl', function() {
      var listener1 = sinon.spy();
      var listener2 = sinon.spy();
      bridge.addEventListener('foo', listener1);
      bridge.on('foo', listener2);

      element.addEventListener.withArgs('message').yield({ data: { event: 'foo', data: { bar: 1 }}});

      expect(listener1).calledOnce;
      expect(listener1).calledWith({ bar: 1 });
      expect(listener2).calledOnce;
      expect(listener2).calledWith({ bar: 1 });
    });
  });

  describe('#removeAllEventListeners', function() {
    beforeEach(function() {
      bridge = nacl(element);
    });
    it('removes all listeners for a specific type', function() {
      bridge.on('foo', function() {});
      bridge.on('bar', function() {});
      bridge.removeAllEventListeners('foo');
      expect(bridge.listeners['foo']).to.be.undefined;
      expect(bridge.listeners['bar']).to.be.instanceof(Array);
    });
    it('removes all listeners for all types', function() {
      bridge.on('foo', function() {});
      bridge.on('bar', function() {});
      bridge.removeAllEventListeners();
      expect(bridge.listeners).to.be.eql({});
    });
  });
});