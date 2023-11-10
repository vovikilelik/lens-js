/* 
 * lgpl-v2.1-or-later
 */

/**
 * Debounce function
 * @param {Number} defaultTimeout
 * @returns {Debounce}
 */
export function Debounce(defaultTimeout = 0) {
	let sync = 0;

	this.run = (func, timeout = defaultTimeout) => {
		const stamp = ++sync;
		setTimeout(() => {
			(sync === stamp) && func(() => stamp === sync, stamp);
		}, timeout);
	};
	
	this.cancel = () => sync++;
}
