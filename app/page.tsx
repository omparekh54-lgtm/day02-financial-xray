import { AppShell } from '../components/AppShell';

export default async function Page({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  return <AppShell startDemo={params.demo === '1'} />;
}
