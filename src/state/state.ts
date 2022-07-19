export class State<T extends NonNullable<any>>
{
    private _state: T;

    constructor(private readonly defaultState?: T)
    {
        this.reset();
    }

    get state() { return this._state; }

    reset()
    {
        this._state = this.defaultState as T;
    }

    set(state: T)
    {
        this._state = state;
    }
}