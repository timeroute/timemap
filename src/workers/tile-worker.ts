import { fetchTile } from '../utils/map-util';

addEventListener('message', async (event: MessageEvent<TileWorkerMessageData>) => {
  const { tile, layers, url } = event.data;
  try {
    const tileData = await fetchTile({ tile, layers, url });
    postMessage({ tile, tileData });
  } catch (e) {
    console.warn('Worker error.', e);
    postMessage({ tile });
  }
})
