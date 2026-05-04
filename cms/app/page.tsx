import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Time Mission — CMS</h1>
      <p>Editorial backend (Payload). Marketing content is published to the public site via Cloudflare Pages builds.</p>
      <p>
        <Link href="/admin">Open admin</Link>
      </p>
    </main>
  );
}
