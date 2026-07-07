import type { APIRoute } from 'astro';
import { getPetNftInstance } from '../../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);

  if (!Number.isInteger(id) || id < 1) {
    return new Response(JSON.stringify({ error: 'invalid id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  try {
    const pet = await getPetNftInstance(id);
    if (!pet) {
      return new Response(JSON.stringify({ error: 'not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
    return new Response(JSON.stringify(pet), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
};
