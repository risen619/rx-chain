import { AsyncSubject } from "rxjs";

import { State } from "../state";
import { Task } from "../task";
import { Action, ErrActionState, IExecutable, IState } from "../types";

export class ThrowableTask<
    Input = void,
    Result = {},
    Err = {}
>
    implements IExecutable<Input, ErrActionState<() => Result, Err>>, IState<ErrActionState<() => Result, Err>>
{
    private _state = new State<ErrActionState<() => Result, Err>>();

    constructor(
        private _try: (args: Input) => Result,
        private _catch: Action<{ input: Input, error: any }, Err>
    ) { }

    getState() { return this._state.state; }

    execute(input: Input)
    {
        const subject = new AsyncSubject<ErrActionState<() => Result, Err>>();
        
        new Task(this._try)
            .execute(input)
            .subscribe({
                next: v => (this._state.set({ failed: false, value: v as any }), subject.next(this.getState())),
                error: error => new Task(this._catch)
                    .execute({ error, input })
                    .subscribe({
                        next: v => (this._state.set({ error: v, failed: true }), subject.next(this.getState())),
                        error: e => (this._state.reset(), subject.error(e)),
                        complete: () => subject.complete()
                    }),
                complete: () => subject.complete()
            });

        return subject.asObservable();
    }
}