import { AsyncSubject, defer, of, zip } from "rxjs";
import { catchError, tap } from "rxjs/operators";

import { State } from "../state";
import { Task } from "../task";
import { ActionResult, ActionsRecord, ActionsRecordState, IExecutable, IState } from "../types";

export class Parallel<Input = void, Actions extends ActionsRecord<Input> = {}>
    implements IExecutable<Input, ActionsRecordState<Actions>>, IState<ActionsRecordState<Actions>>
{
    private _state: State<ActionsRecordState<Actions>>;

    constructor(private actions: Actions, private untrackedActions: ((args: Input) => ActionResult<any>)[] = [])
    { }

    getState() { return this._state.state; }

    execute(input: Input)
    {
        if (
            (!this.actions && !this.untrackedActions) ||
            Object.keys(this.actions).length === 0 && this.untrackedActions.length === 0
        )
            return of({ } as ActionsRecordState<Actions>);

        this._state = new State<ActionsRecordState<Actions>>({} as any);

        const subject = new AsyncSubject<ActionsRecordState<Actions>>();

        zip(
            ...(
                Object.keys(this.actions)
                    .map(key =>
                        defer(() =>
                            new Task(this.actions[key])
                                .execute(input)
                                .pipe(
                                    tap(v =>
                                        this._state.set({
                                            ...this.getState(),
                                            [key]: { value: v, failed: false }
                                        })
                                    ),
                                    catchError(e =>
                                        of(this._state.set({
                                            ...this.getState(),
                                            [key]: { error: e, failed: true }
                                        }))
                                    )
                                )
                        )
                    )
                    .concat(
                        this.untrackedActions
                            .map(a =>
                                defer(() =>
                                    new Task(a)
                                        .execute(input)
                                        .pipe(
                                            catchError((e) => of(e))
                                        )
                                )
                            )
                    )
            )
        )
        .subscribe({
            next: () => subject.next(this.getState()),
            error: () => subject.next(this.getState()),
            complete: () => subject.complete()
        })

        return subject.asObservable();
    }
}
