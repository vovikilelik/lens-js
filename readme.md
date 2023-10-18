
# Links
* [Docs](https://wiki.dev-store.ru/lens-js/)
* [Changelog](https://git.dev-store.xyz/Clu/lens-js/wiki/Changelog-en)

# React JS implementation
See ReactJs [implementation](https://www.npmjs.com/package/@vovikilelik/react-lens)
```ts
const store = createStore(0);

const Counter: react.FC = () => {
	const [ value, setValue ] = useLens(store);
	return <button onClick={() => setValue(value + 1)}>{value}<button>
}
```

# Instalation

 - **Git**
  `git clone http://git.dev-store.xyz/Clu/lens-js.git`
  
- **Npm**
`npm i @vovikilelik/lens-js`

# Imports

### Web Components
```html
<script type="module">
    import { createStore } from './path_to_module/index.js';

    const store = createStore(0);
    ...
</script>
```

### Webpack
```js
import { createStore } from '@vovikilelik/lens-js';
const store = createStore(0);
...
```

# Introduction
`LensJs` implement the concept of a functional programming, where the data structure has the form of a directed graph (from the root to the leaves). Each node is an object model that is able to extend the basic prototype with methods and fields. LensJs is base technology for implimentation to any frameworks like ReactJs, Angular, Vue e.t.c.

## Philosofy

### Simple to supporting
We believe that the structure and organization of the application state should be clear. You don't need to know the entire organization of the state to understand how it functions.

### Simple to implemeting
You don't need to write a lot of code to create a simple object. It doesn't take much to figure out how to write a simple object.

### Extendable
LensJs provides both ways to extends like OOP and functional approach. We also take care of the possibility of both scaling.

### Performance
We think performance is important too (but that's not for sure).

### Compatibility
We believe that `LensJs` can be used in conjunction with other state managers.

## Main Features
* Asynchronous change assambly
* Catching changies
* Data transform on demand
* Both scalability (out/up)
* Object-oriented and functional approach
* Encapsulation

# Using

## Creation and extends

### Simple Store
```js
export const store = createStore({ /* default data */ })
  .extends({ message: 'Hello' })
  .extends(node => {
    sayHello: (name) => alert(node.hello + ' ' + name)
  });
```

### Nested Store
```js
export const message = createStore('Hello World!');

export const store = createStore({})
  .extends({ message });

console.log(store.message.get());  // Hello World!
```

### OOP Way
```js
class HelloStore extends Store {
  sayHello(name) => this.go('message').get() + ' ' + name;
}

export const store = createStore({ message: 'Hello' }, HelloStore);
store.sayHello('Tom');  // Hello Tom
```

### Both Ways
```js
class Car extends Store {
  move() {}
}

export const car = createStore({}, Car);
export const highway = createStore({})
  .extends({ car });

highway.car.move();
```

## Data Operations

### Raw getting values
The `go()` method is a universal way of passing nested nodes. The `get()` method returns the value stored in the state. Each node will have its own value. Sometimes it doesn't make sense to call `get()` if the node is converted to a string.

```js
const store = createStore({ one: { two: 'Hi!' } });

const one = store.go('one');  // Like store.one
const two = one.go('two');  // Like one.two

two.get()  // Hi!
```

### Field Access Style
This method is only available when using the `extends` method or the OOP approach. There is a universal way to get nested nodes - this is the `go()` method.

```js
const store = createStore({}).extends({ field: 'Hello!' });

console.log(store.field.get())  // Hello!
console.log(store.go('field').get())  // Hello!
```

#### OOP Style
```js
class MyStore extends Store {
  get field() {
    this.go('field');
  }
}

const store = createStore({ field: 'Hello!' }, MyStore);

console.log(store.field.get())  // Hello!
console.log(store.go('field').get())  // Hello!
```

### Change values
The `set()` method is a universal way to set a new value to a state. To set a new value to a nested node, you first need to get it using the `go()` method
```js
const store = createStore({ fruit: { name: 'Apple' } });

const name = store.go('fruit').go('name');  // access to value of fruit
name.set('Orange');  // { fruit: { name: 'Orange' } }
```

### Arrays And Generator
Each LensJs node is a generator that will allow you to go through existing fields regardless of the data type.
```js
const store = createStore({ one: '1', two: '2' });

for (const node of store)
  console.log(node.get());

// 1
// 2
```

Also, there is a `list()` method that immediately returns an array of nodes.

```js
const store = createStore({ one: '1', two: '2' });

console.log(store.list().map(node => node.get()));  // [ '1', '2' ]
```

## Catching changes

Change events can be caught in three stages: on the way to the changed node, in the node itself and in the subtree, after the changed node.

There are two approaches to creating change handlers: through the `on()` or `subscribe()` method. The `on() ` method allows you to set a trigger that will trigger at the desired stage or prevent unnecessary triggers.
```js
const store = createStore({ input: '' });

const input = store.go('input');
input.on(Triggers.object, () => console.log('Input changed'));

input.set('Hello!')  // Input changed
```
You can miss the trigger indication. Then a soft change tracking strategy will be applied, which is suitable for most cases.

```js
input.on(() => console.log('Input changed'));
```

You can use multiple `on()` methods in a row or assign more than one handler to one trigger.

```js
const store = createStore({})
  .on(Triggers.strict, () => { ... }, () => { ... })
  .on(Triggers.path, () => { ... });
```
The subscribe method installs only one listener and offers a PubSub pattern

```js
const store = createStore({});

const unsubscriber = store.subscribe(() => { ... });
```

The subscribe method will listen to all changes in the lensJs sub-branch of the graph and call a listener for each such case. To filter changes, you can use the `Callbacks` utility.

```js
const unsubscriber = store.subscribe(Callbacks.object(() => { ... }));
```

You can use the createCallback utility to combine a listener with a trigger. The custom trigger, by the way, can be implemented by yourself.

```js
const unsubscriber = store.subscribe(createCallback(Trigger.object, () => { ... }));
```

## Transform Data
You can use the `transform()` method to bidirectionally transform data on the fly.

For example, we need the color value to be stored as a number in the state, and output as HEX.

```js
const store = createStore({ color: 0 });

const asHex = lens.go('color')
  .transform(
    v => `#${v.toString(16)}`,
    v => parseInt(v.substring(1), 16);
  );

asHex.set('#aabbcc');

console.log(lens.get());  // { color: 11189196 } 
```

There is a lower-level `chain` method. You can use it to create more flexible transformations. For example, unidirectional read output will look like this:

```js
const store = createStore('Tom');

const transformedStore = store.chain(current => {
  return new Store(() => 'Hello ' + current, current.setter, current);
});

transformedStore.set('Mike');

transformedStore.get();  // Hello Mike
store.get();  // Mike
```

Also, there is a utility `transform()` that somewhat simplifies this process.

```js
const transformedStore = store.chain(transform(v => 'Hello ' + v, v => v));
```

## Singleton Pattern And Atomic State

Each LensJs node is a `singleton`.
```js
store.go('singleton') === store.go('singleton');  // true
```

You can export every node as const.
```js
const store = createStore({ form: {}, auth: {} });

export const form = store.go('form');
export const auth = store.go('auth');
```

In fact, you can not keep one state for the entire application, but split it into separate independent models. This improves scalability and performance. It also simplifies testing.

```js
export const form = createStore({});
export const auth = createStore({});
```

## Utils

There are several utilities in the LensJs package that simplify development:

- `Callbacks` - Filters as cover for callback
- `Triggers` - Filters as functions for callback
- `Debounce` - Debounce and throttling utility
- `createCallback` - Create cover filter for callback
- `createStore` - Create method for store (instead OOP style)

### Examples

#### Debounce output
```js
const debounce = new Debounce(1000);

debounce.run(() => console.log('1'));
debounce.run(() => console.log('2'));
debounce.run(() => console.log('3'));

// Output: '3'
```

Every `run()` you can set enother timeout.
```js
debounce.run(() => { ... }, 1234);
```

As finish you can cancel process.

```ts
debounce.run(() => console.log('Hi!'), 1000);
debounce.cancel();

// No output
```

#### Debounce and acync callbacks
You can use the Callbacks utility to create asynchronous and deferred state change handlers.

```ts
const state = createState({});

const unsubscriber = state.subscribe(Callbacks.debounce(() => { ... }, 1000));
```

For example, you need to process only the last handler of the Promise type with wait timeout:

```ts
const state = createState('');

const asyncCallback = Callbacks.acync(
  (event, node) => fetch('https://example.org/' + node),
  response => console.log(response),
  50
);

const unsubscriber = state.subscribe(asyncCallback);

state.set('one');
state.set('two');

// Output from https://example.org/two response
```

And yes, so you can update your state on demand.

```ts
const state = createState({ id: '', data: [] });

const asyncCallback = Callbacks.async(
  (event, node) => fetch('https://example.org/' + node),
  ({ records }) => state.go('data').set(records)
);

state.go('id').on(asyncCallback);
state.go('id').set('1');
```
