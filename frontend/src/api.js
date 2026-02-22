import axios from 'axios';

const client = axios.create({ baseURL: '/api' });

export async function fetchCounties() {
  const { data } = await client.get('/counties');
  return data;
}

export async function fetchDataCenters() {
  const { data } = await client.get('/data-centers');
  return data;
}

export async function fetchUtilities() {
  const { data } = await client.get('/utilities');
  return data;
}

export async function runSimulation({ lat, lng, mw, cooling_type }) {
  const { data } = await client.post('/simulate', { lat, lng, mw, cooling_type });
  return data;
}
