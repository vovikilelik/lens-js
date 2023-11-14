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
