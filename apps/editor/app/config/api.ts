export const getRenderApiUrl = (): string => {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8000';
  }
  return 'https://boibmmvm92.execute-api.us-east-1.amazonaws.com';
};

export const RENDER_API_ENDPOINTS = {
  render: '/render',
  health: '/health',
  renderStatus: (renderId: string) => `/render/${renderId}`,
} as const;