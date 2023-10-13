export interface NodeDiff<T> {
	value: T;
	prev?: T;
	path?: string[];
}

export interface AttachEvent<T> {
	current?: NodeDiff<T>;
	diffs: NodeDiff<any>[];
}

export type Callback<T> = (event: AttachEvent<T>, node: Lens<T>) => void;

export type Getter<T> = () => T;
export type Setter<T> = (value: T, callback?: () => void) => void;

type Children<T, P, K extends keyof T> = Lens<T[K], P>;

export type ChainFactory<A extends Lens<any>, B extends Lens<any> = A> = (current: A) => B;

type Constructor<T, P = unknown> = [getter: Getter<T>, setter: Setter<T>, parent?: P];
type ConstructorExt<T, P = unknown> = Constructor<T, P> & [...args: unknown[]];

type Instance<R, T> = new (...args: ConstructorExt<T>) => R;

type ArrayType<T, R = unknown> = T extends (infer E)[] ? E : R;

export class Lens<T, P = unknown> {
	constructor(...args: ConstructorExt<T, P>);

	/* LensLike imlp */
	public get(): T;
	public set(value: T): void;
	public go<K extends keyof T>(key: K): Lens<T[K], P>;

	/* Overloads */
	public set(value: T, callback?: () => void): void;
	public go<X extends Lens<T[K]>, K extends keyof T, R = X>(key: K, instance: Instance<R, T[K]>): R;
	public go<X extends Lens<T[K]>, K extends keyof T, R = X>(key: K, instance: Instance<R, T[K]>, ...args: unknown[]): R;

	/* Own */
	public attach(callback: Callback<T>): boolean;
	public detach(callback: Callback<T>): boolean;

	public transform<B extends Lens<any>>(factory: ChainFactory<Lens<T, P>, B>): B;
	public transform<B extends Lens<any>>(): B;
	
	/** @deprecated use transform */
	public chain<B extends Lens<any>>(factory: ChainFactory<Lens<T, P>, B>): B;
	/** @deprecated use transform */
	public chain<B extends Lens<any>>(): B;

	public list<L extends Lens<ArrayType<T>>>(): L[];

	public children<L extends Lens<ArrayType<T>>>(): Generator<{ key: string, value: L }>;
	
	public extends<P extends object>(prototype: (lens: this) => P): (typeof this) & P;
	public extends<P extends object, K extends keyof P>(prototype: P): (typeof this) & Record<K, Lens<P[K]>>;
}

export type CallbackWithSync<T> = (event: AttachEvent<T>, node: Lens<T>, sync: () => boolean, stamp: number) => void;

interface DebounceConstructor {
	new(defaultTimeout?: number): {
		run: (func: (sync: () => boolean, stamp: number) => void, timeout?: number) => void;
		cancel: () => void;
	};
}

export const Debounce: DebounceConstructor;

export namespace Callbacks {

	export function async<R, T>(
		request: (e: AttachEvent<T>) => Promise<R>,
		resolve: (result: R, e: AttachEvent<T>, node: Lens<T>, sync: () => boolean, stamp: number) => void,
		timeout?: number
	): Callback<T>;

	export function debounce<T>(callback: Callback<T> | CallbackWithSync<T>, timeout?: number): Callback<T>;

	export function strict<T>(callback: Callback<T>): Callback<T>;

	export function before<T>(callback: Callback<T>): Callback<T>;

	export function after<T>(callback: Callback<T>): Callback<T>;

	export function change<T>(callback: Callback<T>): Callback<T>;
}

export function transform<A, B = A>(onGet: (value: A) => B, onSet: (value: B, prev: A) => A): ChainFactory<Lens<A>, Lens<B>>;

export interface CreateOptions<T> {
	onGet?: (value: T) => T;
	onSet?: (value: T, prev?: T) => T;
}

export function createLens<X extends Lens<T>, T = unknown, R = X>(key: T, instance?: Instance<R, T>, options?: CreateOptions<T>): R;
