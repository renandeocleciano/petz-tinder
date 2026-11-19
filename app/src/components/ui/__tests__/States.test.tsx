import { act, render, screen, userEvent } from '@testing-library/react-native';

import { EmptyState, MIN_ACTION_FEEDBACK_MS } from '../States';

const button = () => screen.getByTestId('empty-state-action');
const isBusy = () => Boolean(button().props.accessibilityState?.busy);

describe('EmptyState action', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows progress and ignores repeated taps while an async action runs', async () => {
    let finish: () => void = () => undefined;
    const onAction = jest.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    await render(<EmptyState title="Vazio" actionLabel="Atualizar" onAction={onAction} />);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    await user.press(button());
    expect(isBusy()).toBe(true);
    await user.press(button());
    expect(onAction).toHaveBeenCalledTimes(1);

    // A fast response still keeps the feedback visible for a moment.
    await act(async () => finish());
    expect(isBusy()).toBe(true);
    await act(async () => jest.advanceTimersByTime(MIN_ACTION_FEEDBACK_MS));
    expect(isBusy()).toBe(false);
  });

  it('stops spinning when the action fails', async () => {
    const onAction = jest.fn(() => Promise.reject(new Error('offline')));
    await render(<EmptyState title="Vazio" actionLabel="Tentar" onAction={onAction} />);
    await userEvent.setup({ advanceTimers: jest.advanceTimersByTime }).press(button());
    await act(async () => jest.advanceTimersByTime(MIN_ACTION_FEEDBACK_MS));
    expect(isBusy()).toBe(false);
  });

  it('does not spin for synchronous actions (e.g. clearing filters)', async () => {
    const onAction = jest.fn();
    await render(<EmptyState title="Vazio" actionLabel="Limpar filtros" onAction={onAction} />);
    await userEvent.setup({ advanceTimers: jest.advanceTimersByTime }).press(button());
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(isBusy()).toBe(false);
  });
});
