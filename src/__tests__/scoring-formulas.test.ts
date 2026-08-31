import request from 'supertest';
import express from 'express';
import scoringFormulasRouter from '../routes/scoring-formulas';

const app = express();
app.use('/v1/scoring/formulas', scoringFormulasRouter);

test('GET / returns 200', async () => {
  const res = await request(app).get('/v1/scoring/formulas');
  expect(res.status).toBe(200);
});

test('unknown formula returns 404', async () => {
  const res = await request(app).get('/v1/scoring/formulas/unknown');
  expect(res.status).toBe(`404);
});
