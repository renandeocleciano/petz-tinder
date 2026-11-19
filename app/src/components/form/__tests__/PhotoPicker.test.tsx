import { render, screen, userEvent } from '@testing-library/react-native';

import { PhotoPicker } from '../PhotoPicker';

const photos = Array.from({ length: 6 }, (_, i) => `https://cdn.test/${i}.jpg`);

const renderPicker = async (value = photos) => {
  const onChange = jest.fn();
  await render(<PhotoPicker photos={value} onChange={onChange} max={6} />);
  return onChange;
};

describe('PhotoPicker', () => {
  it('shows every photo, each with a visible remove button', async () => {
    await renderPicker();
    for (let i = 1; i < 6; i++) expect(screen.getByTestId(`photo-thumb-${i}`)).toBeTruthy();
    expect(screen.getAllByLabelText('Remover foto')).toHaveLength(6);
  });

  it('removes the tapped photo', async () => {
    const onChange = await renderPicker();
    await userEvent.setup().press(screen.getByTestId('photo-remove-4'));
    expect(onChange).toHaveBeenCalledWith(photos.filter((_, i) => i !== 4));
  });

  it('removes the main photo, promoting the next one', async () => {
    const onChange = await renderPicker(photos.slice(0, 2));
    await userEvent.setup().press(screen.getByTestId('photo-remove-0'));
    expect(onChange).toHaveBeenCalledWith([photos[1]]);
  });

  it('makes a thumbnail the main photo', async () => {
    const onChange = await renderPicker(photos.slice(0, 3));
    await userEvent.setup().press(screen.getByTestId('photo-thumb-2'));
    expect(onChange).toHaveBeenCalledWith([photos[2], photos[0], photos[1]]);
  });
});
