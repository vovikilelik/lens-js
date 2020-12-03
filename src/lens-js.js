/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function AttachEvent(current, diffs) {
	this.current = current;
	this.diffs = diffs;
}

function NodeDiff(path, prev, value) {
	this.path = path;
	this.prev = prev;
	this.value = value;
}

function Mapper(getter, setter) {
	this.getter = getter;
	this.setter = setter;
}

const getStrictCallback = (callback) => (e) => {
	const { current } = e;
	current && callback(e);
}

const getArray = (lens) => {
	const raw = lens.get();
	return Object.keys(raw).map(k => lens.go(k));
}

const getFactory = ({ getter, setter }) => (factory) => (key, parent) => {
	const lens = factory(key, parent);
	
	return new Lens(
		() => getter(lens.get()),
		(value) => lens.set(setter(value, lens.get())),
		parent
	);
}

const compareKeys = (prevKeys, nextKeys) => {
	return (prevKeys.length === nextKeys.length)
		&& prevKeys.some((p, i) => p === nextKeys[i]);
}

const getDiffs = (prev, next, path = [], diffs = []) => {
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
			
			if (!compareKeys(prevKeys, nextKeys)) {
				diffs.push(new NodeDiff(path, prev, next));
				return diffs;
			}

			prevKeys.forEach(key => {
				getDiffs(prev[key], next[key], [...path, key], diffs);
			});
			
			return diffs;
		default:
			if (prev !== next) {
				diffs.push(new NodeDiff(path, prev, next));
			};
			
			return diffs;
	}
}

const shiftDiffs = (key, diffs) => {
	return diffs
		.filter(({path}) => path[0] === key)
		.map(({path, ...diff}) => ({...diff, path: path.slice(1)}));
}

const makeObjectOrArray = (key, value, prev) => {
	switch (typeof key) {
		case 'number':
			const result = prev ? [...prev] : [];
			result[key] = value;
			
			return result;
		default:
			return { ...prev, [key]: value };
	}
}

const coreFactory = (key, parent) => {
	return new Lens(
		() => {
			const value = parent.get();
			return value && value[key];
		},
		(value) => {
			const prev = parent.get();
			parent.set(makeObjectOrArray(key, value, prev));
		},
		parent
	);
}

class Lens {
	constructor(getter, setter) {
		this.parent = parent;

		this.getter = getter;
		this.setter = setter;

		this.attachments = [];
		this.children = [];
	}

	getParent() {
		return this.parent;
	}

	go(key, factory) {
		const current = this.children[key];
		if (current && (!factory || factory === this.factory)) {
			return current;
		} else {
			const core = factory ? factory(coreFactory) : coreFactory;
			const node = core(key, this);
			
			this.children[key] = node;
			this.factory = factory;
			
			return node;
		}
	}

	get() {
		return this.getter();
	}

	effect(value, prev, diffs = getDiffs(prev, value, [], [])) {
		this.attachments.forEach((callback) => callback(new AttachEvent(diffs.find(({path}) => !path || !path.length), diffs)));

		Object.keys(this.children).forEach((key) => {
			
			if (!diffs.some(({path}) => path && path[0] === key)) {
				return;
			}
			
			this.children[key].effect(value && value[key], prev && prev[key], shiftDiffs(key, diffs));
		});
	}

	set(value) {
		const prev = this.get();
		this.setter(value, () => this.effect(value, prev));
	}

	attach(callback) {
		const exists = this.attachments.find((c) => c === callback);
		!exists && this.attachments.push(callback);
	}

	detach(callback) {
		this.attachments = this.attachments.filter((c) => c !== callback);
	}
}
