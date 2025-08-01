/*
 * Copyright (C) 2023 svinokot.
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 */

import { Debounce } from './lib/debounce.js';

export function AttachEvent(diffs, current) {
	this.current = current;
	this.diffs = diffs;
}

export function NodeDiff(path, value, prev) {
	this.path = path;
	this.prev = prev;
	this.value = value;
}

const _compareKeys = (prevKeys, nextKeys) => {
	return (prevKeys.length === nextKeys.length)
		&& !prevKeys.some((p, i) => p !== nextKeys[i]);
};

const _typeof = (value) => {
	if (value === null || value === undefined) {
		return 'undefined';
	} else {
		const type = typeof value;
		
		if (type === 'object') {
			return value instanceof Date
				? 'date'
				: type;
		} else {
			return type;
		}
	}
};

const _getKeys = (data) => {
	return Array.isArray(data) ? Object.keys(data) : Object.keys(data).sort();
};

const _getDiffs = (prev, next, path = [], diffs = []) => {
	const prevType = _typeof(prev);
	const nextType = _typeof(next);

	if (prevType !== nextType) {
		diffs.push(new NodeDiff(path, next, prev));
		return diffs;
	}

	switch (prevType) {
		case 'object':

			const prevKeys = _getKeys(prev);
			const nextKeys = _getKeys(next);

			if (!_compareKeys(prevKeys, nextKeys)) {
				diffs.push(new NodeDiff(path, next, prev));
				return diffs;
			}

			prevKeys.forEach(key => {
				_getDiffs(prev[key], next[key], [...path, key], diffs);
			});

			return diffs;
		default:
			if (prev !== next) {
				diffs.push(new NodeDiff(path, next, prev));
			}

			return diffs;
	}
};

const _trimDiffs = (key, diffs) => {
	return diffs
		.filter(({ path }) => path && path[0] == key /* string or int */)
		.map(({ path, ...diff }) => ({ ...diff, path: path.slice(1) }));
};

const _pathStartsWith = (start, path) => {
	for (let i = 0; i < start.length; i++) {
		if (start[i] !== path[i]) {
			return false;
		}
	}

	return true;
};

const _getByPath = (value, path) => {
	for (let i = 0; i < path.length; i++) {
		if (value === undefined || value === null) {
			return undefined;
		}

		value = value[path[i]];
	}

	return value;
};

const _makeValue = (value, prev) => typeof value === 'function'
	? value(prev)
	: value;

const _makeObjectOrArray = (key, value, all) => {
	const isArray = typeof key === 'number' || Array.isArray(all);

	const currentValue = _makeValue(value, all && all[key]);

	if (isArray) {
		const result = all ? [ ...all ] : [];
		result[+key] = currentValue;

		return result;
	} else {
			return { ...all, [key]: currentValue };
	}
};

const _coreFactory = (key, current, instance = Lens, props) => {
	const getter = () => {
		const value = current.get();
		return value && value[key];
	};

	const setter = (value, ...args) => {
		const all = current.get();
		current._set(_makeObjectOrArray(key, value, all), ...args);
	};

	return new instance(getter, setter, props);
};

const _isPathEntry = (diffs, key) => diffs.some(({ path }) => path && path[0] == key /* string or int */);


/**
 * Lens node
 * @type Lens
 */
export class Lens {

	_subscribes = [];

	_children = {};

	_transactions = [];

	/**
	 * Constructor
	 * @param {Function} getter
	 * @param {Function} setter
	 * @param {object} props
	 * @returns {Lens}
	 */
	constructor(getter, setter, props) {
		this._getter = getter;
		this._setter = setter;

		this._localSetter = this.set.bind(this);

		this[Symbol.iterator] = function* () {
			const raw = this.get();

			const isArray = Array.isArray(raw);

			for (const key in raw) {
				yield this.go(isArray ? +key : key);
			}
		};
		
		this.afterCreate(props);
	}
	
	/**
	 * After creation hook
	 * @param {type} props Constructor props
	 * @returns {undefined}
	 */
	afterCreate(props) {}

	onUnmount() {}
	onMount() {}

	* children() {
		const keys = Object.keys(this._children);

		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			yield { key, value: this._children[key] };
		}
	}

	* subscribes() {
		for (const item of this._subscribes) {
			yield item;
		}
	}

	toString() {
		return this.get();
	}

	get getter() {
		return this._getter;
	}

	get setter() {
		return this._localSetter;
	}

	_unplug() {
		this._push = undefined;
		this.onUnmount();
	}

	_clear() {
		Object.values(this._children).forEach(node => node._unplug?.());
		this._children = {};
	}

	_fire(diffs, currentDiff) {
		const event = new AttachEvent(diffs, currentDiff);
		this._subscribes.forEach(callback => callback(event, this));
	}

	_cascade(diffs, value, prev) {

		// children copy before fire
		const children = this._children;

		const currentDiff = diffs.find(({ path }) => !path || !path.length);
		this._fire(diffs, currentDiff || new NodeDiff([], value, prev));
		
		// fire cascade on all chain
		this._chain && this._chain._cascade(diffs, value, prev);

		// remove unnecessary children
		if (typeof value !== 'object') {
			if (value !== undefined && value !== null)
				this._clear();

			return;
		}

		let keys = Object.keys(children);

		// remove unnecessary array elements
		if (Array.isArray(value)) {
			for (let i = value.length; i < keys.length; i++) {
				if (children[i]) {
					children[i]._unplug?.();
					delete children[i];
				}
			}
		}

		const treeExists = diffs.some(({ path }) => path && path.length);

		keys.forEach(key => {
			const child = children[key];

			if (!child)
				return;

			if (treeExists && !_isPathEntry(diffs, key))
				return;

			child._cascade && child._cascade(_trimDiffs(key, diffs), value[key], prev && prev[key]);
		});
	}

	_assign(key, node) {
		node._push = transaction => this._transaction(transaction, key);
		this._children[key] = node;

		node.onMount?.();
	}

	define(key, node) {
		if (this._children[key])
			this._unplug(this._children[key]);

		this._assign(key, node);

		node._getter = () => this.get()?.[key];
		node._setter = (value, ...args) => this.set(_makeObjectOrArray(key, value, this.get()), ...args);
	}

	/**
	 * Move to nested node
	 * @param {string|number} key Name of nested field
	 * @param {class} instance Instance new node prototype
	 * @param {object} props Constructor props
	 * @returns {Lens} Nested node
	 */
	go(key, instance, props) {
		const current = this._children[key];

		if (current) {
			return current;
		} else {
			const node = _coreFactory(key, this, instance || Lens, props);

			this._assign(key, node);

			return node;
		}
	}
	
	/**
	 * Create mirror node with different instance
	 * @param {class|function} factory Factory or instance of new node
	 * @param {object} props Constructor props
	 * @returns {Lens}
	 */
	chain(factory, props) {
		if (!factory || this._chainFactory === factory) {
			return this._chain;
		}

		this._chain = (factory.prototype && factory.prototype.constructor)
			? new factory(() => this.get(), (...args) => this.set(...args), props)
			: factory(this, props);

		this._chain._push = this._push;
		this._chain.onMount?.();

		this._chainFactory = factory;

		return this._chain;
	}

	/**
	 * Getting data assigned with current node
	 * @returns {object}
	 */
	get() {
		return this._getter();
	}

	_notify([sender, path]) {
		/* Ignore dublicate transaction */
		const lastTransaction = this._transactions[this._transactions.length - 1];
		if (lastTransaction && lastTransaction.sender === sender) {
			// No action
			return;
		} else {
			this._transactions.push({ sender, path });
		}

		const notifer = () => {
			const prev = this._prev;
			this._prev = undefined;

			const current = this.get();

			// Тут может быть ошибка, при которой транзакции "зависнут" и notifer не будет отрабатывать.
			// Если выполнить set() с одинаковыми данными, то следующее условие не сработает и старая транзакция не удалиться.
			// В итоге, следующие попытки вставить другое значение будут игнорироваться ЕСЛИ _notify будет пропускать повторяющиеся транзакции без перезапуска notifer()
			// Потому важно очищать транзакции, даже, если prev === current
			
			const activeTransactions = [...this._transactions];

			if (prev !== current) {
				activeTransactions.sort((a, b) => a.path.length - b.path.length);
				const roots = activeTransactions.reduce((acc, b) => {
					if (!acc.some(a => _pathStartsWith(a.path, b.path))) {
						acc.push(b);
					}

					return acc;
				}, []);

				const diffs = roots.reduce((acc, root) => {
					const locals = _getDiffs(_getByPath(prev, root.path), root.sender.get(), root.path, []);
					return [ ...acc, ...locals];
				}, []);

				diffs.length && this._cascade(diffs, current, prev);
			}
			
			this._transactions = [...this._transactions.filter(t => !activeTransactions.some(c => c === t))];
		};

		if (this._debounce) {
			this._debounce.run(notifer);
		} else {
			this._debounce = new Debounce();
			notifer();
		}
	}

	_transaction([sender, path], key) {
		this._push
			? this._push([sender, [key].concat(path)])
			: this._notify([sender, [key].concat(path)]);
	}

	_store(value, ...args) {
		!this._prev && (this._prev = this.get());
		this._setter(value, ...args);
	}

	_set(value, ...args) {
		this._push ? this._setter(value, ...args) : this._store(_makeValue(value, this.get()), ...args);
	}

	/**
	 * Setting data to store relatives current node
	 * @param {any} value
	 * @param {any} args
	 * @returns {undefined}
	 */
	set(value, ...args) {
		this._set(value, ...args);
		this._push
			? this._push([this, []])
			: this._notify([this, []]);
	}

	/**
	 * Add change listener
	 * @param {Function(AttachEvent e)} callback
	 * @returns {boolean}
	 */
	subscribe(callback) {
		if (typeof callback !== 'function') return false;

		!this.hasSubscribed(callback) && (this._subscribes.push(callback));

		return () => this.unsubscribe(callback);
	}

	/**
	 * Remove change listener
	 * @param {Function} callback
	 * @returns {boolean}
	 */
	unsubscribe(callback) {
		const filtered = this._subscribes.filter(c => c !== callback);
		const changed = this._subscribes.length === filtered.length;

		this._subscribes = filtered;

		return changed;
	}

	hasSubscribed(callback) {
		return this._subscribes.some(c => c === callback);
	}
}
