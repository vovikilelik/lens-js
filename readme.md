# Wiki
* [Lens-Js](http://git.vovikilelik.com/Clu/lens-js/wiki)

# Lens JS

**Линзы** - это концепция функционального состояния приложения, включающая соответствующий шаблон проектирования и реализацию. Главное преимущество такой концепции - **полиморфизм** компонентной модели, даже на уровне основных форм приложения.

> Стоит отметить, что линзы не являются детерминированной библиотекой,
> такой как redux, MobX и т. п. Так что, в данном репозитории находится
> одна из возможных реализаций, обладающих своими плюсами и минусами.
> Ну, больше всего плюсами, конечно. Обязательно попробуйте и другие...

# Установка

 - **Git**
  `git clone http://git.vovikilelik.com/Clu/lens-js.git`
  
- **Npm**
`npm i @vovikilelik/lens-js`

# Подключение
- Подключите скрипт
```html
<script type="module" src="lens-js.js"></script>

// or

<script type="module">
	import { Lens } from './lens-js.js';

	/* your code here */
</script>
```

- Всё! Можно пользоваться =)
```js

const store = {lens: {}}; // your store

const lens = new Lens(
	() => store.lens, // getter
	(value, effect) => { store.lens = value } // setter
);
```
# Использование
Линза представляет собой направленный граф (слева-направо), вершины которого предоставляют доступ к соответствующим данным. Основная роль уделяется структуре самих узлов. Это позволяет линзе самой решать каким образом данные нужно слить воедино.

Каждый узел (вершина графа) линзы - главный. Он не знает о том, что было слева от него, но при этом может управлять данными справа. Это позволяет формировать каждую форму так, как если бы она была отдельным приложением. При этом, все формы остаются в единой системе взаимодействия.

Проще говоря, **линза - это одна из моделей [машины Тьюринга](https://ru.wikipedia.org/wiki/%D0%9C%D0%B0%D1%88%D0%B8%D0%BD%D0%B0_%D0%A2%D1%8C%D1%8E%D1%80%D0%B8%D0%BD%D0%B3%D0%B0)** с ограничениями, связанными с областью их применения.

### Путешествие по графу
Представим, что у нас есть созданная линза `rootLens` и некоторые данные в `store.lens`
```js
const store = {lens: {
	basket: {}
}};

const rootLens = new Lens( /* see previous tips */ );
```
Узел `rootLens` будет указывать на `store.lens`. Чтобы управлять данными можно воспользоваться методами узла: `.get()` или `.set(value)`
```js
const result = rootLens.get(); // {basket: {}}

rootLens.set({ basket:{ apple: {} } });
const result = rootLens.get(); // { basket: { apple: {} } }
```
На самом деле нет необходимости каждый раз передавать полный объект. Можно продвинуться чуть глубже по графу с помощью функции `.go(nodeName)`Таким образом управлять данными будет проще:
```js
const basketLens = rootLens.go('basket');
const result = basketLens.get(); // { apple: {} }

// and more...
const appleLens = basketLens.go('apple');
appleLens.set({color: 'green'});

/* root */
const result = rootLens.get(); // { basket: { apple: { color: 'green' } } }
```
Линза будет запоминать, однажды взятую, структуру.
```js
const a = rootLens.go('basket');
const b = rootLens.go('basket');

a === b // true
```

Линза не опирается на сами данные, а только воссоздаёт каркас, по которому данные комбинируются. Мы можем сначала обратиться к узлу, данные которого ещё не существуют, и в момент вызова `.set(value)`структура данных будет воссоздана:
```js
/* before
{
    basket: { apple: { color: 'green' } }
}
*/

rootLens.go('undefinedData').set('really?');
const result = rootLens.get();

/* after
{
	
    basket: { apple: { color: 'green' } },
    undefinedData: 'really?'
}
*/
```
Про массивы тоже не забыли...
```js
const arrayLens = rootLens.go('anArray');

arrayLens.go(0).set('X');
arrayLens.go(1).set('Y');
arrayLens.go(2).set('stop here!');
```
К сожалению, линза не отличает типы объектов, с которыми она работает. Потому работа с массивами перекладывается на программиста. Однако есть утилита `getArray(lens)`, несколько упрощающая работу с массивами. Вот несколько примеров:
```js
const arrayLens = rootLens.go('anArray');

// insert item
arrayLens.set([...arrayLens.get(), 'element']);

// remove item
arrayLens.set(arrayLens.get().filter(e => e !== 'element'));

// getArray() util
const lensArray = getArray(arrayLens); // return array of Lens
lensArray.map(lens => { console.log( lens.get() ) });
```

### А что с компонентами?
Каждый узел линзы является источником данных. Передавая их, как параметр конструктора некого компонента, можно и передать данные из состояния приложения.
```js
function Fruit(lens) {
	this.properties = lens.get();
}

function Basket(lens) {
	this.fruit = new Fruit(lens.go('apple'));
}

function App(lens) {
	this.basket = new Basket(lens.go('basket'));
}
```
> Этот примеры, безусловно, выглядят весьма примитивно. Однко это
> необходимо для понимания основных возможностей.

Компоненты `App` и `Basket` не обращаются к данным состояния напрямую. Также, эти компоненты не являются строго привязанными к структуре состояния приложения. И действительно, линза только определяет интерфейс самого узла, но не путь, в котором он находится. Например, мы можем создать ещё несколько фруктов в корзине:
```js
function Basket(lens) {
	this.apple = new Fruit(lens.go('apple'));
	this.orange = new Fruit(lens.go('orange'));
	this.watermelon = new Fruit(lens.go('watermelon'));
}

function App(lens) {
	this.basket = new Basket(lens.go('basket'));
	this.oneMoreBasket = new Basket(lens.go('table').go('basket'));
}
```
Как можно видеть, компоненты `Basket` и `Fruit` являясь привязанными к состоянию приложения могут использоваться также свободно, как если бы они были обычными примитивными компонентами.

### Реакция на изменение состояния приложения
Иногда может потребоваться возможность реагировать на изменение данных приложения. Для этого существует событийных механизм, встроенный в узлы линзы. Это методы `.attach(callback)` и `detach(callback)`. Например, компонент `Fruit` должен реагировать на изменение своего состояния:
```js
function Fruit(lens) {
	/* init */
	this.properties = lens.get();

	/* on data changed */
	lens.attach((current, diffs) => {
		this.properties = current.value;
	})
}
```
У событийной модели есть две особенности:

- Линза будет вызывать все события по пути, **от корня до места изменения**
```js
// store = { lens: { basket: { apple: { color: 'red' } } } }
rootLens.go('basket').go('apple').set({color: 'green'});
```
```
 catch       catch       catch       catch
   |           |           |           |
(root) --> (basket) --> (apple) --> (color)
```
> Такое поведение
> нужно, если есть необходимость перехватывать изменения в
> компонентах-родителях. Для того, чтобы отловить изменение только на
> текущем узле, следует проверить свойство `current.path`, которое
> должно либо отсутствовать, либо не содержать никаких элементов. Также,
> можно воспользоваться утилитой `getStrictCallback(callback)`, которая
> сделает всё за вас.

```js
const callback = getStrictCallback((current, diffs) => { /* ... */ });
lens.attach(callback);

   0           0           0         catch
   |           |           |           |
(root) --> (basket) --> (apple) --> (color)
```

```js
const deep = 1;
const callback = getConsistsCallback((current, diffs) => { /* ... */ }, deep /* 1 by default*/);
lens.attach(callback);

   0           0         catch         0
   |           |           |           |
(root) --> (basket) --> (apple) --> (color)
                           |____deep___|
```

```js
const deep = 2;
const callback = getConsistsCallback((current, diffs) => { /* ... */ }, deep);
lens.attach(callback);

   0         catch         0           0
   |           |           |           |
(root) --> (basket) --> (apple) --> (color)
              |__________deep__________|
```

- Путь до изменившегося узла расчитывается от существующих данных. Например, следующий пример **не вызовет** событие:
```js
// store = { lens: {} }

// get lens and attach event
const appleLens = rootLens.go('basket').go('apple');
appleLens.attach(console.log);

// change data
appleLens.set({ color: 'red' });
```
Это происходит потому, что на самом деле изменился только корень линзы.

### Композитное состояние
Структура линз поддерживает возможность монтирования любых своих производных. Это полезно, если нужно объединить в одну структуру несколько компонентов их разных архитектур, в т. ч. и на линзах. Для этого нужно вызвать функцию `.go()`, со вторым аргументом (агрегатором) `.go(name, factory)`:
```js
class MyLens extends Lens {
  /* ... */
}

const factory = (parentFactory) => (key, parent) => {
	const lens = parentFactory(key, parent);

	return new MyLens(
		() => lens.get(),
		(value, effect) => lens.set(value, effect),
		lens
	);
}

const myLens = rootLens.go('myLens', factory);
```
> **Будте внимательны!** Линза запомнит только последний переданные агрегатор.
> Это значит, что ранее взятые узлы будут размонтированы и забыты линзой. Иногда это полезно. Хотя...

Такой способ позволяет создавать функциональное состояние, объединяющее несколько подходов к его организации. Кстати, для удобства есть утилита `getMapper`, позволяющая создавать маппер на чтение и запись. Это полезно, если нужно преобразовать данные перед установкой в основное состояние.
```js
const colorMapper = getMapper(
	v => `#${v.toString(16)}`, // when will call .get()
	(v, prev) => parseInt(v.substring(1), 16); // when will call .set(value)
);

const colorLens = rootLens.go('color', colorMapper);
colorLens.set('#FFFFFF');

const appState = rootLens.get(); // { color: 16777215 }
const color = colorLens.get(); // '#FFFFFF'
```

# Lens VS Redux, MobX
Что лучше? Понятие не имею. На самом деле, многое зависит от постановки задачи, времени и совместимости. Если Вы уже используете проект на `redux`, то лучше продолжить его использовать. В остальных случаях - смело пробуйте `Lens`.

Удачки!