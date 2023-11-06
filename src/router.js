/* 
 LGPLv3
 */

export class Router {
	get() {}
	set(value, ...args) {}
}

export class DataRouter extends Router {
	
	constructor(data) {
		super();
		this._data = data;
	}
	
	get() {
		return this._data;
	}
	
	set(value, ...args) {
		this._data = data;
	}
}

const _isJsonEmpty = value => !value || value === '{}';

class BrowserStorageRouter extends DataRouter {
	
	constructor(storeObject, key, initData) {
		super(initData);

		this._storeObject = storeObject;
		this._key = key;
	}
	
	get() {
		try {
			const value = this._storeObject.getItem(this._key);
			return _isJsonEmpty(value)
				? super.get()
				: JSON.parse(value);

		} catch (e) {
			return super.get();
		}
	}
	
	set(value, ...args) {
		super.set(value, ...args);
		this._storeObject.setItem(this._key, JSON.stringify(value));
	}
}

export class LocalStorageRouter extends BrowserStorageRouter {
	
	constructor(...args) {
		super(localStorage, ...args);
	}
}

export class SessionStorageRouter extends BrowserStorageRouter {
	
	constructor(...args) {
		super(sessionStorage, ...args);
	}
}
