export interface IState<T>
{
    getState(): T;
}

export function isStateful(v: any): v is IState<any>
{
    return v && v.getState && typeof v.getState === 'function';
}