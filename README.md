nacl-bridge
===========

This creates a bridge between nacl and javascript where the raw message passing
is abstracted as function calls with callbacks and event listeners for named events.

###Install with Bower

    bower install nacl-bridge

##JS side
In javascript, create a bridge by calling

```javascript
var element = document.getElementById('myNaCl');
var bridge = nacl(element);
```

The bridge will wait for a 'load' event from the element. If the bridge is created
after the load event is passed, use the loaded flag when creating the bridge

```javascript
var bridge = nacl(element, true);
```

###exec
To call a method in NaCl, use exec. This function takes four optional parameters

```javascript
bridge.exec([data], [success], [fail], [status]);
```

Example:

```javascript
bridge.exec({ method: 'calculateStuff', data: [1, 2, 3] }, function(result) {
  console.log(result);
});
```

The status callback is used for progress indication etc.

####cancel
If you want to cancel a call, use the cancel function on the object passed back when
calling exec.

```javascript
var op = bridge.exec({ method: 'doStuff' }, function(result) {
  console.log(result);
});
op.cancel();
```

If the bridge is waiting for the NaCl component to load, cancelling the call will
result in no call being passed to NaCl. If the component is loaded and the call is
allready made, a cancel call will be made to the component. Cancel also means that
no further success, fail or status callbacks will be recieved.

###addEventListener / on
If you want to subscribe to an event, simply call

```javascript
var listener = function(data) {};
bridge.addEventListener('event-name', listener);
// or
bridge.on('event-name', listener);
```

###removeEventListener / off
To remove an event listener, call

```javascript
bridge.removeEventListener('event-name', listener);
// or
bridge.off('event-name', listener);
```

###removeAllEventListeners
To remove all event listeners of a certain type, call

```javascript
bridge.removeEventAllEventListeners('event-name');
```

...and to remove all listeners regardless, ommit the type:

```javascript
bridge.removeEventAllEventListeners();
```

##NaCl side
NaCl:s pepper API only supports to methods on the HTML element:

* addEventListener
* postMessage.

Also, it only emits two types of events:
* 'load'
* 'message'

In order for the bridge to be able to abstract the messaging, the data passed has
to conform to this format:

###HandleMessage
The message passed to HandleMessage will be a pp::VarDictionary

```c++
virtual void HandleMessage(const pp::Var& message) {
  if(message.is_dictionary()) {
    pp::VarDictionary dict = pp::VarDictionary(message);

    if(dict.HasKey("id")) {
      // this is a call that supports callbacks
      int32_t id = message.Get("id").AsInt();
      pp:VarDictionary data = pp::VarDictionary(dict.Get("data"));
      // parse the data dictionary and do awesome stuff
    } else if(dict.HasKey("cancel")) {
      // this is a cancellation request
      int32_t cancel_id = message.Get("cancel").AsInt();
    }
  }
}
```

The data can be in any form you want but recommended is to use a VarDictionary
specifying a method and data to pass to the method.

###PostMessage
####Callback
In order for the bridge to know which message is associated with which call, a callback
message must be in the form:

```c++
const char* success = "success";
const char* error = "error";
const char* status = "status";

pp:VarDictionary message = pp::VarDictionary();
message.Set(pp::Var("id"), pp:Var(2));
message.Set(pp::Var("type"), pp:Var(success));
pp:VarDictionary data = pp:VarDictionary();
data.Set(pp::Var("foo"), pp:Var(true));
data.Set(pp::Var("bar"), pp:Var(2));
message.Set(pp::Var("data"), data);
PostMessage(message);
```

This example will call the success callback passed to bridge.exec with one parameter
with the value:

```javascript
{
  foo: true,
  bar: 2
}
```

Callback messages can have three values for "type":

* "success"
* "error"
* "status"

The "success" and "error" callbacks can be called 0-1 times. The "status" callback can
be called 0-n times.

####Events
To get data passed into event listeners, just pass the message in the following format:

```c++
pp:VarDictionary message = pp::VarDictionary();
message.Set(pp::Var("event"), pp:Var("foo"));
pp:VarDictionary data = pp:VarDictionary();
data.Set(pp::Var("bar"), pp:Var(2));
message.Set(pp::Var("data"), data);
PostMessage(message);
```

This will call all javascript event listeners for the event "foo" with the event:

```JavaScript
{
  type: 'foo',
  target: bridge,
  srcElement: embedElement,
  bar: 2,
  timestamp: new Date().getTime(),
  bubbles: true,
  cancelBubble: false,
  cancelable: true,
  defaultPrevented: false
}
```


