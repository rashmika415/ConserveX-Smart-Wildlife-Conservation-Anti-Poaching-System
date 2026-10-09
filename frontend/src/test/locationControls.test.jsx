import { useState } from 'react';
import { beforeEach, it, expect, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import {
  LocationInput,
  LeafletLocationMap,
  LocationMap,
  PhotoUpload,
  ConfirmDialog,
  ResourceState,
} from '../components/UI';
import { reverseGeocodeGeoapify } from '../services/geocode';
// The third-party map engine is replaced at its boundary; application map logic runs normally.
const map = vi.hoisted(() => ({
  setView: vi.fn(),
  getZoom: vi.fn(() => 12),
  on: vi.fn(),
  remove: vi.fn(),
  invalidateSize: vi.fn(),
}));
const marker = vi.hoisted(() => ({
  addTo: vi.fn(),
  setLatLng: vi.fn(),
  bindTooltip: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('leaflet', () => ({
  default: {
    map: () => map,
    marker: () => marker,
    divIcon: vi.fn(),
    tileLayer: () => ({ addTo: vi.fn() }),
    control: { scale: () => ({ addTo: vi.fn() }) },
  },
}));
vi.mock('../services/geocode', () => ({ reverseGeocodeGeoapify: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  map.setView.mockReturnValue(map);
  marker.addTo.mockReturnValue(marker);
  reverseGeocodeGeoapify.mockResolvedValue(null);
});
function Input({ initial = {}, onApplyLandmark, optional }) {
  const [values, setValues] = useState({
    latitude: '',
    longitude: '',
    ...initial,
  });
  return (
    <>
      <LocationInput
        values={values}
        setValues={setValues}
        onApplyLandmark={onApplyLandmark}
        optional={optional}
      />
      <output data-testid="values">{JSON.stringify(values)}</output>
    </>
  );
}
it('captures GPS, identifies a place and applies its landmark', async () => {
  reverseGeocodeGeoapify.mockResolvedValue({
    town: 'Yala',
    district: 'Hambantota',
    province: 'Southern',
    areaTitle: 'Yala area',
    formatted: 'Yala, Sri Lanka',
  });
  const onApply = vi.fn();
  const getCurrentPosition = vi.fn((success) =>
    success({ coords: { latitude: 6.45, longitude: 81.4 } }),
  );
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
  render(<Input onApplyLandmark={onApply} />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Use my current location' }),
  );
  expect(await screen.findByText('Yala area')).toBeInTheDocument();
  expect(screen.getByLabelText(/Latitude/)).toHaveValue(6.45);
  expect(screen.getByTestId('values')).toHaveTextContent('Hambantota');
  expect(onApply).toHaveBeenCalledWith('Yala area');
  fireEvent.click(
    screen.getByRole('button', { name: 'Apply to Nearest Landmark' }),
  );
  expect(onApply).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: 'Clear coordinates' }));
  expect(screen.getByLabelText(/Latitude/)).toHaveValue(null);
  expect(screen.queryByText('Yala area')).not.toBeInTheDocument();
});
it.each([
  [1, 'permission was denied'],
  [2, 'signal unavailable'],
  [3, 'timed out'],
  [9, 'Could not get GPS'],
])('retries GPS at high accuracy and explains error %s', (code, message) => {
  const getCurrentPosition = vi.fn((_success, failure) => failure({ code }));
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
  render(<Input />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Use my current location' }),
  );
  expect(screen.getByRole('alert')).toHaveTextContent(message);
  expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  expect(getCurrentPosition.mock.calls[1][2].enableHighAccuracy).toBe(true);
});
it.each(['', 'Existing landmark'])(
  'preserves user landmarks while selecting presets (%s)',
  async (landmark) => {
    render(<Input initial={{ landmark }} optional />);
    expect(screen.getByLabelText(/Latitude/)).not.toBeRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Minneriya Corridor' }));
    await waitFor(() =>
      expect(reverseGeocodeGeoapify).toHaveBeenCalledWith(
        '8.032400',
        '80.825600',
      ),
    );
    expect(screen.getByTestId('values')).toHaveTextContent(
      landmark || 'Minneriya Corridor',
    );
    expect(screen.getByLabelText(/Latitude/)).toBeRequired();
  },
);
it('supports simulated GPS and manual coordinate edits', async () => {
  render(<Input />);
  fireEvent.click(screen.getByRole('button', { name: 'Simulate device GPS' }));
  await waitFor(() => expect(reverseGeocodeGeoapify).toHaveBeenCalled());
  expect(screen.getByLabelText(/Latitude/)).toHaveValue(6.45);
  fireEvent.change(screen.getByLabelText(/Latitude/), {
    target: { value: '7' },
  });
  fireEvent.change(screen.getByLabelText(/Longitude/), {
    target: { value: '80' },
  });
  await waitFor(() =>
    expect(reverseGeocodeGeoapify).toHaveBeenCalledWith('7', '80'),
  );
});
it('opens an empty map, places a pin through the map callback and hides the cleared map', async () => {
  render(<Input />);
  fireEvent.click(screen.getByRole('button', { name: 'Open interactive map' }));
  expect(screen.getByText('Click map to place pin')).toBeInTheDocument();
  await waitFor(() =>
    expect(map.on).toHaveBeenCalledWith('click', expect.any(Function)),
  );
  await act(async () =>
    map.on.mock.calls[0][1]({ latlng: { lat: 6.5, lng: 81.5 } }),
  );
  expect(screen.getByLabelText(/Latitude/)).toHaveValue(6.5);
  fireEvent.click(screen.getByRole('button', { name: 'Clear coordinates' }));
  fireEvent.click(screen.getByRole('button', { name: 'Hide map' }));
  expect(
    screen.queryByLabelText('Interactive incident location picker'),
  ).not.toBeInTheDocument();
});
it.each([
  [{ town: 'Town' }, 'Town'],
  [{ formatted: 'Address' }, 'Address'],
])(
  'uses available place labels without replacing an existing landmark',
  async (place, expected) => {
    reverseGeocodeGeoapify.mockResolvedValue(place);
    const apply = vi.fn();
    render(
      <Input
        initial={{ landmark: 'Already entered' }}
        onApplyLandmark={apply}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Simulate device GPS' }),
    );
    await screen.findByRole('button', { name: 'Apply to Nearest Landmark' });
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Apply to Nearest Landmark' }),
    );
    expect(apply).toHaveBeenCalledWith(expected);
  },
);
it('updates and removes map markers and exposes an external map link', async () => {
  const { rerender, unmount } = render(
    <LeafletLocationMap location={{ latitude: 6, longitude: 81 }} />,
  );
  await waitFor(() => expect(marker.bindTooltip).toHaveBeenCalled());
  expect(screen.getByRole('link', { name: /Open full map/ })).toHaveAttribute(
    'href',
    expect.stringContaining('mlat=6&mlon=81'),
  );
  rerender(<LeafletLocationMap location={{ latitude: 7, longitude: 80 }} />);
  expect(marker.setLatLng).toHaveBeenCalledWith([7, 80]);
  rerender(<LeafletLocationMap location={null} />);
  expect(marker.remove).toHaveBeenCalled();
  unmount();
  expect(map.remove).toHaveBeenCalled();
});
it('converts schematic map clicks into bounded coordinates and ignores caption clicks', () => {
  const select = vi.fn();
  const { container, rerender } = render(
    <LocationMap interactive onSelectLocation={select} />,
  );
  const element = container.querySelector('.location-map');
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  });
  fireEvent.click(element, { clientX: 50, clientY: 50 });
  expect(select).toHaveBeenLastCalledWith('7.400000', '81.000000');
  fireEvent.click(element, { clientX: 200, clientY: -20 });
  expect(select).toHaveBeenLastCalledWith('8.800000', '82.000000');
  fireEvent.click(container.querySelector('.map-caption'));
  expect(select).toHaveBeenCalledTimes(2);
  rerender(<LocationMap location={{ latitude: 'bad', longitude: 'bad' }} />);
  fireEvent.click(container.querySelector('.location-map'));
  expect(select).toHaveBeenCalledTimes(2);
});
it('validates photo types, accepts supported images, and clears a selection', () => {
  const change = vi.fn();
  render(<PhotoUpload onChange={change} />);
  const input = screen.getByLabelText(/Photograph/);
  fireEvent.change(input, {
    target: { files: [new File(['x'], 'bad.txt', { type: 'text/plain' })] },
  });
  expect(screen.getByText(/under 5 MB/)).toBeInTheDocument();
  expect(change).toHaveBeenLastCalledWith(null);
  const file = new File(['x'], 'good.webp', { type: 'image/webp' });
  fireEvent.change(input, { target: { files: [file] } });
  expect(change).toHaveBeenLastCalledWith(file);
  expect(screen.queryByText(/under 5 MB/)).not.toBeInTheDocument();
  fireEvent.change(input, { target: { files: [] } });
  expect(change).toHaveBeenLastCalledWith(null);
});
it('prevents cancelling or confirming a busy dialog', () => {
  const onCancel = vi.fn(),
    onConfirm = vi.fn();
  const { rerender } = render(
    <ConfirmDialog
      title="Save?"
      busy
      onCancel={onCancel}
      onConfirm={onConfirm}
    />,
  );
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  expect(onCancel).not.toHaveBeenCalled();
  rerender(
    <ConfirmDialog title="Save?" onCancel={onCancel} onConfirm={onConfirm} />,
  );
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });
  expect(onCancel).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onCancel).toHaveBeenCalledOnce();
});
it('offers a retry for failed resource requests', () => {
  const reload = vi.fn();
  render(
    <ResourceState resource={{ error: 'Server unavailable', reload }}>
      <p>Private data</p>
    </ResourceState>,
  );
  expect(screen.queryByText('Private data')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(reload).toHaveBeenCalledOnce();
});
