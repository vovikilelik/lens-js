# Wiki
* [На русском](http://git.vovikilelik.com/Clu/lens-js/wiki)
* [English](http://git.vovikilelik.com/Clu/lens-js/wiki/Home-en)

There are many major changes, see [changelog](http://git.vovikilelik.com/Clu/lens-js/wiki/Changelog-en)

# Instalation

 - **Git**
  `git clone http://git.vovikilelik.com/Clu/lens-js.git`
  
- **Npm**
`npm i @vovikilelik/lens-js`

## Imports

### Web Components
```html
<script type="module" src="lens-js.js"></script>

// or

<script type="module">
    import { Lens } from './lens-js.js';

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

* Creation root store
```js
export const lens = LensUtils.createLens({ /* default data */ });
```
* Getting deep structure
```js
const deep = lens.go('deep');
const deeper = deep.go('deeper');

// Like "lens.deep.deeper"
```

* Reading and writing
```js
const catName = lens.go('cat').go('name');

catName.set('Tom'); // Writing by "lens.cat.name"
const value = catName.get(); // Reading

// Like:
// lens.cat.name = 'Tom';
// const value = lens.cat.name;
```

* Getting full state (if needed)
```js
lens.go('basket').go('apples').go('count').set(3);
const state = lens.get();

// "state" is { basket: { apples: { count: 3 } } }
```

* Catching changes
```js
const callback = ({ current }) => console.log(current.value);
lens.attach(callback);

lens.set('Hello!') // console: Hello!
```

* Singleton pattern able to use for each other node
```js
lens.go('singleton') === lens.go('singleton'); // true
```

* Export every node as const
```js
export const appState = lens.go('app');
export const authState = lens.go('auth');
```

* Extending
```js
class MyLens extends Lens {
  doRequest(addr) {
    myFetch(addr).then(response => this.set(response));
  }
}

const foo = lens.go('foo', MyLens);
foo.doRequest('https://');
```
* Live-transforming
```js
import {transform} from 'lens-utils';

const toHex = transform(
  v => `#${v.toString(16)}`,
  v => parseInt(v.substring(1), 16);
);

const hex = lens.go('color').chain(toHex);
hex.set('#aabbcc');

console.log(lens.get()) // { color: 11189196 } 
```

For more information look [wiki](http://git.vovikilelik.com/Clu/lens-js/wiki/Home-en)


# Comparation with Redux and MobX/MST
> Not contrast but nearly

## No reducers
`LensJs` does not deed in `redusers` or same because it merge data automatically

### `Redux`:
```js
enum ActionType {
  hello;
}

const getHelloAction = (value) => ({
  type: ActionType.hello,
  value
});

const reducer = (state, {type, value}) {
  switch(type) {
    case ActionType.hello:
      return { world: value };

      default: return state;
  }
}

...
dispatch(getHelloAction('Hello!'));
```

### `LensJs`:
```js
lens.go('world').set('Hello!');
```

## Better encapsulation
Every lens node is root of own subtree. It give passibility to make components whitch is not assign with main form.

### `Redux`:
```js
const Cat = ({ cat }) => <div>{cat.ribbon.color}</div>;
const mapStateToProps = (state, ownProps) =>
  ({cat: state.cats[ownProps.name]});
export default connect(Cat, mapStateToProps);
```

### `LensJs`:
```js
export const Cat = ({ lens }) => {
  const [ cat ] = useLens(lens);
  return <div>{cat.ribbon.color}</div>;
}
```

## No overcode
It means that `lensJs` is easier than others (in default)

### `MobX/MST`:
```js
/* Ribbon store */
export const Ribbon = type
  .model("Ribbon", {
    color: type.string
  })
  .actions(self => ({
    setColor(value) {
      self.color = value;
    },
  }));
  
/* Cat store */
export const Cat = type
  .model("Cat", {
    ribbon: type.reference(Ribbon)
  });
```

### `LensJs`:
```js
const cat = cats.go('murzik');
const ribbon = cat.go('ribbon');
```

You can make controller like ModX

```js
class MyController extends Lens {
    get id() {
        return this.go('id').get();
    }

    set id(value) {
        this.go('id').set(value, () => doRequest());
    }
}

// Example
const controller = lens.go('page', MyController);
controller.id = 12345;
```

---
[Lens-Js Wiki](http://git.vovikilelik.com/Clu/lens-js/wiki)
