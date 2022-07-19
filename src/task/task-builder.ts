import { ActionResult } from "../types";

import { Task } from "./task";

export class TaskBuilder<Input = void>
{
    build<Result>(action: (args: Input) => ActionResult<Result>)
    {
        return new Task<Input, Result>(action);
    }   
}