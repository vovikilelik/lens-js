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
**Линзы** реализуют концепцию функционального состояния, где структура данных имеет вид направленного графа (от корня к листьям), а управление данными осуществляется за счёт методов, представляемых каждым из узлов. Таким образом, достигается **объектно-ориентированный подход** при управлении состоянием.

Концепция линзы основана на гипотезе, что структура данных тесно связанна с их смыслом, т.е данные о некой сущности, с высокой вероятностью, будут записаны в ассоциированный объект. Это даёт право полагать, что то, каким образом выстраивается структура данных при их чтении, то таким же образом нужно собирать структуру и при записи.

Например, в `Redux` способ чтения и записи определяется дополнительными функциями, т.к. `Redux` не знает о структуре данных. Однако, в большинстве случаев, данные будут записаны в ту же ветвь из которой были прочитаны. Линза использует эту информацию для автоматизации процесса склейки данных. По этому, линза не нуждется в дополнительных методах.

##### Пример кода на `Redux`:
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

##### Тот же код на `Lens`:
```js
lens.go('world').set('Hello!');
```
> Информация о структуре была запомнена ещё во время взятия данных. По этому, нет необходимости дублировать это в `reducer`.

Линза не хранит данные, а является только интерфейсом для доступа к ним. Также, все вложенные узлы являются производными своего родителя. При этом, в стандартной реализации, обратное взаимодействие невозможно, т. е. из родительского узла можно получить дочерний узел, но из дочернего нельзя вернуться к родителю.

```js
/* Создание производного дочернего узла с адресом, указывающим на поле message */
const childLens = lens.go('message');

/* Получение значения */
console.log( childLens.get() );
// --> Hello World!

/* Запись нового значения */
childLens.set('Hi World!');

console.log( childLens.get() );
// --> Hi World!
```

Это очень полезно потому, что теперь каждый узел линзы считает себя главным, т. е. структура данных до любого, отдельно взятого, узла уже не имеет значения.
```js
const apple = new Fruit(lens.go('basket').go('apple'));
const orange = new Fruit(lens.go('table').go('orange'));
const cherry = new Fruit(lens.go('tree').go('cherry'));

lens.go('fridge').set([apple, orange, cherry]);
```
Это даёт возможность разрабатывать универсальные компоненты, где в качестве значения будет передаваться только интерфейс узла, взятый с нужным адресом в данных. Это эквивалентно работе типовых компонентов. Компоненты, разработанные на одном проекте, могут быть использованы на другом без необходимости что-то переделывать.

Кроме того, нет необходимости работать только с корневым узлом. Каждый узел в линзе, вполне, самостоятельный синглтон.
```js
/* Отдельные узлы могут передаваться, как аргументы */
function getApple(container) {
  return container.go('apple');
}

/* Узлы можно экспортировать */
export const apple = getApple(lens.go('basket'));
```

Помимо методов управления и перехода по данным, линза имеет возможность реагировать на изменения в своей структуре. Это реализуется при помощи стандартной событийной модели, доступной из каждого узла в отдельности. Это даёт некоторое приемущество перед использованием типовых компонентов, поскольку линза уже предоставляет методы работы по отслеживанию изменений в данных.
```js
const worldLens = lens.go('world');

const callback = (event) => doSomething();
worldLens.attach(callback);

worldLens.set('Hello!');
```

# Сложно ли изучать линзы?
На самом деле, это очень не точный вопрос, т. к. он может означать:
1. Сложно ли освоить концепцию линз?
2. Сложно ли обучить нового сотрудника на проекте, использующего линзы?

На первый вопрос можно ответить весьма просто - столько же, сколько и освоение любой релевантной технологии. Это объясняется тем, что время, затраченное на изучение принципов не так велико по сравнению с изучением уже готовой архитектуры, существующей на проекте. Гараздо важнее ответить на второй вопрос.

Второй вопрос требует сравнительного анализа. Например, можно взять `Redux`, который является имплементацией [аспектно ориентированной парадигмы](https://ru.wikipedia.org/wiki/%D0%90%D1%81%D0%BF%D0%B5%D0%BA%D1%82%D0%BD%D0%BE-%D0%BE%D1%80%D0%B8%D0%B5%D0%BD%D1%82%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%BD%D0%BE%D0%B5_%D0%BF%D1%80%D0%BE%D0%B3%D1%80%D0%B0%D0%BC%D0%BC%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D0%B5). Сложность такого подхода заключается в том, что изучению подлежит каждый из реализованных аспектов на проекте. Многие аспекты, в силу своей реализации, могут быть скрыты, даже от опытных разработчиков. `Lens`, напротив, предлагает функциональный и объектно-ориентированный подход. Это означает, что к любой части функциональности ведёт логическое определение, т. е. изучая произвольный участок кода, можно прийти и ко всем, от него, зависимым. Другими словами, для обучения нового сотрудника достаточно изучить только концепцию `Lens`.

Как вывод, можно считать, что `Lens` не требует глубокого обучения на проекте, по сравнению с `Redux`.

# Lens VS Redux, MobX
Что лучше? Понятие не имею. На самом деле, многое зависит от постановки задачи, времени и совместимости. Если Вы уже используете проект на `redux`, то лучше продолжить его использовать. В остальных случаях - смело пробуйте `Lens`.

Удачки!