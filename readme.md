# Wiki
* [На русском](http://git.vovikilelik.com/Clu/lens-js/wiki)
* [English](http://git.vovikilelik.com/Clu/lens-js/wiki/Home-en)

There are many magor changes bettween 1.5 and 1.6, see [changelog](http://git.vovikilelik.com/Clu/lens-js/wiki/Changelog-en)

# Instalation

 - **Git**
  `git clone http://git.vovikilelik.com/Clu/lens-js.git`
  
- **Npm**
`npm i @vovikilelik/lens-js`

## Using with HTML
```html
<script type="module" src="lens-js.js"></script>

// or

<script type="module">
    import { Lens } from './lens-js.js';

    /* your code here */
</script>
```

## Using with NPM
```js
import { Lens } from '@vovikilelik/lens-js';
```

# Introduction
`LensJs` implement the concept of a functional programming, where the data structure has the form of a directed graph (from the root to the leaves).
* Creation root store
```js
export const lens = LensUtils.createLens({ /* default data */ });
```
* Getting deep structure
```js
const deep = lens.go('deep');
const deeper = deep.go('deeper');
```
* Singleton pattern able to use for each other node
```js
import {lens} from 'store';
export default lens.go('deep');
```
* Catching changes
```js
const callback = ({ current, diffs }) => console.log(current.value);
lens.attach(callback);
lens.set('Hello!') // console: Hello!
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
```

For more information look [wiki](http://git.vovikilelik.com/Clu/lens-js/wiki/Home-en)

# Example

`LensJs` implement the concept of a functional programming, where the data structure has the form of a directed graph (from the root to the leaves).

Each node of the graph of `LensJs` does not contain data, but only provides an interface and performs addressing in the graph. This also means that the structure of the graph depends on the structure of the data itself.

**Example:** `store.js`
```js
/* Store */
const defaultData = {
    form: { message: 'Hello World!' }
};

/* Constructor of ROOT lens */
export const lens = LensUtils.createLens(defaultData);
```
Now you can operate with `lensJs`.
* For accsessing to root lens import `lensJs` as an singleton from your `store.js`
* For getting nested fields from object you have to call method `go(fieldName)` from parent node, and if you need to more deep, you could call one again and again.

```js
import { lens } from './store.js';

/* Gettin field by path "lens.form.message" */
const message = lens.go('form').go('message');

/* Getting value from field (by path "lens.form.message") */
console.log( message.get() );
// --> Hello World!

/* Setting new value */
message.set('Hi World!');

console.log( message.get() );
// --> Hi World!
```

You can create `Lens-components`, where as the value whould be givivng lens node.
```js
const messageLens = lens.go('form').go('message');
const LensFoo = new LensFoo(messageLens);
```

Those components stay universal, look:
```js
const messageLens = lens.go('anotheForm').go('anotherMessage');
const LensFoo = new LensFoo(messageLens);
```

`lensJs` involves event model, whith provide eaction on data changing.
```js
const onChange = e => console.log('Changed!');
lens.attach(onChange);
```

It able to use into lens-components.
```js
class LensFoo {
  constructor(lens) {
    this._callback = this.onChange.bind(this);
    lens.attach(this._callback);
  }

  onChange() {
    this.render();
  }

  render() { /* doSmth */ }
}
```
Every node of `lensJs` is **singleton**
```js
const one = lens.go('apple');
const two = lens.go('apple');

one === two // true
```
It means that you can export any node like this:

```js
import { lens } from './store.js';

export const basket = lens.go('basket');
```

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

## More scalability
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

const controller = lens.go('page', MyController);
controller.id = 12345;
```

---
[Lens-Js Wiki](http://git.vovikilelik.com/Clu/lens-js/wiki)
