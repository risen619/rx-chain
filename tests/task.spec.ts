import { of, throwError } from 'rxjs';
import { Task } from '../src/task';

describe('Task', () =>
{
    describe('Sync', () =>
    {
        it('should resolve value', done =>
        {
            const task = new Task(() => 1);
            task.execute()
                .subscribe({
                    next: (s) =>
                    {
                        expect(s).toEqual(1);
                        done();
                    }
                })
        });

        it('should rethrow the error', done =>
        {
            const task = new Task(() => { throw Error('Error'); });
            task.execute()
                .subscribe({
                    error: e =>
                    {
                        expect(e).toBeInstanceOf(Error);
                        expect(e).toEqual(Error('Error'));
                        done();
                    }
                });
        });

        it('should contain value in state after completion', done =>
        {
            const task = new Task(() => 1);
            task.execute()
                .subscribe({
                    complete: () =>
                    {
                        expect(task.getState()).toEqual(1);
                        done();
                    }
                });
        });
    });

    describe('Promise', () =>
    {
        it('should resolve value in promise', done =>
        {
            const task = new Task(() => Promise.resolve(1));
            task.execute()
                .subscribe({
                    next: s =>
                    {
                        expect(s).toEqual(1);
                        done();
                    }
                })
        });

        it('should rethrow the error', done =>
        {
            const task = new Task(() => Promise.reject('Error'));
            task.execute()
                .subscribe({
                    error: e =>
                    {
                        expect(e).toEqual('Error');
                        done();
                    }
                })
        });

        it('should contain value in state after competion', done =>
        {
            const task = new Task(() => Promise.resolve(1));
            task.execute()
                .subscribe({
                    complete: () =>
                    {
                        expect(task.getState()).toEqual(1);
                        done();
                    }
                });
        });
    });

    describe('Observable', () =>
    {
        it('should resolve single value', done =>
        {
            const task = new Task(() => of(1));
            task.execute()
                .subscribe({
                    next: s =>
                    {
                        expect(s).toEqual(1);
                        done();
                    }
                });
        });

        it('should resolve latest value', done =>
        {
            const task = new Task(() => of(1, 2, 3, 4));
            task.execute()
                .subscribe({
                    next: s =>
                    {
                        expect(s).toEqual(4);
                        done();
                    }
                });
        });

        it('should rethrow error', done =>
        {
            const task = new Task(() => throwError('Error'));
            task.execute()
                .subscribe({
                    error: e =>
                    {
                        expect(e).toEqual('Error');
                        done();
                    }
                });
        })

        it('should contain latest value in state after completion', done =>
        {
            const task = new Task(() => of(1, 2, 3, 4));
            task.execute()
                .subscribe({
                    complete: () =>
                    {
                        expect(task.getState()).toEqual(4);
                        done();
                    }
                });
        });
    });
});