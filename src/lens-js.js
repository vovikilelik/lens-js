/* 
 * Lens
 * version 1.5.x
 * LGPLv3
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
};

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
};

const _shiftDiffs = (key, diffs) => {
	return diffs
		.filter(({path}) => path[0] === key)
		.map(({path, ...diff}) => ({...diff, path: path.slice(1)}));
};

const _makeObjectOrArray = (key, value, prev) => {
	switch (typeof key) {
		case 'number':
			const result = prev ? [...prev] : [];
			result[key] = value;
			
			return result;
		default:
			return { ...prev, [key]: value };
	}
};

const getPrototype = (object) => {
	return object.prototype || object.__proto__;
};

const _coreFactory = (key, parent) => {
	const prototype = getPrototype(parent);
	const constructor = (prototype && prototype.constructor) || Lens;
	
	const getter = () => {
		const value = parent.get();
		return value && value[key];
	};
	
	const setter = (value, callback) => {
		const prev = parent.get();
		parent.set(_makeObjectOrArray(key, value, prev), callback);
	};
	
	return new constructor(getter, setter, parent);
};

const _isPathEntry = (diffs, key) => diffs.some(({ path }) => path && path[0] === key);

const _getRootVersion = (parent) => (parent && parent.getVersion) ? parent.getVersion() : 0;

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

	_fire(diffs, currentDiff) {
		this._attachments.forEach((callback) => callback(new AttachEvent(currentDiff, diffs)));
	}

	_notify(value, currentDiff) {
		this._fire([], currentDiff);
		
		if (!value || (typeof value !== 'object')) return;
		
		Object.keys(this._children).forEach((key) => {
			const child = this._children[key];
			(value[key] !== undefined) && child._notify && child._notify(value[key]);
		});
	}
	
	_cascade(diffs) {
		const currentDiff = diffs.find(({ path }) => !path || !path.length);

		if (currentDiff) {
			this._notify(currentDiff.value, currentDiff);
			return;
		}
		
		this._fire(diffs);

		Object.keys(this._children).forEach((key) => {
			if (!_isPathEntry(diffs, key)) return;
			
			const child = this._children[key];
			child._cascade && child._cascade(_shiftDiffs(key, diffs));
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
		const current = this._children[key];
		if (current && (!factory || factory === current._factory)) {
			return current;
		} else {
			const core = factory ? factory(_coreFactory) : _coreFactory;
			const node = core(key, this);
			
			node._factory = factory;
			this._children[key] = node;
			
			return node;
		}
	}

	/**
	 * Getting data assigned with current node
	 * @returns {object}
	 */
	get() {
		return this._getter();
	}

	_initCascade(value, callback) {
		const prev = this.get();
		
		this._setter(value);
		
		const current = this.get();
		
		if (prev !== current) {
			this._effect(current, prev);
		}

		callback && callback();
	}

	/**
	 * Setting data to store relatives current node
	 * @param {object} value
	 * @param {Function} callback
	 * @returns {undefined}
	 */
	set(value, callback) {
		this._version++;
		this._parent ? this._setter(value, callback) : this._initCascade(value, callback);
	}

	/**
	 * Add change listener
	 * @param {Function(AttachEvent e)} callback
	 * @returns {boolean}
	 */
	attach(callback) {
		const exists = this._attachments.find((c) => c === callback);
		!exists && this._attachments.push(callback);
		
		return !exists;
	}

	/**
	 * Remove change listener
	 * @param {Function} callback
	 * @returns {boolean}
	 */
	detach(callback) {
		const filtered = this._attachments.filter((c) => c !== callback);
		const changed = this._attachments.length === filtered.length;
		this._attachments = filtered;
		
		return changed;
	}
}
