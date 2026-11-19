import { screen, userEvent } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import DiscoverScreen from '@/app/(tabs)/discover';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, navigate: jest.fn(), back: jest.fn() }),
}));

describe('Discover screen', () => {
  beforeEach(() => mockPush.mockClear());

  it('shows the nearest pet card with its actions', async () => {
    await renderWithProviders(<DiscoverScreen />);

    expect(await screen.findByTestId(/^pet-card-/)).toBeTruthy();
    expect(screen.getByLabelText('Não curti')).toBeTruthy();
    expect(screen.getByLabelText('Curtir')).toBeTruthy();
    expect(screen.getByLabelText('Super like')).toBeTruthy();
  });

  it('opens the paywall when a free user taps direct message', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<DiscoverScreen />);
    await screen.findByTestId(/^pet-card-/);

    await user.press(screen.getByTestId('discover-action-message'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/premium',
      params: { feature: 'direct_message' },
    });
  });

  it('moves to the next pet after a dislike', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<DiscoverScreen />);
    const first = await screen.findByTestId(/^pet-card-/);
    const firstId = first.props.testID as string;

    await user.press(screen.getByTestId('discover-action-dislike'));

    const next = await screen.findByTestId(/^pet-card-/);
    expect(next.props.testID).not.toBe(firstId);
  });
});
