import { reddit } from '@devvit/web/server';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: 'Tidemark — A Bottle Drifts Between Strangers',
  });
};
