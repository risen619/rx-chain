import { Observable, of, throwError } from 'rxjs';
import { ConditionalTask } from '../src/conditional';

describe('Conditional Task', () =>
{
    it('should execute then branch', done =>
    {
        const task = new ConditionalTask(() => true, () => 1, () => '');
        task.execute()
            .subscribe({
                next: s =>
                {
                    expect(s).toEqual(1);
                    done();
                }
            })
    });

    it('should execute else branch', done =>
    {
        const task = new ConditionalTask(() => false, () => 1, () => 'string');
        task.execute()
            .subscribe({
                next: s =>
                {
                    expect(s).toEqual('string');
                    done();
                }
            });
    });

    it('should resolve condition from promise', done =>
    {
        const task = new ConditionalTask(() => Promise.resolve(true), () => 1);
        task.execute()
            .subscribe({
                next: s =>
                {
                    expect(s).toEqual(1);
                    done();
                }
            });
    });

    it('should resolve condition from observable', done =>
    {
        const task = new ConditionalTask(() => of(false), () => 1, () => 'string');
        task.execute()
            .subscribe({
                next: s =>
                {
                    expect(s).toEqual('string');
                    done();
                }
            });
    });

    it('should provide `null` if condition is false and no else branch is provided', done =>
    {
        const task = new ConditionalTask(() => false, () => 1);
        task.execute()
            .subscribe({
                next: s =>
                {
                    expect(s).toBeNull();
                    done();
                }
            })
    });

    it('should rethrow error from condition', done =>
    {
        const task = new ConditionalTask(() => { throw new Error('Error'); }, () => 1);
        task.execute()
            .subscribe({
                error: e =>
                {
                    expect(e).toBeInstanceOf(Error);
                    expect(e).toEqual(Error('Error'));
                    expect(task.getState()).toBeUndefined();
                    done();
                }
            })
    });

    it('should rethrow error from then branch', done =>
    {
        const task = new ConditionalTask(() => true, () => Promise.reject('Error'));
        task.execute()
            .subscribe({
                error: e =>
                {
                    expect(e).toEqual('Error');
                    expect(task.getState()).toBeUndefined();
                    done();
                }
            })
    });

    it('should rethrow error from else branch', done =>
    {
        const task = new ConditionalTask(() => false, () => 1, () => throwError('Error'));
        task.execute()
            .subscribe({
                error: e =>
                {
                    expect(e).toEqual('Error');
                    expect(task.getState()).toBeUndefined();
                    done();
                }
            });
    });

    it('should emit only last value from then branch', done =>
    {
        const task = new ConditionalTask(() => true, () => of(1, 2, 3, 4));
        task.execute()
            .subscribe({
                next: s =>
                {
                    expect(s).toEqual(4);
                    done();
                }
            });
    });

    it('should emit only last value from else branch', done =>
    {
        const task = new ConditionalTask(() => false, () => 1, () => of(1, 2, 3, 4));
        task.execute()
            .subscribe({
                next: s =>
                {
                    expect(s).toEqual(4);
                    done();
                }
            })
    });

    it('should contain value from then branch in state', done =>
    {
        const task = new ConditionalTask(() => true, () => 1, () => 'string');
        task.execute()
            .subscribe({
                complete: () =>
                {
                    expect(task.getState()).toEqual(1);
                    done();
                }
            })
    });

    it('should contain value from else branch in state', done =>
    {
        const task = new ConditionalTask(() => false, () => 1, () => 'string');
        task.execute()
            .subscribe({
                complete: () =>
                {
                    expect(task.getState()).toEqual('string');
                    done();
                }
            })
    });

    it('should reset state in case of error in then branch', done =>
    {
        const obs = new Observable(s =>
        {
            s.next(1);
            s.error('Error');
        });
        const task = new ConditionalTask(() => true, () => obs);
        task.execute()
            .subscribe({
                error: e =>
                {
                    expect(e).toEqual('Error');
                    expect(task.getState()).toBeUndefined();
                    done();
                }
            })
    });

    it('should reset state in case of error in else branch', done =>
    {
        const obs = new Observable(s =>
        {
            s.next(1);
            s.error('Error');
        });
        
        const task = new ConditionalTask(() => false, () => obs, () => obs);
        task.execute()
            .subscribe({
                error: e =>
                {
                    expect(e).toEqual('Error');
                    expect(task.getState()).toBeUndefined();
                    done();
                }
            })
    });
});