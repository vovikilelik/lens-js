/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

export function AttachEvent(current, diffs) {
	this.current = current;
	this.diffs = diffs;
}

export function NodeDiff(path, prev, value) {
	this.path = path;
	this.prev = prev;
	this.value = value;
}

const _compareKeys = (prevKeys, nextKeys) => {
	return (prevKeys.length === nextKeys.length)
		&& !prevKeys.some((p, i) => p !== nextKeys[i]);
}

const _getDiffs = (prev, next, path = [], diffs = []) => {
	const prevType = typeof prev;
	const nextType = typeof next;
	
	if (prevType !== nextType) {
		diffs.push(new NodeDiff(path, prev, next));
		return diffs;
	}
	
	switch (prevType) {
		case 'object':
			
			const prevKeys = Object.keys(prev);
			const nextKeys = Object.keys(next);
			
			if (!_compareKeys(prevKeys, nextKeys)) {
				diffs.push(new NodeDiff(path, prev, next));
				return diffs;
			}

			prevKeys.forEach(key => {
				_getDiffs(prev[key], next[key], [...path, key], diffs);
			});
			
			return diffs;
		default:
			if (prev !== next) {
				diffs.push(new NodeDiff(path, prev, next));
			};
			
			return diffs;
	}
}

const _shiftDiffs = (key, diffs) => {
	return diffs
		.filter(({path}) => path[0] === key)
		.map(({path, ...diff}) => ({...diff, path: path.slice(1)}));
}

const _makeObjectOrArray = (key, value, prev) => {
	switch (typeof key) {
		case 'number':
			const result = prev ? [...prev] : [];
			result[key] = value;
			
			return result;
		default:
			return { ...prev, [key]: value };
	}
}

const _coreFactory = (key, parent) => {
	return new Lens(
		() => {
			const value = parent.get();
			return value && value[key];
		},
		(value) => {
			const prev = parent.get();
			parent.set(_makeObjectOrArray(key, value, prev));
		},
		parent
	);
}

const _isPathEntry = (diffs, key) => diffs.some(({ path }) => path && path[0] === key)

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
		this.parent = parent;

		this.getter = getter;
		this.setter = setter;

		this.attachments = [];
		this.children = [];
	}

	_getParent() {
		return this.parent;
	}

	_fire(diffs) {
		const currentDiff = diffs.find(({ path }) => !path || !path.length);
		this.attachments.forEach((callback) => callback(new AttachEvent(currentDiff, diffs)));
	}

	_cascade(diffs) {
		this._fire(diffs);

		Object.keys(this.children).forEach((key) => {
			if (!_isPathEntry(diffs, key)) return;
			
			this.children[key]._cascade(_shiftDiffs(key, diffs));
		});
	}

	_effect(value, prev) {
		const diffs = _getDiffs(prev, value, [], []);
		diffs.length && (this._cascade(diffs));
	}

	/**
	 * Move to next node
	 * @param {string} key Name of node
	 * @param {Function} factory Node creator (coreFactory as default)
	 * @returns {Lens}
	 */
	go(key, factory) {
		const current = this.children[key];
		if (current && (!factory || factory === this.factory)) {
			return current;
		} else {
			const core = factory ? factory(_coreFactory) : _coreFactory;
			const node = core(key, this);
			
			this.children[key] = node;
			this.factory = factory;
			
			return node;
		}
	}

	/**
	 * Getting data assigned with current node
	 * @returns {object}
	 */
	get() {
		return this.getter();
	}

	/**
	 * Setting data to store relatives current node
	 * @param {object} value
	 * @returns {undefined}
	 */
	set(value) {
		const prev = this.get();
		this.setter(value, () => this._effect(value, prev));
	}

	/**
	 * Add change listener
	 * @param {Function(AttachEvent e)} callback
	 * @returns {undefined}
	 */
	attach(callback) {
		const exists = this.attachments.find((c) => c === callback);
		!exists && this.attachments.push(callback);
	}

	/**
	 * Remove change listener
	 * @param {Function} callback
	 * @returns {undefined}
	 */
	detach(callback) {
		this.attachments = this.attachments.filter((c) => c !== callback);
	}
}
