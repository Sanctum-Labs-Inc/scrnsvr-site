const association = {
  applinks: {
    details: [
      {
        appIDs: ['Z44P5JPZ3M.art.sanctum.app'],
        components: [
          {
            '/': '/clip/art',
            '?': { id: '*' },
          },
        ],
      },
    ],
  },
  appclips: {
    apps: ['Z44P5JPZ3M.art.sanctum.app.Clip'],
  },
};

export function getStaticPaths() {
  return [{ params: { slug: '.well-known/apple-app-site-association' } }];
}

export function GET() {
  return new Response(JSON.stringify(association), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
