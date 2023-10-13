/* 
 * Lens
 * version 2.0.x
 * LGPLv3
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
	return value === null || value === undefined
		? 'undefined'
		: typeof value;
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

const _makeObjectOrArray = (key, value, prev) => {
	const isArray = typeof key === 'number' || Array.isArray(prev);
	
	if (isArray) {
		const result = prev ? [ ...prev ] : [];
		result[+key] = value;

		return result;
	} else {
			return { ...prev, [key]: value };
	}
};

const _coreFactory = (key, current, instance = Lens) => {
	const getter = () => {
		const value = current.get();
		return value && value[key];
	};

	const setter = (value, ...args) => {
		const prev = current.get();
		current._set(_makeObjectOrArray(key, value, prev), ...args);
	};

	return new instance(getter, setter, current);
};

const _isPathEntry = (diffs, key) => diffs.some(({ path }) => path && path[0] == key /* string or int */);

const _copyProperty = (original, source, key) => {
	const descriptor = Object.getOwnPropertyDescriptor(source, key);
	Object.defineProperty(original, key, descriptor);
};


/**
 * Lens node
 * @type Lens
 */
export class Lens {

	_attachments = [];
	_children = {};
	
	_transactions = [];

	/**
	 * Constructor
	 * @param {Function} getter
	 * @param {Function} setter
	 * @param {Lens} parent
	 * @returns {Lens}
	 */
	constructor(getter, setter, parent) {
		this._getter = getter;
		this._setter = setter;
		this._parent = parent;

		this[Symbol.iterator] = function* () {
			const raw = this.get();
			
			const isArray = Array.isArray(raw);
			
			for (const key in raw) {
				yield this.go(isArray ? +key : key);
			}
		};
	}

	* children() {
		const keys = Object.keys(this._children);

		for (let key in keys) {
			yield { key, value: this._children[key] }
		}
	}

	_format() {
		this._children = {};
	}

	_fire(diffs, currentDiff) {
		const event = new AttachEvent(diffs, currentDiff);

		this._attachments.forEach(callback => callback(event, this));
		this._chain && this._chain._fire && this._chain._fire(diffs, currentDiff);
	}

	_cascade(diffs, value, prev) {

		// children copy before fire
		const children = this._children;

		const currentDiff = diffs.find(({ path }) => !path || !path.length);
		this._fire(diffs, currentDiff || new NodeDiff([], value, prev));

		// remove unnecessary children
		if (typeof value !== 'object') {
			if (value !== undefined && value !== null)
				this._format();

			return;
		}
		
		const treeExists = diffs.some(({ path }) => path && path.length);
		
		Object.keys(children).forEach(key => {
			if (treeExists && !_isPathEntry(diffs, key))
				return;

			const child = children[key];
			child._cascade && child._cascade(_trimDiffs(key, diffs), value[key], prev && prev[key]);
		});
	}

	/**
	 * Move to next node
	 * @param {string} key Name of node
	 * @param {class} instance node prototype
	 * @returns {instance}
	 */
	go(key, instance) {
		const current = this._children[key];

		if (current) {
			return current;
		} else {
			const node = _coreFactory(key, this, instance || Lens);
			node._push = (transaction) => this._transaction(transaction, key);

			this._children[key] = node;

			return node;
		}
	}
	
	/**
	 * @deprecated use transform
	 */
	chain(factory) {
		return this.transform(factory);
	}
	
	transform(factory) {
		if (!factory || this._chainFactory === factory) {
			return this._chain || this;
		}

		this._chain = factory(this);
		this._chain._push = this._push;
		
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
		if (this._transactions[0] && this._transactions[0].sender === sender) {
			return;
		}
		
		this._transactions.push({ sender, path });
		
		const notifer = () => {
			const prev = this._prev;
			this._prev = undefined;

			const current = this.get();
			
			if (prev !== current) {
				this._transactions.sort((a, b) => a.path.length - b.path.length);
				const roots = this._transactions.reduce((acc, b) => {
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
			
			this._transactions = [];
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
		this.parent ? this._setter(value, ...args) : this._store(value, ...args);
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
	attach(callback) {
		if (typeof callback !== 'function') return false;
		
		const exists = this._attachments.find(c => c === callback);
		!exists && (this._attachments.push(callback));

		return !exists;
	}

	/**
	 * Remove change listener
	 * @param {Function} callback
	 * @returns {boolean}
	 */
	detach(callback) {
		const filtered = this._attachments.filter(c => c !== callback);
		const changed = this._attachments.length === filtered.length;

		this._attachments = filtered;

		return changed;
	}

	list() {
		return Array.from(this);
	}
	
	extends(prototype) {
		if (typeof prototype === 'function') {
			const currentProto = prototype(this);
			
			return Object.keys(currentProto).reduce((acc, key) => {
				if (typeof currentProto[key] === 'function') {
					acc[key] = currentProto[key];
				} else {
					_copyProperty(acc, currentProto, key);
				}

				return acc;
			}, this);
		} else {
			return Object.keys(prototype).reduce((acc, key) => {
				Object.defineProperty(acc, key, { get: () => acc.go(key) });
				acc[key].set(prototype[key]);
				
				return acc;
			}, this);
		}
	}
	
	toString() {
		return this.get();
	}
}
