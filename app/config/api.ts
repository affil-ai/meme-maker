export const getRenderApiUrl = (): string => {
  // Always use Lambda function
  return 'https://boibmmvm92.execute-api.us-east-1.amazonaws.com';
};

export const RENDER_API_ENDPOINTS = {
  render: '/render',
  health: '/health',
  renderStatus: (renderId: string) => `/render/${renderId}`,
} as const;