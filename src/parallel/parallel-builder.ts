import { ActionResult, ActionsRecord } from "../types";

import { Parallel } from "./parallel";

export class ParallelBuilder<Input = void>
{
    build<Actions extends ActionsRecord<Input>>(actions: Actions, untrackedActions: ((args: Input) => ActionResult<any>)[] = [])
    {
        return new Parallel<Input, Actions>(actions, untrackedActions);
    }
}