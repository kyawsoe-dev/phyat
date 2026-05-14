import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') ?? 'Phyat Link';
  const url = searchParams.get('url') ?? 'phyat.app';

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          color: 'white',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          width: '100%',
          height: '100%',
          padding: '80px 120px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: 80, fontWeight: 900, marginBottom: 20 }}>{title}</div>
        <div style={{ fontSize: 40, opacity: 0.8, marginBottom: 40 }}>{url}</div>
        <div style={{ fontSize: 32, opacity: 0.6 }}>phyat.app</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
};