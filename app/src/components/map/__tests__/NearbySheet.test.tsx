import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { NearbyPin } from '@/lib/api';

import { NearbySheet } from '../NearbySheet';
import { snapSheetHeight } from '../sheetSnap';

const pin = (id: string, overrides: Partial<NearbyPin> = {}): NearbyPin => ({
  id,
  latitude: 0,
  longitude: 0,
  species: 'dog',
  locked: false,
  isMatch: false,
  pet: { id, name: `Pet ${id}`, photos: [], breed: 'Vira-lata' },
  ...overrides,
});

const renderSheet = async (pins: NearbyPin[], total = pins.length) => {
  const onPetPress = jest.fn();
  const onUpgrade = jest.fn();
  await render(
    <NearbySheet
      nearby={{ total, pins }}
      isPremium={false}
      onUpgrade={onUpgrade}
      onPetPress={onPetPress}
      maxHeight={600}
    />,
  );
  // The list mounts once the collapsed header has been measured.
  await act(async () => {
    fireEvent(screen.getByTestId('nearby-sheet-toggle').parent!, 'layout', {
      nativeEvent: { layout: { height: 120 } },
    });
  });
  return { onPetPress, onUpgrade };
};

describe('NearbySheet', () => {
  it('lists the visible pets and opens the tapped one', async () => {
    const { onPetPress } = await renderSheet([pin('a', { isMatch: true }), pin('b')]);

    expect(screen.getByText('Pet a')).toBeTruthy();
    expect(screen.getByText('Match')).toBeTruthy();
    fireEvent.press(screen.getByTestId('nearby-pet-b'));
    expect(onPetPress).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
  });

  it('summarizes locked pins and sends them to the paywall', async () => {
    const locked = pin('x', { locked: true, pet: null });
    const { onUpgrade } = await renderSheet([pin('a'), locked, { ...locked, id: 'y' }]);

    expect(screen.getByText('2 pets ocultos')).toBeTruthy();
    fireEvent.press(screen.getByTestId('nearby-locked'));
    expect(onUpgrade).toHaveBeenCalled();
  });

  it('says when only the closest pins were loaded', async () => {
    await renderSheet([pin('a')], 250);
    expect(screen.getByText('Mostrando os 1 mais próximos')).toBeTruthy();
  });
});

describe('snapSheetHeight', () => {
  it('follows a fling, otherwise the closest height', () => {
    expect(snapSheetHeight(150, -900, 100, 500)).toBe(500);
    expect(snapSheetHeight(450, 900, 100, 500)).toBe(100);
    expect(snapSheetHeight(320, 0, 100, 500)).toBe(500);
    expect(snapSheetHeight(280, 0, 100, 500)).toBe(100);
  });
});
