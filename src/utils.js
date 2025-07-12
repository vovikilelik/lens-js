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

import { Lens } from './lens.js';
import { Debounce as Pool } from './lib/debounce.js';

export const Debounce = Pool;

const _passIfFalse = value => value ? value : undefined;
const _interruptIfFalse = value => value ? value : false;

const _isStrict = diffs => diffs.some(({ path }) => !path || !path.length);

/**
 * Creating callback, which will be called only if current node would be changed
 */
const object = ({ current, diffs }) => {
	const strictAndAssign = diffs.find(({ path }) => !path || path.length < 2);

//	const change = (typeof current.value === 'object')
//		? current.prev === undefined && current.value !== undefined
//		: current.prev !== current.value;
//		
	const change = (typeof current.value === 'object')
		? (Array.isArray(current.prev) && Array.isArray(current.value)
			? current.prev.length !== current.value.length
			: current.prev === undefined && current.value !== undefined
		)
		: current.prev !== current.value;

	return _passIfFalse(strictAndAssign || change);
};

const objectDefined = args => _passIfFalse(object(args) && args.current.value !== undefined);

/**
 * Creating callback, which will be called only if current node would be replaced of new structure
 */
const strict = ({ diffs }) => _passIfFalse(_isStrict(diffs));

/**
 * Creating callback, which will be called if current node and subtree would be changed or creating
 */
const subtree = ({ diffs }) => _passIfFalse(_isStrict(diffs) || diffs.length === 0);

/**
 * Creating callback, which will be triggered on path from root to changed node
 */
const path = ({ diffs }) => _passIfFalse(_isStrict(diffs) || diffs.length > 0);

const _combineTriggers = (...triggers) => (...args) => {
	for (const trigger of triggers) {
		const result = trigger(...args);

		if (result !== undefined)
			return result;
	}
};

const _passTrigger = trigger => (...args) => _passIfFalse(trigger(...args));
const _interruptTrigger = trigger => (...args) => _interruptIfFalse(trigger(...args));

const _deepTrigger = () => true;

const and = (...triggers) => (...args) => {
	// ?
};

const or = (...triggers) => (...args) => {
	// ?
};

const not = trigger => (...args) => {
	// ?
};

export const Triggers = { deep: _deepTrigger, object, objectDefined, strict, subtree, path, combine: _combineTriggers, pass: _passTrigger, interrupt: _interruptTrigger };

const _getField = (source, path) => {
	if (path.length === 1)
		return source[path[0]];

	let name = path[0];
	let value = source;

	for (i = 0; i < path.length && value; i++)
		value = value[name];

	return value;
};

const createDefaultDiffGetter = (field) => {
	const fieldPath = field && field.split('.');

	return ({ current }) => {
		if (!fieldPath)
			return current;

		const value = current.value && _getField(current.value, fieldPath);
		const prev = current.prev && _getField(current.prev, fieldPath);

		return { value, prev, path: current.path };
	};
};

const check = (field) => {
	const diffGetter = typeof field === 'string' || !field
		? createDefaultDiffGetter(field)
		: field;

	const checker = (method) => (event, ...args) => {
		const diff = diffGetter(event);
		return diff && method(diff, ...args);
	};

	return {
		use: checker,
		is: (...values) => checker(({ value }) => values.some(v => (typeof v === 'function') ? v(value) : v === value)),
		changed: () => checker(({ value, prev }) => value !== prev),
		defined: (defined = true) => checker(({ value, prev }) => ((prev === undefined || prev === null) === defined) && ((value !== undefined && value !== null) === defined))
	};
};

export const Differ = { check };

/**
 * Creating callback with throttling
 * @param {Function} callback
 * @param {Number} timeout
 * @returns {Function}
 */
const debounce = (callback, timeout) => {
	const pool = new Pool(timeout || 0);

	return (...e) => {
		pool.run((...d) => callback(...e, ...d));
	};
};

/**
 * Creating callback whitch will call result if request finished last
 * @param {Function} Promise request
 * @param {Function} resolve callback for Promise.then()
 * @param {Number} timeout
 * @returns {Function}
 */
const async = (request, resolve, timeout = 0) => {
	return debounce(
		(event, lens, sync, ...args) => request(event, lens).then(r => sync() && resolve(r, event, lens, sync, ...args)),
		timeout
	);
};

async function* _pipeGenerator(callbacks, ...args) {
	for (let i = 0; i < callbacks.length; i++) {
		const callback = callbacks[i];
		yield await callback(...args);
	}
};

const _isValueDefine = value => value !== undefined && value !== null;

const _hasPipeNext = result => !_isValueDefine(result) || result;

async function _pipeRunner(callbacks, ...args) {
	const generator = _pipeGenerator(callbacks, ...args);

	while (true) {
		const { done, value } = await generator.next();

		const returnValue = typeof value === 'function'
			? await value(...args)
			: value;

		if (!_hasPipeNext(returnValue)) return returnValue;

		if (done) return;
	}
};

const pipe = (...callbacks) =>
	async (...args) => await _pipeRunner(callbacks, ...args);

export const createCallback = (trigger, ...callbacks) =>
	(...args) => (!trigger || trigger(...args)) && callbacks.forEach(c => c(...args));

/**
 * Namespace of callback factory
 * @type type
 */
export const Callbacks = {
	object: (...callbacks) => createCallback(Triggers.object, ...callbacks),
	strict: (...callbacks) => createCallback(Triggers.strict, ...callbacks),
	subtree: (...callbacks) => createCallback(Triggers.subtree, ...callbacks),
	path: (...callbacks) => createCallback(Triggers.path, ...callbacks),
	debounce,
	async,
	pipe
};

export const transform = (to, from, instance = Lens, props) => (current) => new instance(
	() => to(current.get()),
	(value, ...args) => current.set(from(value, current.get()), ...args),
	props
);

export const createLens = (data, instance = Lens, props, { onGet, onSet } = {}) => {
	const store = { data };

	if (onGet || onSet) {
		return new instance(
			() => onGet ? onGet(store.data) : store.data,
			(value) => onSet ? (store.data = onSet(value, store.data)) : (store.data = value),
			props
		);
	} else {
		return new instance(
			() => store.data,
			(value) => store.data = value,
			props
		);
	}
};

export const asArray = (lens) => Array.from(lens);

export const createLocalStorageAdapter = (key) => {

	const getItem = (key, defaultValue) => {
		const value = localStorage.getItem(key);
		return value ? JSON.parse(value) : defaultValue;
	};

	const setItem = (key, value) => {
		localStorage.setItem(key, JSON.stringify(value));
		return value;
	};

	return {
		onGet: value => getItem(key, value),
		onSet: (value, prev) => setItem(key, value)
	};
};
