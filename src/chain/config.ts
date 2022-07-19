import { Action, Key } from "../types";

export interface Config<Input = void>
{
    abortOnFail?: boolean;
    condition?: Action<Input, boolean>;
    finally?: Action<Input, any>;
}
export type ErrFailingConfig<C extends Config<any>, A, B> = C['abortOnFail'] extends true ? A : B;
export type ConditionalConfig<Input = void> = Config<Input> & { condition: Action<Input, boolean> };
export function defaultConfig<Input = void>() { return { abortOnFail: false } as Config<Input>; }

export type ComplexConfig<C extends Config<any>, K extends Key, A, B> = C['condition'] extends Action<any, boolean> ?
    Partial<Record<K, ErrFailingConfig<C, A, B>>> :
    Record<K, ErrFailingConfig<C, A, B>>