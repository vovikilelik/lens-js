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
		.filter(({ path }) => path && path[0] === key)
		.map(({ path, ...diff }) => ({ ...diff, path: path.slice(1) }));
};

const _makeObjectOrArray = (key, value, prev) => {
	switch (typeof key) {
		case 'number':
			const result = prev ? [...prev] : [];
			result[key] = value;

			return result;
		default:
			return {...prev, [key]: value};
	}
};

const _coreFactory = (key, current, instance = Lens) => {
	const getter = () => {
		const value = current.get();
		return value && value[key];
	};

	const setter = (value, callback) => {
		const prev = current.get();
		current.set(_makeObjectOrArray(key, value, prev), callback);
	};

	return new instance(getter, setter, current);
};

const _isPathEntry = (diffs, key) => diffs.some(({ path }) => path && path[0] === key);

const _getRootVersion = (parent) => (parent && parent.getVersion) ? parent.getVersion() : 0;

const _isNumber = (key) => !isNaN(key);
const _getIndexOrName = (key) => _isNumber(key) ? +key : key;

/**
 * Lens node
 * @type Lens
 */
export class Lens {

	/**
	 * Constructor
	 * @param {Function} getter
	 * @param {Function} setter
	 * @param {Lens} parent
	 * @returns {Lens}
	 */
	constructor(getter, setter, parent) {
		this._parent = parent;

		this._getter = getter;
		this._setter = setter;

		this._attachments = [];
		this._children = [];

		this._version = 0;
	}

	getVersion() {
		return _getRootVersion(this._parent) + this._version;
	}

	_format() {
		this._children = [];
	}

	_fire(diffs, currentDiff) {
		this._attachments.forEach(callback => callback(new AttachEvent(diffs, currentDiff), this));
		this._chain && this._chain._fire && this._chain._fire(diffs, currentDiff);
	}

	_cascade(diffs, value, prev) {

		// children copy before fire
		const children = this._children;

		const currentDiff = diffs.find(({ path }) => !path || !path.length);
		this._fire(diffs, currentDiff || new NodeDiff([], value, prev));

		// remove unnecessary children
		if (typeof value !== 'object' || value === undefined || value === null) {
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
	 * @returns {Lens}
	 */
	go(key, instance) {
		const current = this._children[key];

		if (current) {
			return current;
		} else {
			const node = _coreFactory(key, this, instance || Lens);
			this._children[key] = node;

			return node;
		}
	}
	
	chain(factory) {
		if (!factory || this._chainFactory === factory) {
			return this._chain || this;
		}

		this._chain = factory(this);
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

	_setAndNotify(value, callback) {
		!this._prev && (this._prev = this.get());

		this._setter(value, callback);

		callback && callback();
		
		const notifer = () => {
			const prev = this._prev;
			this._prev = undefined;
			
			const current = this.get();
			
			if (prev !== current) {
				const diffs = _getDiffs(prev, value, [], []);
				diffs.length && this._cascade(diffs, value, prev);
			}
		};

		if (this._debounce) {
			this._debounce.run(notifer);
		} else {
			this._debounce = new Debounce();
			notifer();
		}
	}

	/**
	 * Setting data to store relatives current node
	 * @param {object} value
	 * @param {Function} callback
	 * @returns {undefined}
	 */
	set(value, callback) {
		this._version++;
		this._parent ? this._setter(value, callback) : this._setAndNotify(value, callback);
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
		const raw = this.get();

		const isArray = !raw || Array.isArray(raw);
		return Object.keys(raw).map(k => {
			const key = isArray ? _getIndexOrName(k) : k;
			return this.go(key);
		});
	}
}
