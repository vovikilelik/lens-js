
# Links
* [Docs](http://wiki.dev-store.ru/lens-js/)
* [Changelog](http://git.dev-store.xyz/Clu/lens-js/wiki/Changelog-en)

See ReactJs [implementation](https://www.npmjs.com/package/@vovikilelik/react-lens)

# Instalation

 - **Git**
  `git clone http://git.dev-store.xyz/Clu/lens-js.git`
  
- **Npm**
`npm i @vovikilelik/lens-js`

## Imports

### Web Components
```html
<script type="module" src="lens-js.js"></script>

// or

<script type="module">
    import { Lens } from './path_to_module/index.js';

    /* your code here */
</script>
```

### Webpack
```js
import { Lens } from '@vovikilelik/lens-js';
```

# Introduction
`LensJs` implement the concept of a functional programming, where the data structure has the form of a directed graph (from the root to the leaves).

## Philosofy

### Simple to supporting
We believe that the structure and organization of the application state should be clear. You don't need to know the entire organization of the state to understand how it functions.

### Simple to implemeting
You don't need to write a lot of code to create a simple object. It doesn't take much to figure out how to write a simple object.

### Performance
We think performance is important too (but that's not for sure).

### Compatibility
We believe that `LensJs` can be used in conjunction with other state managers.

## Main Features
* Asynchronous change detection
* State batch update
* Full control of state changies
* Data transform on demand
* Both scalability (out/up)
* Object-oriented and functional programming
* Encapsulation

## Using

### Creation root store
```js
export const store = createLens({ /* default data */ });
```

### Getting values
```js
const store = createLens({ one: { two: 'Hi!' } });

const one = store.go('one');  // Like store.one
const two = one.go('two');  // Like one.two

two.get()  // Hi!
```

### Writing values
```js
const store = createLens({ cat: { name: 'Bob' } });

const name = store.go('cat').go('name');
name.set('Tom');  // Like lens.cat.name = 'Tom'
```

### Prototyping
## OOP Like
```js
class MyLens extends Lens {
  fetch() { ... }
}

const store = createLens({ ... }, MyLens);
const state.fetch();
```

* Prototyping while `go()` method:
```js
const store = createLens({ myLens: {} });

const myLens = store.go('myLens', MyLens);
myLens.fetch();
```

## Functional Like

With autocreation neasted nodes:
```js
const store = createLens({})
	.extends({ foo: 'Hello!' });

store.foo.get();  // Hello!
```

With user configuration
```js
const store = createLens({ moo: 'Hola!' })
	.extends(node => { get moo: () => node.go('moo') });

store.moo.get();  // Hola!
```

Both variants:
```js
const store = createLens({})
	.extends({ message: 'Hello' })
	.extends(node => {
		sayHello: name => `${node.go('message').get() } ${name}!`
	});

store.sayHello('Tom');  // Hello Tom!
```

### Catching changes
```js
const store = createLens({ input: '' });

const input = store.go('input');
input.attach(({ current }) => console.log(current.value));

input.set('Hello!')  // console: Hello!
```

### Singleton pattern able to use for each other node
```js
lens.go('singleton') === lens.go('singleton');  // true
```

### Export every node as const
```js
const store = createLens({ app: {}, auth: {} });

export const app = store.go('app');
export const auth = store.go('auth');
```

### Live-transforming
For example, writing color as Web-string, but saves as number;
```js
import { transform } from '@vovikilelik/lens-js';

const toHex = transform(
  v => `#${v.toString(16)}`,
  v => parseInt(v.substring(1), 16);
);

const hex = lens.go('color').transform(toHex);
hex.set('#aabbcc');

console.log(lens.get()) // { color: 11189196 } 
```
