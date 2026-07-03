import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
import { bottle } from './routes/bottle';
import { player } from './routes/player';
import { lighthouse } from './routes/lighthouse';
import { tide } from './routes/tide';
import { admin } from './routes/admin';
import { menu } from './routes/menu';
import { triggers } from './routes/triggers';
import { scheduler } from './routes/scheduler';

const app = new Hono();
const internal = new Hono();

// Public API routes
app.route('/api/bottle', bottle);
app.route('/api/player', player);
app.route('/api/lighthouse', lighthouse);
app.route('/api/tide', tide);
app.route('/api/admin', admin);

// Internal routes (menu, triggers, scheduler)
internal.route('/menu', menu);
internal.route('/triggers', triggers);
internal.route('/scheduler', scheduler);

app.route('/internal', internal);

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
