describe('nacl-bridge', function() {

  it('works', function() {
    var spy = sinon.spy();
    spy();
    expect(spy).calledOnce;
  });

});