import { Observable } from 'rxjs';
import { ThrowableTask } from '../src/throwable';

describe('Throwable Task', () =>
{
    it('should emit value from try branch', done =>
    {
        const task = new ThrowableTask(() => 1, () => 2);
        task.execute()
            .subscribe({
                next: s =>
                {
                    expect(s).toEqual({ failed: false, value: 1 });
                    done();
                }
            });
    });

    it('should emit value from catch branch', done =>
    {
        const task = new ThrowableTask(() => { throw Error('Error'); }, () => 2);
        task.execute()
            .subscribe({
                next: s =>
                {
                    expect(s).toEqual({ error: 2, failed: true });
                    done();
                }
            });
    });

    it('should rethrow value from catch', done =>
    {
        const task = new ThrowableTask(() => { throw Error('Error'); }, () => Promise.reject('Rejected'));
        task.execute()
            .subscribe({
                error: e =>
                {
                    expect(e).toEqual('Rejected');
                    done();
                }
            });
    });

    it('should contain value from try branch in state', done =>
    {
        const task = new ThrowableTask(() => 1, () => null);
        task.execute()
            .subscribe({
                complete: () =>
                {
                    expect(task.getState()).toEqual({ failed: false, value: 1 });
                    done();
                }
            });
    });

    it('should contain value from catch branch in state', done =>
    {
        const task = new ThrowableTask(() => { throw Error('Error'); }, () => 1);
        task.execute()
            .subscribe({
                complete: () =>
                {
                    expect(task.getState()).toEqual({ error: 1, failed: true });
                    done();
                }
            });
    });

    it('should reset state in case of error in catch branch', done =>
    {
        const obs = new Observable(s =>
        {
            s.next(1);
            s.error('Error');
        });
        const task = new ThrowableTask(() => obs, () => Promise.reject('Rejected'));
        task.execute()
            .subscribe({
                error: e =>
                {
                    expect(task.getState()).toBeUndefined();
                    done();
                }
            })
    });
});